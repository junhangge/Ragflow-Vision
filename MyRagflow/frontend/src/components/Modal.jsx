import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Modal({ open, title, children, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose?.(); }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-950 shadow-soft overflow-hidden"
            initial={{ y: 18, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.18 }}
          >
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="font-semibold">{title}</div>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">✕</button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
