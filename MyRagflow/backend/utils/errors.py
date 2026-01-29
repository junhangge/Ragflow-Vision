from __future__ import annotations
from fastapi import Request
from fastapi.responses import ORJSONResponse
import uuid
import traceback

def json_error(message: str, code: str = "ERROR", status: int = 400, trace_id: str | None = None):
    return ORJSONResponse(
        status_code=status,
        content={"ok": False, "error": {"code": code, "message": message, "trace_id": trace_id}},
    )

async def unhandled_exception_handler(request: Request, exc: Exception):
    trace_id = str(uuid.uuid4())
    _ = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    return json_error("Internal server error", code="INTERNAL", status=500, trace_id=trace_id)
