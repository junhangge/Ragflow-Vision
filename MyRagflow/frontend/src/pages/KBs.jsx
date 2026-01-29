import React, { useEffect, useMemo, useState } from "react";
import Topbar from "../components/Topbar";
import Card from "../components/Card";
import Modal from "../components/Modal";
import { apiDelete, apiGet, apiPost } from "../lib/api";
import { Plus, Trash2, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function KBs({ toast }) {
  const [kbs, setKbs] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function refresh() {
    const data = await apiGet("/kbs");
    setKbs(data);
  }

  useEffect(() => { refresh(); }, []);

  async function create() {
    try {
      const kb = await apiPost("/kbs", { name });
      toast?.success("已创建", kb.name);
      setName("");
      setOpen(false);
      refresh();
    } catch (e) {
      toast?.error("创建失败", e.message);
    }
  }

  async function del(kb) {
    if (!confirm(`确定删除知识库：${kb.name} ?`)) return;
    try {
      await apiDelete(`/kbs/${kb.kb_id}`);
      toast?.success("已删除", kb.name);
      refresh();
    } catch (e) {
      toast?.error("删除失败", e.message);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Topbar
        title="知识库"
        subtitle="创建、上传、索引与管理"
        right={
          <button onClick={() => setOpen(true)} className="text-sm px-3 py-2 rounded-2xl bg-indigo-500/15 border border-indigo-400/20 hover:bg-indigo-500/20 transition inline-flex items-center gap-2">
            <Plus size={16}/> 新建
          </button>
        }
      />
      <div className="p-6 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {kbs.map(kb => (
            <Card key={kb.kb_id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-lg truncate">{kb.name}</div>
                  <div className="text-xs text-zinc-400 mt-1">ID: {kb.kb_id}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/kbs/${kb.kb_id}`} className="text-sm px-3 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition inline-flex items-center gap-2">
                    打开 <ArrowUpRight size={16}/>
                  </Link>
                  <button onClick={() => del(kb)} className="text-sm px-3 py-2 rounded-2xl bg-red-500/10 border border-red-400/20 hover:bg-red-500/15 transition inline-flex items-center gap-2">
                    <Trash2 size={16}/> 删除
                  </button>
                </div>
              </div>
              <div className="mt-4 text-sm text-zinc-300 leading-relaxed">
                进入详情页可上传文档、重建索引、查看文档列表与统计信息。
              </div>
            </Card>
          ))}
          {kbs.length === 0 && (
            <Card className="p-8 text-center">
              <div className="text-zinc-200 font-semibold">还没有知识库</div>
              <div className="text-sm text-zinc-400 mt-2">点击右上角“新建”创建第一个知识库。</div>
            </Card>
          )}
        </div>
      </div>

      <Modal open={open} title="新建知识库" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <div className="text-sm text-zinc-300">输入一个便于识别的名称。</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：产品文档 / 法务条款 / 研究资料"
            className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-indigo-400/40"
          />
          <button
            onClick={create}
            className="w-full rounded-2xl bg-indigo-500/15 border border-indigo-400/20 hover:bg-indigo-500/20 transition px-4 py-3 font-semibold"
          >
            创建
          </button>
        </div>
      </Modal>
    </div>
  );
}
