from __future__ import annotations
import json
import numpy as np
import faiss
from pathlib import Path
from filelock import FileLock

from .store import faiss_path, lock_path, count_chunks, fetch_chunks_by_ord, set_kv, get_kv
from .embeddings import Embeddings

def _normalize(v: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(v, axis=1, keepdims=True) + 1e-12
    return (v / norms).astype(np.float32)

def load_index(kb_id: str):
    p = faiss_path(kb_id)
    if not p.exists():
        return None
    return faiss.read_index(str(p))

def save_index(kb_id: str, index):
    faiss.write_index(index, str(faiss_path(kb_id)))

def ensure_index(kb_id: str, dim: int):
    idx = load_index(kb_id)
    if idx is None:
        idx = faiss.IndexFlatIP(dim)
        save_index(kb_id, idx)
        return idx
    if idx.d != dim:
        idx = faiss.IndexFlatIP(dim)
        save_index(kb_id, idx)
    return idx

def index_add(kb_id: str, vectors: np.ndarray):
    # vectors should be normalized
    vectors = _normalize(vectors)
    with FileLock(str(lock_path(kb_id))):
        idx = ensure_index(kb_id, vectors.shape[1])
        idx.add(vectors)
        save_index(kb_id, idx)
        set_kv(kb_id, "embedding_dim", str(vectors.shape[1]))

def rebuild_full(kb_id: str, embeddings: Embeddings, all_texts: list[str]):
    with FileLock(str(lock_path(kb_id))):
        if not all_texts:
            # remove index if exists
            p = faiss_path(kb_id)
            if p.exists():
                p.unlink()
            return {"rebuilt": False, "chunks": 0}
        vectors = embeddings.embed_texts(all_texts)
        vectors = _normalize(vectors)
        idx = faiss.IndexFlatIP(vectors.shape[1])
        idx.add(vectors)
        save_index(kb_id, idx)
        set_kv(kb_id, "embedding_dim", str(vectors.shape[1]))
        return {"rebuilt": True, "chunks": len(all_texts), "dim": vectors.shape[1]}

def search(kb_id: str, query_vec: np.ndarray, top_k: int):
    idx = load_index(kb_id)
    if idx is None:
        return [], []
    query_vec = _normalize(query_vec)
    scores, ords = idx.search(query_vec, top_k)
    return scores[0].tolist(), ords[0].tolist()
