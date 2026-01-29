from __future__ import annotations
from dataclasses import dataclass
import base64
import httpx

@dataclass
class OllamaVisionConfig:
    base_url: str  # e.g. http://host.docker.internal:11434
    model: str     # e.g. llava:7b, qwen2-vl:7b

class OllamaVision:
    def __init__(self, cfg: OllamaVisionConfig):
        self.base_url = (cfg.base_url or "http://localhost:11434").rstrip("/")
        self.model = cfg.model or "llava:7b"

    def analyze(self, image_bytes: bytes, prompt: str) -> str:
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "你是中文图像理解助手。必须使用简体中文回答，禁止英文和生僻错别字。输出要结构化、具体，不要空泛推脱。。"},
                {"role": "user", "content": prompt or "请用中文描述图片并提取关键信息。", "images": [b64]}
            ],
            "stream": False
        }
        with httpx.Client(timeout=120) as client:
            r = client.post(f"{self.base_url}/api/chat", json=payload)
            r.raise_for_status()
            data = r.json()
        return (data.get("message", {}) or {}).get("content", "") or ""
