from __future__ import annotations

import time
import os
import json
from typing import Any
from fastapi import FastAPI, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse, StreamingResponse
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict
import orjson

from utils.errors import unhandled_exception_handler, json_error
from rag.store import init_storage, list_kbs, create_kb, delete_kb, list_docs, delete_doc_and_chunks
from rag.store import _connect, fetch_chunks_by_ord, count_chunks
from rag.embeddings import Embeddings, EmbeddingsConfig
from rag.ingest import ingest_one, rebuild_from_texts
from rag.query import retrieve, build_prompt
from llm.deepseek import DeepSeek, DeepSeekConfig
from llm.openai_vision import OpenAIVision, VisionConfig
from llm.ollama_vision import OllamaVision, OllamaVisionConfig

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"
    DEEPSEEK_MODEL: str = "deepseek-chat"

    OPENAI_API_KEY: str = ""
    OPENAI_VISION_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Vision provider
    VISION_PROVIDER: str = "openai"  # openai | ollama | openai_compat
    VISION_BASE_URL: str = ""
    VISION_API_KEY: str = ""
    VISION_MODEL: str = ""
    OLLAMA_BASE_URL: str = "http://host.docker.internal:11434"
    OLLAMA_VISION_MODEL: str = "llava:7b"

    EMBEDDINGS_PROVIDER: str = "openai"
    LOCAL_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    DEFAULT_TOP_K: int = 6
    DEFAULT_CHUNK_SIZE: int = 900
    DEFAULT_CHUNK_OVERLAP: int = 120
    MAX_UPLOAD_MB: int = 80

    APP_ENV: str = "prod"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

settings = Settings()

app = FastAPI(title="RAG Studio", default_response_class=ORJSONResponse)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_storage()

embeddings = Embeddings(EmbeddingsConfig(
    provider=settings.EMBEDDINGS_PROVIDER,
    openai_api_key=settings.OPENAI_API_KEY,
    openai_model=settings.OPENAI_EMBEDDING_MODEL,
    local_model=settings.LOCAL_EMBEDDING_MODEL,
))

deepseek = DeepSeek(DeepSeekConfig(
    api_key=settings.DEEPSEEK_API_KEY,
    base_url=settings.DEEPSEEK_BASE_URL,
    model=settings.DEEPSEEK_MODEL,
))

vision = None
ollama_vision = None
compat_vision = None

def get_vision_client():
    global vision, ollama_vision, compat_vision
    provider = (settings.VISION_PROVIDER or "openai").strip().lower()

    if provider == "ollama":
        if ollama_vision is None:
            ollama_vision = OllamaVision(OllamaVisionConfig(
                base_url=settings.OLLAMA_BASE_URL,
                model=settings.OLLAMA_VISION_MODEL,
            ))
        return "ollama", ollama_vision

    if provider == "openai_compat":
        base_url = (settings.VISION_BASE_URL or "").strip()
        api_key = (settings.VISION_API_KEY or "").strip() or "local-anything"
        model = (settings.VISION_MODEL or "").strip() or "qwen2-vl-7b-instruct"
        if not base_url:
            raise RuntimeError("VISION_BASE_URL is required for VISION_PROVIDER=openai_compat")
        if compat_vision is None:
            compat_vision = OpenAIVision(VisionConfig(api_key=api_key, model=model, base_url=base_url))
        return "openai_compat", compat_vision

    # default: openai
    if vision is None:
        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY missing for OpenAI vision")
        vision = OpenAIVision(VisionConfig(api_key=settings.OPENAI_API_KEY, model=settings.OPENAI_VISION_MODEL))
    return "openai", vision

def sse(data: Any, event: str | None = None):
    payload = orjson.dumps(data).decode("utf-8")
    if event:
        return f"event: {event}\ndata: {payload}\n\n"
    return f"data: {payload}\n\n"

@app.get("/api/health")
def health():
    return {"ok": True, "ts": int(time.time()), "env": settings.APP_ENV}

# ---------------- KB APIs ----------------
class CreateKB(BaseModel):
    name: str

@app.get("/api/kbs")
def api_kbs():
    items = list_kbs()
    return {"ok": True, "data": [i.__dict__ for i in items]}

@app.post("/api/kbs")
def api_kb_create(body: CreateKB):
    name = (body.name or "").strip()
    if not name:
        return json_error("KB name is required", "VALIDATION", 400)
    kb = create_kb(name)
    return {"ok": True, "data": kb.__dict__}

@app.delete("/api/kbs/{kb_id}")
def api_kb_delete(kb_id: str):
    delete_kb(kb_id)
    return {"ok": True}

@app.get("/api/kbs/{kb_id}/docs")
def api_docs(kb_id: str):
    return {"ok": True, "data": list_docs(kb_id)}

@app.delete("/api/kbs/{kb_id}/docs/{doc_id}")
def api_doc_delete(kb_id: str, doc_id: str):
    # simplest safe: delete + rebuild index
    delete_doc_and_chunks(kb_id, doc_id)
    # rebuild from all remaining chunks text
    conn = _connect(kb_id)
    rows = conn.execute("SELECT text FROM chunks ORDER BY vector_ord ASC").fetchall()
    conn.close()
    all_texts = [r["text"] for r in rows]
    res = rebuild_from_texts(kb_id, embeddings, all_texts)
    return {"ok": True, "data": {"deleted": True, "rebuild": res}}

@app.post("/api/kbs/{kb_id}/upload")
async def api_upload(
    kb_id: str,
    file: UploadFile = File(...),
    chunk_size: int = Form(default=settings.DEFAULT_CHUNK_SIZE),
    chunk_overlap: int = Form(default=settings.DEFAULT_CHUNK_OVERLAP),
):
    content = await file.read()
    max_bytes = int(settings.MAX_UPLOAD_MB) * 1024 * 1024
    if len(content) > max_bytes:
        return json_error(f"File too large (> {settings.MAX_UPLOAD_MB}MB)", "LIMIT", 413)
    try:
        res = ingest_one(
            kb_id=kb_id,
            filename=file.filename or "upload",
            content_type=file.content_type,
            content=content,
            embeddings=embeddings,
            chunk_size=int(chunk_size),
            overlap=int(chunk_overlap),
        )
        return {"ok": True, "data": res}
    except Exception as e:
        return json_error(str(e), "INGEST", 400)

@app.post("/api/kbs/{kb_id}/rebuild")
def api_rebuild(kb_id: str):
    conn = _connect(kb_id)
    rows = conn.execute("SELECT text FROM chunks ORDER BY vector_ord ASC").fetchall()
    conn.close()
    all_texts = [r["text"] for r in rows]
    try:
        res = rebuild_from_texts(kb_id, embeddings, all_texts)
        return {"ok": True, "data": res}
    except Exception as e:
        return json_error(str(e), "REBUILD", 400)

@app.get("/api/kbs/{kb_id}/stats")
def api_stats(kb_id: str):
    conn = _connect(kb_id)
    row_docs = conn.execute("SELECT COUNT(*) AS n FROM docs").fetchone()
    row_chunks = conn.execute("SELECT COUNT(*) AS n FROM chunks").fetchone()
    conn.close()
    return {"ok": True, "data": {"docs": int(row_docs["n"]), "chunks": int(row_chunks["n"])}}

# ---------------- Chat stream (SSE) ----------------
class ChatBody(BaseModel):
    kb_id: str
    message: str
    history: list[dict] = []
    top_k: int | None = None

@app.post("/api/chat/stream")
def api_chat_stream(body: ChatBody = Body(...)):
    kb_id = (body.kb_id or "").strip()
    message = (body.message or "").strip()
    if not kb_id:
        return json_error("kb_id is required", "VALIDATION", 400)
    if not message:
        return json_error("message is required", "VALIDATION", 400)

    top_k = int(body.top_k or settings.DEFAULT_TOP_K)
    history = body.history or []

    retrieved = retrieve(kb_id, message, embeddings, top_k=top_k)
    rag_prompt, sources = build_prompt(message, retrieved)

    msgs = [{"role": "system", "content": "You are a helpful assistant. Reply in Chinese unless user uses other language."}]
    for m in history[-12:]:
        r = m.get("role")
        c = m.get("content")
        if r in ("user", "assistant") and isinstance(c, str) and c.strip():
            msgs.append({"role": r, "content": c})
    msgs.append({"role": "user", "content": rag_prompt})

    def gen():
        yield sse({"ok": True, "type": "meta", "top_k": top_k, "sources": len(sources)}, event="meta")
        acc = []
        for token in deepseek.stream(msgs):
            acc.append(token)
            yield sse({"ok": True, "type": "delta", "delta": token}, event="delta")
        final = "".join(acc).strip()
        yield sse({"ok": True, "type": "final", "content": final}, event="final")
        yield sse({"ok": True, "type": "sources", "sources": sources}, event="sources")

    return StreamingResponse(gen(), media_type="text/event-stream")

# ---------------- Vision ----------------
@app.post("/api/vision/analyze")
async def api_vision(
    prompt: str = Form(default="请描述这张图，并提取关键信息。"),
    image: UploadFile = File(...),
):
    b = await image.read()
    if not b:
        return json_error("Empty image", "VALIDATION", 400)
    try:
        _, client = get_vision_client()
        txt = client.analyze(b, prompt)
        return {"ok": True, "data": {"text": txt}}
    except Exception as e:
        return json_error(str(e), "VISION", 400)
