import React, { useEffect, useMemo, useState } from "react";
import Topbar from "../components/Topbar";
import Card from "../components/Card";
import { apiGet } from "../lib/api";
import { Database, MessageSquare, Image, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

function Stat({ icon: Icon, label, value }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-zinc-400">{label}</div>
          <div className="text-2xl font-semibold mt-1">{value}</div>
        </div>
        <div className="h-11 w-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Icon size={20} className="text-zinc-200" />
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const [kbs, setKbs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet("/kbs");
        setKbs(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="h-full flex flex-col">
      <Topbar
        title="概览"
        subtitle="知识库 / 对话 / 图片理解一站式工作台"
        right={
          <Link to="/kbs" className="text-sm px-3 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition inline-flex items-center gap-2">
            管理知识库 <ArrowUpRight size={16}/>
          </Link>
        }
      />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Stat icon={Database} label="知识库数量" value={kbs.length} />
          <Stat icon={MessageSquare} label="RAG 对话" value="流式输出" />
          <Stat icon={Image} label="图片理解" value="OpenAI Vision" />
        </div>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">最近知识库</div>
              <div className="text-xs text-zinc-400 mt-1">快速进入上传与对话</div>
            </div>
            <Link to="/chat" className="text-sm px-3 py-2 rounded-2xl bg-indigo-500/15 border border-indigo-400/20 hover:bg-indigo-500/20 transition">
              去对话
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {loading ? (
              <div className="text-sm text-zinc-400">加载中…</div>
            ) : kbs.length === 0 ? (
              <div className="text-sm text-zinc-400">还没有知识库。去“知识库”页面创建一个。</div>
            ) : (
              kbs.slice(0, 6).map(k => (
                <Link key={k.kb_id} to={`/kbs/${k.kb_id}`} className="rounded-3xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition p-4">
                  <div className="font-semibold">{k.name}</div>
                  <div className="text-xs text-zinc-400 mt-1">KB ID: {k.kb_id}</div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
