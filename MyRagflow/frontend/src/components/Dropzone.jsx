import React, { useMemo, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "../lib/utils";

export default function Dropzone({ onFiles, accept }) {
  const [drag, setDrag] = useState(false);

  const acceptStr = useMemo(() => {
    if (!accept) return "";
    if (Array.isArray(accept)) return accept.join(",");
    return accept;
  }, [accept]);

  function onDrop(e) {
    e.preventDefault();
    setDrag(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) onFiles?.(files);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={cn(
        "rounded-3xl border border-dashed p-6 text-center cursor-pointer select-none",
        drag ? "border-indigo-400/70 bg-indigo-500/10" : "border-white/12 bg-white/[0.02]"
      )}
      onClick={() => document.getElementById("hiddenFileInput")?.click()}
    >
      <UploadCloud className="mx-auto mb-3 text-zinc-300" size={28} />
      <div className="font-semibold">拖拽文件到这里上传</div>
      <div className="text-xs text-zinc-400 mt-1">支持 PDF / DOCX / TXT / MD / CSV</div>
      <input
        id="hiddenFileInput"
        type="file"
        className="hidden"
        multiple
        accept={acceptStr}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) onFiles?.(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
