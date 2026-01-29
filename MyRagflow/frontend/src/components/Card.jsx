import React from "react";
import { cn } from "../lib/utils";

export default function Card({ className, children }) {
  return (
    <div className={cn("rounded-3xl border border-white/10 bg-zinc-900/30 shadow-soft", className)}>
      {children}
    </div>
  );
}
