"use client";

import React, { useState, useEffect } from 'react';
import { 
  Database, FileJson, Search, ChevronRight, 
  Settings2, LayoutGrid, List, Box, 
  ArrowUpRight, Info, Edit, Trash2
} from 'lucide-react';
import EquipmentEditorModal from './EquipmentEditorModal';

interface WarehouseInventoryViewProps {
  siteId: string;
}

export default function WarehouseInventoryView({ siteId }: WarehouseInventoryViewProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [jsonViewer, setJsonViewer] = useState<{ isOpen: boolean; data: any }>({ isOpen: false, data: null });

  useEffect(() => {
    fetchTemplates();
  }, [siteId]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/telxius/api/devices/?siteId=${siteId}`);
      const data = await res.json();
      if (data.ok) {
        setTemplates(data.data);
      }
    } catch (e) {
      console.error("Failed to load templates", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black/40">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mb-6"></div>
        <p className="text-amber-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Accessing Secure Repository...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#020617] font-sans">
      {/* HEADER */}
      <div className="h-20 border-b border-white/5 bg-black/40 flex items-center justify-between px-10 shrink-0">
        <div className="flex items-center gap-5">
          <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
            <Database className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase text-white leading-none tracking-widest flex items-center gap-3">
              Almacén Central <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20">MASTER CATALOG</span>
            </h2>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">VIRTUAL STORAGE • INFRASTRUCTURE AS CODE TEMPLATES</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="SEARCH TEMPLATES..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-amber-500/50 transition-all w-64"
            />
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => setViewMode('LIST')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('GRID')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-auto p-10 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30">
            <Box className="w-16 h-16 mb-6" />
            <h3 className="text-xl font-black uppercase italic tracking-tighter">No Templates Found</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-2">Upload Layer 2 in Ingestion Wizard to populate catalog</p>
          </div>
        ) : (
          <div className={viewMode === 'LIST' ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"}>
            {filtered.map(template => (
              <div 
                key={template.id} 
                className={`group relative border transition-all duration-500 ${
                  viewMode === 'LIST' 
                    ? 'p-6 bg-white/[0.02] hover:bg-white/[0.05] border-white/5 hover:border-amber-500/30 rounded-[32px] flex items-center justify-between' 
                    : 'p-8 bg-white/[0.02] hover:bg-white/[0.05] border-white/5 hover:border-amber-500/30 rounded-[48px] flex flex-col'
                }`}
              >
                <div className={`flex items-center gap-6 ${viewMode === 'LIST' ? '' : 'mb-8'}`}>
                  <div className="relative">
                    <div className="p-4 bg-slate-900 rounded-3xl border border-white/10 group-hover:border-amber-500/50 transition-colors">
                      <Box className="w-6 h-6 text-amber-500 group-hover:scale-110 transition-transform" />
                    </div>
                    {template.isTemplate && (
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 text-black rounded-full flex items-center justify-center border-2 border-[#020617] animate-pulse">
                        <Settings2 className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white uppercase italic tracking-tighter group-hover:text-amber-400 transition-colors">{template.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded border border-sky-500/20 font-black uppercase tracking-widest">{template.category}</span>
                      {template.physWidth && (
                         <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">
                           {template.physWidth}x{template.physDepth}x{template.physHeight} CM
                         </span>
                      )}
                    </div>
                  </div>
                </div>

                {viewMode === 'LIST' && (
                  <div className="flex items-center gap-12">
                     <div className="flex items-center gap-8 text-[9px] font-black uppercase tracking-widest text-slate-500">
                        <div className="flex flex-col">
                           <span className="text-[7px] text-slate-600 mb-0.5">Physical Width</span>
                           <span className={template.physWidth ? 'text-slate-300' : 'text-slate-700'}>{template.physWidth || '--'} cm</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[7px] text-slate-600 mb-0.5">Physical Depth</span>
                           <span className={template.physDepth ? 'text-slate-300' : 'text-slate-700'}>{template.physDepth || '--'} cm</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[7px] text-slate-600 mb-0.5">Equipments</span>
                           <span className="text-slate-300">{template.equipments?.length || 0} Layers</span>
                        </div>
                     </div>
                  </div>
                )}

                <div className={`flex items-center gap-2 ${viewMode === 'LIST' ? '' : 'mt-auto pt-8 border-t border-white/5'}`}>
                  <button 
                    onClick={() => setJsonViewer({ isOpen: true, data: template })}
                    className="p-3 bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 rounded-2xl border border-white/5 transition-all"
                    title="Inspeccionar JSON"
                  >
                    <FileJson className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setSelectedTemplate(template)}
                    className="p-3 bg-white/5 hover:bg-sky-500/20 text-slate-400 hover:text-sky-400 rounded-2xl border border-white/5 transition-all"
                    title="Editar Atributos y Estructura"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* JSON VIEWER MODAL */}
      {jsonViewer.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-12">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setJsonViewer({ isOpen: false, data: null })} />
          <div className="relative w-full max-w-4xl max-h-full bg-[#0a0c12] border border-white/10 rounded-[48px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-10 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/30">
                  <FileJson className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Raw Ingestion Object</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{jsonViewer.data.name} • Master Template</p>
                </div>
              </div>
              <button 
                onClick={() => setJsonViewer({ isOpen: false, data: null })}
                className="p-4 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              >
                <ChevronRight className="w-6 h-6 rotate-180" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-10 bg-black/40">
              <pre className="text-amber-500/70 font-mono text-[11px] leading-relaxed custom-scrollbar">
                {JSON.stringify(jsonViewer.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* EQUIPMENT EDITOR MODAL */}
      {selectedTemplate && (
        <EquipmentEditorModal 
          device={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onUpdate={fetchTemplates}
        />
      )}
    </div>
  );
}
