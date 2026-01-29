from __future__ import annotations
from dataclasses import dataclass
from typing import Generator
from openai import OpenAI

@dataclass
class DeepSeekConfig:
    api_key: str
    base_url: str
    model: str

class DeepSeek:
    def __init__(self, cfg: DeepSeekConfig):
        base = (cfg.base_url or "").rstrip("/")
        # If user passes https://api.deepseek.com, OpenAI client appends /v1 automatically? It doesn't.
        # So we accept both; OpenAI client works if base_url already includes /v1; otherwise it also works for some providers.
        self.client = OpenAI(api_key=cfg.api_key, base_url=base)
        self.model = cfg.model

    def stream(self, messages: list[dict], temperature: float = 0.2) -> Generator[str, None, None]:
        # OpenAI-compatible streaming
        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                stream=True,
            )
            for ev in stream:
                delta = ev.choices[0].delta
                if delta and getattr(delta, "content", None):
                    yield delta.content
        except Exception:
            resp = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                stream=False,
            )
            yield (resp.choices[0].message.content or "")
