import React, { useState } from "react";
import Topbar from "../components/Topbar";
import Card from "../components/Card";
import { apiVision } from "../lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Image as ImgIcon, Sparkles, UploadCloud } from "lucide-react";

export default function Vision({ toast }) {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState("请描述这张图，并提取关键信息。");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!file) return toast?.error("请选择图片", "支持 png/jpg");
    setBusy(true);
    setResult("");
    try {
      const res = await apiVision(prompt, file);
      setResult(res.text || "");
      toast?.success("完成", "已解析图片");
    } catch (e) {
      toast?.error("解析失败", e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Topbar title="图片理解" subtitle="OpenAI Vision · 文本抽取/描述/分析" />
      <div className="p-6 overflow-auto grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <ImgIcon size={18} className="text-indigo-300" />
            <div className="font-semibold">输入</div>
          </div>

          <div className="mt-4 rounded-3xl border border-dashed border-white/12 bg-white/[0.02] p-5 text-center">
            <UploadCloud className="mx-auto text-zinc-300" size={28} />
            <div className="mt-2 font-semibold">{file ? file.name : "选择或拖拽图片"}</div>
            <div className="text-xs text-zinc-400 mt-1">png/jpg/jpeg/webp</div>
            <input
              type="file"
              accept="image/*"
              className="mt-3 text-xs"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="mt-4">
            <div className="text-xs text-zinc-400 mb-1">提示词</div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full min-h-[110px] resize-none rounded-3xl bg-black/25 border border-white/10 px-4 py-3 outline-none focus:border-indigo-400/35"
            />
          </div>

          <button
            disabled={busy}
            onClick={run}
            className="mt-4 w-full rounded-3xl px-4 py-3 bg-indigo-500/18 border border-indigo-400/20 hover:bg-indigo-500/22 transition font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles size={16}/> 开始解析
          </button>
        </Card>

        <Card className="p-5 overflow-hidden">
          <div className="font-semibold">输出</div>
          <div className="text-xs text-zinc-400 mt-1">模型返回的文字结果（可复制）。</div>
          <div className="mt-4 h-[70vh] overflow-auto rounded-3xl border border-white/10 bg-black/20 p-4">
            {result ? (
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-sm text-zinc-400">还没有结果。上传图片并点击“开始解析”。</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
