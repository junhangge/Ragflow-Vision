from __future__ import annotations

import os
import sqlite3
import time
import uuid
from dataclasses import dataclass
from pathlib import Path

DATA_DIR = Path(os.getenv("DATA_DIR", "/app/data")).resolve()
KBS_DIR = DATA_DIR / "kbs"
KBS_DIR.mkdir(parents=True, exist_ok=True)

@dataclass
class KB:
    kb_id: str
    name: str
    created_at: int

def _kb_dir(kb_id: str) -> Path:
    return (KBS_DIR / kb_id).resolve()

def _db_path(kb_id: str) -> Path:
    return _kb_dir(kb_id) / "meta.sqlite"

def _faiss_path(kb_id: str) -> Path:
    return _kb_dir(kb_id) / "index.faiss"

def _lock_path(kb_id: str) -> Path:
    return _kb_dir(kb_id) / ".lock"

def _connect(kb_id: str) -> sqlite3.Connection:
    conn = sqlite3.connect(_db_path(kb_id))
    conn.row_factory = sqlite3.Row
    return conn

def init_storage():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    reg = DATA_DIR / "registry.sqlite"
    conn = sqlite3.connect(reg)
    conn.execute("""
    CREATE TABLE IF NOT EXISTS kbs (
      kb_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
    """)
    conn.commit()
    conn.close()

def list_kbs() -> list[KB]:
    reg = DATA_DIR / "registry.sqlite"
    conn = sqlite3.connect(reg)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT kb_id, name, created_at FROM kbs ORDER BY created_at DESC").fetchall()
    conn.close()
    return [KB(kb_id=r["kb_id"], name=r["name"], created_at=r["created_at"]) for r in rows]

def create_kb(name: str) -> KB:
    kb_id = uuid.uuid4().hex[:12]
    created_at = int(time.time())
    kb_path = _kb_dir(kb_id)
    kb_path.mkdir(parents=True, exist_ok=True)

    reg = DATA_DIR / "registry.sqlite"
    conn = sqlite3.connect(reg)
    conn.execute("INSERT INTO kbs (kb_id, name, created_at) VALUES (?, ?, ?)", (kb_id, name, created_at))
    conn.commit()
    conn.close()

    conn = _connect(kb_id)
    conn.execute("""
    CREATE TABLE IF NOT EXISTS docs (
      doc_id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      mime TEXT,
      size_bytes INTEGER,
      created_at INTEGER NOT NULL
    )
    """)
    conn.execute("""
    CREATE TABLE IF NOT EXISTS chunks (
      chunk_id TEXT PRIMARY KEY,
      doc_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      vector_ord INTEGER NOT NULL,
      FOREIGN KEY(doc_id) REFERENCES docs(doc_id)
    )
    """)
    conn.execute("""
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
    """)
    conn.commit()
    conn.close()

    return KB(kb_id=kb_id, name=name, created_at=created_at)

def delete_kb(kb_id: str):
    reg = DATA_DIR / "registry.sqlite"
    conn = sqlite3.connect(reg)
    conn.execute("DELETE FROM kbs WHERE kb_id=?", (kb_id,))
    conn.commit()
    conn.close()

    kb_path = _kb_dir(kb_id)
    if kb_path.exists():
        for p in sorted(kb_path.rglob("*"), reverse=True):
            try:
                p.unlink()
            except IsADirectoryError:
                p.rmdir()
        try:
            kb_path.rmdir()
        except Exception:
            pass

def list_docs(kb_id: str):
    conn = _connect(kb_id)
    rows = conn.execute("SELECT doc_id, filename, mime, size_bytes, created_at FROM docs ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_kv(kb_id: str, key: str):
    conn = _connect(kb_id)
    row = conn.execute("SELECT value FROM kv WHERE key=?", (key,)).fetchone()
    conn.close()
    return row["value"] if row else None

def set_kv(kb_id: str, key: str, value: str):
    conn = _connect(kb_id)
    conn.execute("INSERT INTO kv(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                 (key, value))
    conn.commit()
    conn.close()

def insert_doc(kb_id: str, filename: str, mime: str, size_bytes: int) -> str:
    doc_id = uuid.uuid4().hex[:12]
    created_at = int(time.time())
    conn = _connect(kb_id)
    conn.execute("INSERT INTO docs(doc_id, filename, mime, size_bytes, created_at) VALUES(?,?,?,?,?)",
                 (doc_id, filename, mime, size_bytes, created_at))
    conn.commit()
    conn.close()
    return doc_id

def insert_chunks(kb_id: str, doc_id: str, chunks: list[str], start_ord: int) -> list[str]:
    created_at = int(time.time())
    conn = _connect(kb_id)
    chunk_ids = []
    for i, text in enumerate(chunks):
        chunk_id = uuid.uuid4().hex[:16]
        chunk_ids.append(chunk_id)
        conn.execute(
            "INSERT INTO chunks(chunk_id, doc_id, chunk_index, text, created_at, vector_ord) VALUES(?,?,?,?,?,?)",
            (chunk_id, doc_id, i, text, created_at, start_ord + i),
        )
    conn.commit()
    conn.close()
    return chunk_ids

def count_chunks(kb_id: str) -> int:
    conn = _connect(kb_id)
    row = conn.execute("SELECT COUNT(*) AS n FROM chunks").fetchone()
    conn.close()
    return int(row["n"] if row else 0)

def fetch_chunks_by_ord(kb_id: str, ords: list[int]) -> list[dict]:
    if not ords:
        return []
    placeholders = ",".join(["?"] * len(ords))
    conn = _connect(kb_id)
    rows = conn.execute(f"""
      SELECT c.vector_ord, c.chunk_id, c.doc_id, c.chunk_index, c.text, d.filename
      FROM chunks c
      JOIN docs d ON c.doc_id = d.doc_id
      WHERE c.vector_ord IN ({placeholders})
    """, tuple(ords)).fetchall()
    conn.close()
    out = [dict(r) for r in rows]
    out.sort(key=lambda x: ords.index(x["vector_ord"]))
    return out

def delete_doc_and_chunks(kb_id: str, doc_id: str):
    conn = _connect(kb_id)
    conn.execute("DELETE FROM chunks WHERE doc_id=?", (doc_id,))
    conn.execute("DELETE FROM docs WHERE doc_id=?", (doc_id,))
    conn.commit()
    conn.close()

def db_path(kb_id: str) -> Path:
    return _db_path(kb_id)

def faiss_path(kb_id: str) -> Path:
    return _faiss_path(kb_id)

def lock_path(kb_id: str) -> Path:
    return _lock_path(kb_id)
