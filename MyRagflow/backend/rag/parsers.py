from __future__ import annotations
import io
from pypdf import PdfReader
from docx import Document as DocxDocument

def parse_text_bytes(content: bytes) -> str:
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError:
        return content.decode("utf-8", errors="ignore")

def parse_pdf_bytes(content: bytes) -> str:
    reader = PdfReader(io.BytesIO(content))
    texts = []
    for page in reader.pages:
        try:
            texts.append(page.extract_text() or "")
        except Exception:
            texts.append("")
    return "\n".join(texts)

def parse_docx_bytes(content: bytes) -> str:
    doc = DocxDocument(io.BytesIO(content))
    parts = []
    for p in doc.paragraphs:
        if p.text:
            parts.append(p.text)
    return "\n".join(parts)
