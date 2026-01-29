from __future__ import annotations

def chunk_text(text: str, chunk_size: int = 900, overlap: int = 120) -> list[str]:
    text = (text or "").replace("\r\n", "\n").strip()
    if not text:
        return []
    chunk_size = max(200, int(chunk_size))
    overlap = max(0, min(int(overlap), chunk_size - 1))

    chunks: list[str] = []
    start = 0
    n = len(text)

    while start < n:
        end = min(n, start + chunk_size)

        # softer cut: try newline or sentence boundary near the end
        if end < n:
            window = 220
            cut = text.rfind("\n\n", start, end)
            if cut != -1 and end - cut < window:
                end = cut
            else:
                cut = text.rfind(". ", start, end)
                if cut != -1 and end - cut < window:
                    end = cut + 1

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= n:
            break
        start = max(0, end - overlap)

    return chunks
