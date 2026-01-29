from __future__ import annotations
import numpy as np
from .embeddings import Embeddings
from .index import search
from .store import fetch_chunks_by_ord

def retrieve(kb_id: str, query: str, embeddings: Embeddings, top_k: int):
    qv = embeddings.embed_texts([query])
    scores, ords = search(kb_id, qv, top_k)
    # filter invalid
    pairs = [(o, s) for o, s in zip(ords, scores) if o is not None and o >= 0]
    if not pairs:
        return []
    ords2 = [p[0] for p in pairs]
    chunks = fetch_chunks_by_ord(kb_id, ords2)
    # attach score in same order
    out = []
    for i, c in enumerate(chunks):
        out.append({
            "rank": i + 1,
            "score": float(pairs[i][1]),
            "filename": c["filename"],
            "text": c["text"],
            "chunk_id": c["chunk_id"],
            "doc_id": c["doc_id"],
            "vector_ord": c["vector_ord"],
        })
    return out

def build_prompt(user_message: str, retrieved: list[dict]):
    sources = []
    ctx = []
    for i, r in enumerate(retrieved, start=1):
        tag = f"S{i}"
        sources.append({
            "tag": tag,
            "filename": r["filename"],
            "score": r["score"],
            "text": r["text"],
        })
        ctx.append(f"[{tag}] {r['filename']}\n{r['text']}")
    context = "\n\n".join(ctx).strip()
    system = (
        "You are a high-quality RAG assistant. "
        "Use the given context when relevant. "
        "Cite sources like [S1]. "
        "If the answer isn't in context, say you are not sure and ask a short follow-up."
    )
    if context:
        content = f"{system}\n\nContext:\n{context}\n\nUser:\n{user_message}"
    else:
        content = f"{system}\n\nUser:\n{user_message}"
    return content, sources
