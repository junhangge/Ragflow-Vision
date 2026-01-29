import React from "react";
import { Search } from "lucide-react";

export default function Topbar({ title, subtitle, right }) {
  return (
    <div className="px-6 py-5 border-b border-white/10 bg-zinc-950/30 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold truncate">{title}</div>
          {subtitle && <div className="text-xs text-zinc-400 mt-0.5">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-2">
          {right}
        </div>
      </div>
    </div>
  );
}
