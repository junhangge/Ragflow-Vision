import React, { useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function Bubble({ role, children }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[820px] w-fit rounded-3xl px-4 py-3 border shadow-soft
        ${isUser ? "bg-indigo-500/15 border-indigo-400/20" : "bg-zinc-900/40 border-white/10"}`}>
        <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ChatStream({ messages }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="px-5 py-4 space-y-3 overflow-auto h-full">
      {messages.map((m, idx) => (
        <Bubble key={idx} role={m.role}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {m.content}
          </ReactMarkdown>
        </Bubble>
      ))}
      <div ref={endRef} />
    </div>
  );
}
