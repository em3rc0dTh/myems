"use client";

import React from 'react';
import MasterInventoryTree from '@/components/MasterInventoryTree';
import { PackageSearch, Download, Share2 } from 'lucide-react';

export default function InventoryTreePage() {
  return (
    <div className="flex-1 flex flex-col h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans">
      {/* HEADER */}
      <div className="h-20 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-10 shrink-0 relative z-50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-sky-500/10 rounded-2xl border border-sky-500/20">
            <PackageSearch className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">Auditoría <span className="text-sky-400">Estructural</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">Navegación Vertical de Activos </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-slate-400 hover:text-white transition-all">
            <Download className="w-4 h-4" />
          </button>
          <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-slate-400 hover:text-white transition-all">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-12 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.05),transparent)]">
        <div className="max-w-6xl mx-auto">
          <div className="bg-slate-900/40 rounded-[40px] border border-white/10 p-1 flex flex-col">
            <MasterInventoryTree />
          </div>
        </div>
      </div>
    </div>
  );
}
