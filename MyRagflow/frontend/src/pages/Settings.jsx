import React, { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
import Card from "../components/Card";

export default function Settings() {
  const [topK, setTopK] = useState(() => Number(localStorage.getItem("rag_topk") || 6));

  useEffect(() => { localStorage.setItem("rag_topk", String(topK)); }, [topK]);

  return (
    <div className="h-full flex flex-col">
      <Topbar title="设置" subtitle="前端偏好设置（不会影响后端配置）" />
      <div className="p-6 overflow-auto">
        <Card className="p-5 max-w-2xl">
          <div className="font-semibold">默认 Top-K</div>
          <div className="text-xs text-zinc-400 mt-1">用于检索的默认返回数量。对话页也可临时调整。</div>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="range"
              min={2}
              max={12}
              value={topK}
              onChange={(e) => setTopK(+e.target.value)}
              className="w-full"
            />
            <div className="text-sm font-semibold w-10 text-right">{topK}</div>
          </div>
          <div className="mt-6 text-xs text-zinc-500 leading-relaxed">
            服务端的 Key / 模型请在 .env 中设置后重启容器生效。
          </div>
        </Card>
      </div>
    </div>
  );
}
