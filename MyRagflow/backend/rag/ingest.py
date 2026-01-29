from __future__ import annotations
import mimetypes
from .parsers import parse_pdf_bytes, parse_docx_bytes, parse_text_bytes
from utils.text_splitter import chunk_text
from .store import insert_doc, insert_chunks, count_chunks, fetch_chunks_by_ord, delete_doc_and_chunks
from .index import index_add, rebuild_full
from .embeddings import Embeddings

def sniff_mime(filename: str, content_type: str | None):
    if content_type:
        return content_type
    guess, _ = mimetypes.guess_type(filename)
    return guess or "application/octet-stream"

def parse_bytes(filename: str, mime: str, content: bytes) -> str:
    ext = (filename.split(".")[-1].lower() if "." in filename else "")
    if mime == "application/pdf" or ext == "pdf":
        return parse_pdf_bytes(content)
    if mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" or ext == "docx":
        return parse_docx_bytes(content)
    return parse_text_bytes(content)

def ingest_one(
    kb_id: str,
    filename: str,
    content_type: str | None,
    content: bytes,
    embeddings: Embeddings,
    chunk_size: int,
    overlap: int,
):
    mime = sniff_mime(filename, content_type)
    text = parse_bytes(filename, mime, content)

    chunks = chunk_text(text, chunk_size=chunk_size, overlap=overlap)
    if not chunks:
        raise ValueError("文件解析后没有得到文本内容。若是扫描版 PDF，请先 OCR。")

    # DB insert
    doc_id = insert_doc(kb_id, filename, mime, len(content))
    start_ord = count_chunks(kb_id)
    _ = insert_chunks(kb_id, doc_id, chunks, start_ord=start_ord)

    # Embeddings + add to index
    vectors = embeddings.embed_texts(chunks)
    index_add(kb_id, vectors)

    return {"doc_id": doc_id, "filename": filename, "mime": mime, "chunks": len(chunks)}

def rebuild_from_texts(kb_id: str, embeddings: Embeddings, all_texts: list[str]):
    return rebuild_full(kb_id, embeddings, all_texts)
