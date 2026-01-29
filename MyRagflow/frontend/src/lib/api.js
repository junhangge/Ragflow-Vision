export async function apiGet(path) {
  const res = await fetch(`/api${path}`, { headers: { "Accept": "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data.data ?? data;
}

export async function apiPost(path, body) {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data.data ?? data;
}

export async function apiDelete(path) {
  const res = await fetch(`/api${path}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data.data ?? data;
}

export async function apiUpload(kbId, file, opts = {}) {
  const fd = new FormData();
  fd.append("file", file);
  if (opts.chunk_size) fd.append("chunk_size", String(opts.chunk_size));
  if (opts.chunk_overlap) fd.append("chunk_overlap", String(opts.chunk_overlap));
  const res = await fetch(`/api/kbs/${kbId}/upload`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data.data ?? data;
}

export async function apiVision(prompt, file) {
  const fd = new FormData();
  fd.append("prompt", prompt || "");
  fd.append("image", file);
  const res = await fetch(`/api/vision/analyze`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data.data ?? data;
}
