import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Toast({ items, onClose }) {
  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2 w-[360px] max-w-[92vw]">
      <AnimatePresence>
        {items.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={`rounded-2xl shadow-soft border border-white/10 px-4 py-3 backdrop-blur bg-zinc-900/80`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-sm">{t.title}</div>
                <div className="text-sm text-zinc-300 mt-0.5 break-words">{t.message}</div>
              </div>
              <button
                onClick={() => onClose(t.id)}
                className="shrink-0 text-zinc-400 hover:text-zinc-200"
                aria-label="close"
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
