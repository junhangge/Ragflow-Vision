import React, { useEffect, useMemo, useRef, useState } from "react";
import Topbar from "../components/Topbar";
import Card from "../components/Card";
import ChatStream from "../components/ChatStream";
import { apiGet, apiPost } from "../lib/api";
import { cn } from "../lib/utils";
import { Send, Database, Sparkles } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";

function SourceCard({ s }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-400">{s.tag}</div>
        <div className="text-xs text-zinc-400">{(s.score ?? 0).toFixed(3)}</div>
      </div>
      <div className="mt-1 font-semibold text-sm truncate">{s.filename}</div>
      <div className="mt-2 text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap line-clamp-6">
        {s.text}
      </div>
    </div>
  );
}

export default function Chat({ toast }) {
  const [kbs, setKbs] = useState([]);
  const [kbId, setKbId] = useState("");
  const [topK, setTopK] = useState(6);

  const [messages, setMessages] = useState([
    { role: "assistant", content: "你好！选择一个知识库，然后开始提问。我会在右侧给出引用来源（Sources）。" }
  ]);
  const [input, setInput] = useState("");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);

  const [sp] = useSearchParams();

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet("/kbs");
        setKbs(data);
        const qkb = sp.get("kb");
        if (qkb) setKbId(qkb);
        else if (data?.[0]?.kb_id) setKbId(data[0].kb_id);
      } catch (e) {
        toast?.error("加载知识库失败", e.message);
      }
    })();
  }, []);

  function historyForBackend() {
    // send only user/assistant
    return messages
      .filter(m => (m.role === "user" || m.role === "assistant"))
      .slice(-14);
  }

  async function send() {
    const text = input.trim();
    if (!text) return;
    if (!kbId) {
      toast?.error("请选择知识库", "先去“知识库”创建一个");
      return;
    }
    setInput("");
    setSources([]);
    setLoading(true);

    setMessages(prev => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kb_id: kbId, message: text, history: historyForBackend(), top_k: topK }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      const updateLast = (delta) => {
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") last.content = (last.content || "") + delta;
          return next;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // parse SSE chunks
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const p of parts) {
          const lines = p.split("\n").filter(Boolean);
          let event = null;
          let dataLine = null;
          for (const l of lines) {
            if (l.startsWith("event:")) event = l.slice(6).trim();
            if (l.startsWith("data:")) dataLine = l.slice(5).trim();
          }
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine);
          if (event === "delta") updateLast(payload.delta || "");
          if (event === "sources") setSources(payload.sources || []);
        }
      }
    } catch (e) {
      toast?.error("对话失败", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Topbar
        title="对话"
        subtitle="DeepSeek 流式输出 · RAG 检索与引用"
        right={
          <div className="flex items-center gap-2">
            <Link to="/kbs" className="text-sm px-3 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition inline-flex items-center gap-2">
              <Database size={16}/> 管理知识库
            </Link>
          </div>
        }
      />

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4 p-6 overflow-hidden">
        <Card className="flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-300" />
              <div className="text-sm font-semibold">Chat</div>
            </div>
            <div className="flex items-center gap-2">
              <select value={kbId} onChange={e => setKbId(e.target.value)}
                className="text-sm rounded-2xl bg-black/30 border border-white/10 px-3 py-2 outline-none">
                {kbs.map(k => <option key={k.kb_id} value={k.kb_id}>{k.name}</option>)}
              </select>
              <input
                type="number"
                value={topK}
                onChange={(e) => setTopK(+e.target.value)}
                className="w-20 text-sm rounded-2xl bg-black/30 border border-white/10 px-3 py-2 outline-none"
                title="Top-K"
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <ChatStream messages={messages} />
          </div>

          <div className="p-4 border-t border-white/10">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") send();
                }}
                placeholder="输入问题…（Ctrl/⌘ + Enter 发送）"
                className="flex-1 min-h-[52px] max-h-[160px] resize-none rounded-3xl bg-black/25 border border-white/10 px-4 py-3 outline-none focus:border-indigo-400/35"
              />
              <button
                disabled={loading}
                onClick={send}
                className="h-[52px] px-5 rounded-3xl bg-indigo-500/18 border border-indigo-400/20 hover:bg-indigo-500/22 transition font-semibold inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Send size={16}/> 发送
              </button>
            </div>
            <div className="text-xs text-zinc-500 mt-2">
              提示：问得越具体越好。若回答引用了来源，会显示为 [S1] [S2] …
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-white/10">
            <div className="font-semibold">Sources</div>
            <div className="text-xs text-zinc-400 mt-1">检索到的上下文片段（Top-K）。</div>
          </div>
          <div className="p-4 overflow-auto space-y-3">
            {sources.length === 0 ? (
              <div className="text-sm text-zinc-400">暂无来源。发送问题后会显示检索片段。</div>
            ) : (
              sources.map(s => <SourceCard key={s.tag} s={s} />)
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
