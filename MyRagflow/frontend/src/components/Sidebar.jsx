import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Database, MessageSquare, Image, Settings2 } from "lucide-react";
import { cn } from "../lib/utils";

const items = [
  { to: "/", icon: LayoutDashboard, label: "概览" },
  { to: "/kbs", icon: Database, label: "知识库" },
  { to: "/chat", icon: MessageSquare, label: "对话" },
  { to: "/vision", icon: Image, label: "图片理解" },
  { to: "/settings", icon: Settings2, label: "设置" },
];

export default function Sidebar() {
  return (
    <div className="h-full w-[260px] shrink-0 border-r border-white/10 bg-zinc-950/40 backdrop-blur">
      <div className="px-5 py-5 flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500/80 to-cyan-400/60 shadow-soft" />
        <div className="min-w-0">
          <div className="font-bold leading-tight">智能问答系统</div>
          <div className="text-xs text-zinc-400">ragflow和图片识别</div>
        </div>
      </div>

      <div className="px-3 mt-2 flex flex-col gap-1">
        {items.map(it => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm",
                "hover:bg-white/5 transition",
                isActive ? "bg-white/8 border border-white/10" : "border border-transparent text-zinc-300"
              )}
            >
              <Icon size={18} className="text-zinc-300" />
              <span>{it.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="px-5 mt-6">
        <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-4">
          <div className="text-sm font-semibold">提示</div>
          <div className="text-xs text-zinc-400 mt-1 leading-relaxed">
            上传文档后，去“对话”页面选择知识库即可 RAG。
          </div>
        </div>
      </div>
    </div>
  );
}
