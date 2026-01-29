from __future__ import annotations
from dataclasses import dataclass
import numpy as np
from openai import OpenAI

@dataclass
class EmbeddingsConfig:
    provider: str  # openai | local
    openai_api_key: str | None
    openai_model: str
    local_model: str

class Embeddings:
    def __init__(self, cfg: EmbeddingsConfig):
        self.cfg = cfg
        self._openai = None
        self._local = None

    def embed_texts(self, texts: list[str]) -> np.ndarray:
        texts = [t.strip() for t in texts if (t or "").strip()]
        if not texts:
            return np.zeros((0, 1), dtype=np.float32)

        if self.cfg.provider == "openai":
            self._ensure_openai()
            vectors = []
            batch = 96
            for i in range(0, len(texts), batch):
                resp = self._openai.embeddings.create(
                    model=self.cfg.openai_model,
                    input=texts[i:i+batch],
                )
                for item in resp.data:
                    vectors.append(item.embedding)
            return np.array(vectors, dtype=np.float32)

        # local (fastembed)
        self._ensure_local()
        # fastembed returns generator of np.ndarray (dim,)
        arr = np.array(list(self._local.embed(texts)), dtype=np.float32)
        return arr

    def _ensure_openai(self):
        if self._openai is None:
            if not self.cfg.openai_api_key:
                raise RuntimeError("OPENAI_API_KEY is required for openai embeddings")
            self._openai = OpenAI(api_key=self.cfg.openai_api_key)

    def _ensure_local(self):
        if self._local is None:
            from fastembed import TextEmbedding
            name = (self.cfg.local_model or "").strip()
            self._local = TextEmbedding(name) if name else TextEmbedding()
