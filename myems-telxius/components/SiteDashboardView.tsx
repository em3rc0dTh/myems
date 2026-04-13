"use client";

import React, { useState, useEffect } from 'react';
import { Building2, Save, MapPin, MousePointer2, PenTool } from 'lucide-react';
import TechnicalBlueprintEngine from './TechnicalBlueprintEngine';

interface SiteDashboardViewProps {
  siteId: string;
  onStructureSelect: (id: string) => void;
}

export default function SiteDashboardView({ siteId, onStructureSelect }: SiteDashboardViewProps) {
  const [site, setSite] = useState<any>(null);
  const [structures, setStructures] = useState<any[]>([]);
  const [isDrafting, setIsDrafting] = useState(false);
  const [localElements, setLocalElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [namingModal, setNamingModal] = useState<{ isOpen: boolean, points: any[] }>({ isOpen: false, points: [] });
  const [newStructureName, setNewStructureName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'POLYGON' | 'MOVE'>('POLYGON');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (siteId) {
      fetchSiteData();
    }
  }, [siteId]);

  const fetchSiteData = async () => {
    setLoading(true);
    setError(null);
    try {
      const sRes = await fetch(`/telxius/api/sites/?id=${siteId}`);
      if (!sRes.ok) throw new Error(`HTTP Error: ${sRes.status}`);
      const sData = await sRes.json();
      const siteObj = Array.isArray(sData.data) ? sData.data[0] : sData.data;
      if (siteObj && siteObj.id) {
        setSite(siteObj);
        setStructures(siteObj.structures || []);
      } else {
        setError("El sitio no tiene datos asignados.");
      }
    } catch (e) {
      setError("Error de sincronización con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrawingComplete = (points: any[]) => {
    setNamingModal({ isOpen: true, points });
    setNewStructureName(`BUILDING-${Date.now().toString().slice(-4)}`);
  };

  const confirmStructureNaming = () => {
    if (!newStructureName) return;
    setLocalElements([{
      id: `draft-${Date.now()}`,
      type: 'POLYGON',
      label: newStructureName,
      points: namingModal.points,
      color: 'rgba(16, 185, 129, 0.4)'
    }]);
    setNamingModal({ isOpen: false, points: [] });
    setNewStructureName("");
    setActiveTool('MOVE'); 
  };

  const handleElementUpdated = (updatedEl: any) => {
    setLocalElements(prev => prev.map(el => el.id === updatedEl.id ? updatedEl : el));
  };

  const handleSaveStructures = async () => {
    const polygons = localElements.filter(el => el.type === 'POLYGON');
    if (polygons.length === 0) return;

    setIsSaving(true);
    try {
      for (const poly of polygons) {
        const res = await fetch('/telxius/api/structures/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: poly.label,
            siteId: siteId,
            perimeter: JSON.stringify(poly.points),
            spatialMetadata: JSON.stringify({ metric: 'cm', timestamp: Date.now() })
          })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.details || data.error);
      }
      setLocalElements([]);
      setIsDrafting(false);
      setActiveTool('POLYGON');
      fetchSiteData();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-black/40">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-6"></div>
      <p className="text-emerald-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Syncing Site Analytics...</p>
    </div>
  );

  if (error || !site) return (
    <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-black/40 font-sans">
      <MapPin className="w-10 h-10 text-rose-500 mb-4" />
      <h2 className="text-xl font-black uppercase text-white tracking-widest leading-none mb-2 italic">Site Offline</h2>
      <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">{error}</p>
    </div>
  );

  const allVisualElements = [
    ...structures.map(st => ({
      id: st.id,
      type: 'POLYGON' as const,
      label: st.name,
      points: JSON.parse(st.perimeter || '[]'),
      isLocked: true
    })),
    ...localElements
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#020617] font-sans">
      <div className="h-14 border-b border-white/5 bg-black/40 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20"><MapPin className="w-4 h-4 text-emerald-400" /></div>
          <div>
            <h2 className="text-[10px] font-black uppercase text-white leading-none tracking-widest">{site.name}</h2>
            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest italic">Civil Engineering • Site Master Plan</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
            <button 
              onClick={() => { setIsDrafting(false); setActiveTool('POLYGON'); }}
              className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${!isDrafting ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <MousePointer2 className="w-3 h-3 inline mr-2" /> Inspect
            </button>
            <button 
              onClick={() => { setIsDrafting(true); setActiveTool('POLYGON'); }}
              className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${isDrafting && activeTool === 'POLYGON' ? 'bg-amber-500 text-black' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <PenTool className="w-3 h-3 inline mr-2" /> Draw Building
            </button>
          </div>

          {activeTool === 'MOVE' && (
            <button 
              onClick={handleSaveStructures}
              disabled={isSaving}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-emerald-500/20"
            >
              {isSaving ? 'Saving...' : 'Confirm Positioning'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 border-r border-white/5 p-4 space-y-4 bg-black/20">
            <h3 className="text-[7px] font-black text-slate-500 uppercase tracking-widest px-2 italic text-slate-600">Infrastructure Catalog</h3>
            <div className="space-y-1.5">
              {structures.map(st => (
                <button key={st.id} onClick={() => onStructureSelect(st.id)} className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all group text-left">
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                    <Building2 className="w-3 h-3 text-emerald-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-white uppercase tracking-tight">{st.name}</p>
                    <p className="text-[7px] text-slate-500 font-bold uppercase tracking-tighter">Enter Architecture</p>
                  </div>
                </button>
              ))}
              {structures.length === 0 && <div className="p-6 text-center bg-white/5 rounded-2xl opacity-30"><p className="text-[7px] font-bold text-slate-500 uppercase italic">Empty Terrain</p></div>}
            </div>
        </div>

        <div className="flex-1 p-8 relative flex items-center justify-center bg-[#01040a]">
          <div className="w-full h-full max-w-[1200px] max-aspect-[1/1] relative shadow-2xl">
            <TechnicalBlueprintEngine 
              widthCm={site.widthCm || 5000} 
              heightCm={site.heightCm || 5000}
              showGrid={true}
              gridSize={150}
              isEditable={isDrafting}
              activeTool={activeTool}
              elements={allVisualElements}
              onDrawingComplete={handleDrawingComplete}
              onElementUpdated={handleElementUpdated}
            />
          </div>

          {namingModal.isOpen && (
            <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
              <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-amber-500/20 rounded-2xl"><Building2 className="w-6 h-6 text-amber-500" /></div>
                  <h3 className="text-lg font-black uppercase text-white leading-none">New Structure</h3>
                </div>
                <input autoFocus value={newStructureName} onChange={(e) => setNewStructureName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500/50 outline-none mb-8" placeholder="Building Name..." />
                <div className="flex gap-3">
                  <button onClick={() => setNamingModal({ isOpen: false, points: [] })} className="flex-1 px-4 py-3 bg-white/5 text-white text-[9px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                  <button onClick={confirmStructureNaming} className="flex-1 px-4 py-3 bg-amber-500 text-black text-[9px] font-black uppercase tracking-widest rounded-xl">Confirm</button>
                </div>
              </div>
            </div>
          )}

          <div className="absolute top-16 right-16 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-slate-400 text-[8px] font-black uppercase tracking-[0.2em] italic">
            MASTER PLAN • SYNCED 1:1
          </div>
        </div>
      </div>
    </div>
  );
}
