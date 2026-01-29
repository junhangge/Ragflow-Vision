import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Topbar from "../components/Topbar";
import Card from "../components/Card";
import Dropzone from "../components/Dropzone";
import { apiDelete, apiGet, apiPost, apiUpload } from "../lib/api";
import { FileText, RefreshCw, Trash2, MessageSquare, ArrowLeft } from "lucide-react";

function fmtSize(n) {
  if (n == null) return "-";
  const u = ["B","KB","MB","GB"];
  let i = 0; let x = n;
  while (x > 1024 && i < u.length-1) { x/=1024; i++; }
  return `${x.toFixed(i===0?0:1)} ${u[i]}`;
}

export default function KBDetail({ toast }) {
  const { kbId } = useParams();
  const [docs, setDocs] = useState([]);
  const [stats, setStats] = useState({ docs: 0, chunks: 0 });
  const [busy, setBusy] = useState(false);
  const [chunkSize, setChunkSize] = useState(900);
  const [overlap, setOverlap] = useState(120);

  async function refresh() {
    const [d, s] = await Promise.all([
      apiGet(`/kbs/${kbId}/docs`),
      apiGet(`/kbs/${kbId}/stats`),
    ]);
    setDocs(d);
    setStats(s);
  }

  useEffect(() => { refresh(); }, [kbId]);

  async function uploadFiles(files) {
    setBusy(true);
    try {
      for (const f of files) {
        const res = await apiUpload(kbId, f, { chunk_size: chunkSize, chunk_overlap: overlap });
        toast?.success("已上传并索引", `${res.filename} · ${res.chunks} chunks`);
      }
      refresh();
    } catch (e) {
      toast?.error("上传失败", e.message);
    } finally {
      setBusy(false);
    }
  }

  async function rebuild() {
    setBusy(true);
    try {
      const res = await apiPost(`/kbs/${kbId}/rebuild`, {});
      toast?.success("索引已重建", `chunks: ${res.chunks ?? 0}`);
      refresh();
    } catch (e) {
      toast?.error("重建失败", e.message);
    } finally {
      setBusy(false);
    }
  }

  async function delDoc(doc) {
    if (!confirm(`删除文档：${doc.filename} ?（会触发重建索引）`)) return;
    setBusy(true);
    try {
      await apiDelete(`/kbs/${kbId}/docs/${doc.doc_id}`);
      toast?.success("已删除", doc.filename);
      refresh();
    } catch (e) {
      toast?.error("删除失败", e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Topbar
        title={`知识库详情`}
        subtitle={`KB ID: ${kbId} · docs ${stats.docs} · chunks ${stats.chunks}`}
        right={
          <div className="flex items-center gap-2">
            <Link to="/kbs" className="text-sm px-3 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition inline-flex items-center gap-2">
              <ArrowLeft size={16}/> 返回
            </Link>
            <Link to={`/chat?kb=${kbId}`} className="text-sm px-3 py-2 rounded-2xl bg-indigo-500/15 border border-indigo-400/20 hover:bg-indigo-500/20 transition inline-flex items-center gap-2">
              <MessageSquare size={16}/> 去对话
            </Link>
            <button disabled={busy} onClick={rebuild} className="text-sm px-3 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition inline-flex items-center gap-2 disabled:opacity-50">
              <RefreshCw size={16}/> 重建索引
            </button>
          </div>
        }
      />
      <div className="p-6 overflow-auto space-y-5">
        <Card className="p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="min-w-0">
              <div className="font-semibold">上传与分块</div>
              <div className="text-xs text-zinc-400 mt-1">建议 chunkSize 700~1200；overlap 80~160</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm flex items-center gap-2">
                <span className="text-zinc-400 text-xs">chunk</span>
                <input className="w-20 bg-transparent outline-none" type="number" value={chunkSize} onChange={e => setChunkSize(+e.target.value)} />
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm flex items-center gap-2">
                <span className="text-zinc-400 text-xs">overlap</span>
                <input className="w-20 bg-transparent outline-none" type="number" value={overlap} onChange={e => setOverlap(+e.target.value)} />
              </div>
              {busy && <div className="text-xs text-zinc-400">处理中…</div>}
            </div>
          </div>
          <div className="mt-4">
            <Dropzone onFiles={uploadFiles} accept={[".pdf",".docx",".txt",".md",".csv"]} />
          </div>
        </Card>

        <Card className="p-5">
          <div className="font-semibold">文档列表</div>
          <div className="text-xs text-zinc-400 mt-1">删除文档会触发索引重建（安全优先）。</div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-zinc-400">
                <tr className="border-b border-white/10">
                  <th className="text-left py-2">文件</th>
                  <th className="text-left py-2">类型</th>
                  <th className="text-left py-2">大小</th>
                  <th className="text-right py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => (
                  <tr key={doc.doc_id} className="border-b border-white/5 hover:bg-white/[0.03] transition">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                          <FileText size={16}/>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate max-w-[520px]">{doc.filename}</div>
                          <div className="text-xs text-zinc-500">doc_id: {doc.doc_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-zinc-300">{doc.mime || "-"}</td>
                    <td className="py-3 text-zinc-300">{fmtSize(doc.size_bytes)}</td>
                    <td className="py-3 text-right">
                      <button disabled={busy} onClick={() => delDoc(doc)} className="text-sm px-3 py-2 rounded-2xl bg-red-500/10 border border-red-400/20 hover:bg-red-500/15 transition inline-flex items-center gap-2 disabled:opacity-50">
                        <Trash2 size={16}/> 删除
                      </button>
                    </td>
                  </tr>
                ))}
                {docs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-400">
                      暂无文档。先上传一些文件吧。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
