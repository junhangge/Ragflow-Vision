from __future__ import annotations
from dataclasses import dataclass
import base64
from openai import OpenAI

@dataclass
class VisionConfig:
    api_key: str
    model: str
    base_url: str | None = None  # for OpenAI-compatible servers

class OpenAIVision:
    def __init__(self, cfg: VisionConfig):
        kwargs = {"api_key": cfg.api_key}
        if cfg.base_url:
            kwargs["base_url"] = cfg.base_url.rstrip("/")
        self.client = OpenAI(**kwargs)
        self.model = cfg.model

    def analyze(self, image_bytes: bytes, prompt: str) -> str:
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        data_url = f"data:image/png;base64,{b64}"
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a careful image understanding assistant."},
                {"role": "user", "content": [
                    {"type": "text", "text": prompt or "Describe the image and extract key information."},
                    {"type": "image_url", "image_url": {"url": data_url}}
                ]}
            ],
            temperature=0.2,
        )
        return resp.choices[0].message.content or ""
