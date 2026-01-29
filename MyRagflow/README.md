# RAG Studio (ragflow-like) — DeepSeek Chat + OpenAI Vision

一个接近 ragflow 交付形态的本地可部署 RAG 系统（多知识库、上传/索引、流式聊天、引用来源、图片理解）。

## 1) 一键部署
```bash
cp .env.example .env
# 填写 DeepSeek/OpenAI key
docker compose up -d --build
```

- Web UI: http://localhost:8080  
- Backend: http://localhost:8000/api/health

## 2) 功能
- ✅ 多知识库（KB）
- ✅ 文档上传：pdf/docx/txt/md/csv
- ✅ Chunk + Embeddings + FAISS 落盘
- ✅ DeepSeek 流式对话（SSE）
- ✅ RAG 检索 + Sources 引用侧栏
- ✅ OpenAI Vision 图片理解页

## 3) 常见问题
- **启动报 401/403**：检查 `.env` 的 key 与 base url/model 是否正确
- **扫描版 PDF 无法抽取文本**：会提示“无文本层”，需要 OCR 后再上传
- **想用本地 Embeddings**：将 `EMBEDDINGS_PROVIDER=local`，首次会下载模型（耗时/占空间）
