import React, { useMemo, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";

import Dashboard from "./pages/Dashboard";
import KBs from "./pages/KBs";
import KBDetail from "./pages/KBDetail";
import Chat from "./pages/Chat";
import Vision from "./pages/Vision";
import Settings from "./pages/Settings";

function useToast() {
  const [items, setItems] = useState([]);
  const api = useMemo(() => ({
    success(title, message) {
      const id = crypto.randomUUID();
      setItems(prev => [...prev, { id, title, message }]);
      setTimeout(() => setItems(prev => prev.filter(x => x.id !== id)), 4200);
    },
    error(title, message) {
      const id = crypto.randomUUID();
      setItems(prev => [...prev, { id, title, message }]);
      setTimeout(() => setItems(prev => prev.filter(x => x.id !== id)), 6500);
    },
  }), []);

  return { items, api, close: (id) => setItems(prev => prev.filter(x => x.id !== id)) };
}

export default function App() {
  const t = useToast();

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-950 to-indigo-950/30">
      <Toast items={t.items} onClose={t.close} />
      <div className="h-full flex">
        <Sidebar />
        <div className="flex-1 h-full overflow-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/kbs" element={<KBs toast={t.api} />} />
            <Route path="/kbs/:kbId" element={<KBDetail toast={t.api} />} />
            <Route path="/chat" element={<Chat toast={t.api} />} />
            <Route path="/vision" element={<Vision toast={t.api} />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
