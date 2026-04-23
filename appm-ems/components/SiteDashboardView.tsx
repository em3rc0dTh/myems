"use client";

import React, { useState, useEffect } from 'react';
import { Building2, Save, MapPin, MousePointer2, PenTool, ArrowRight, Activity, Layers, Trash2, X } from 'lucide-react';
import TechnicalBlueprintEngine from './TechnicalBlueprintEngine';
import Swal from 'sweetalert2';
import { useAuth } from '@/lib/AuthContext';

interface SiteDashboardViewProps {
  siteId: string;
  onStructureSelect: (id: string, name?: string) => void;
}

export default function SiteDashboardView({ siteId, onStructureSelect }: SiteDashboardViewProps) {
  const { isAdmin } = useAuth();
  const [site, setSite] = useState<any>(null);
  const [structures, setStructures] = useState<any[]>([]);
  const [isDrafting, setIsDrafting] = useState(false);
  const [localElements, setLocalElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [namingModal, setNamingModal] = useState<{ isOpen: boolean, points: any[] }>({ isOpen: false, points: [] });
  const [newStructureName, setNewStructureName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'POLYGON' | 'MOVE' | 'REFERENCE_SYMBOL'>('POLYGON');
  const [symbolType, setSymbolType] = useState<'DOOR' | 'COLUMN' | 'WINDOW' | 'PANEL' | 'HVAC' | 'SECURITY'>('DOOR');
  const [symbolRotation, setSymbolRotation] = useState(0);
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
      const sRes = await fetch(`/appm-ems/api/sites/?id=${siteId}`);
      if (!sRes.ok) throw new Error(`HTTP Error: ${sRes.status}`);
      const sData = await sRes.json();
      const siteObj = Array.isArray(sData.data) ? sData.data[0] : sData.data;
      if (siteObj && siteObj.id) {
        setSite(siteObj);
        setStructures(siteObj.structures || []);
        if (siteObj.spatialMetadata) {
          try {
            const sm = typeof siteObj.spatialMetadata === 'string' ? JSON.parse(siteObj.spatialMetadata) : siteObj.spatialMetadata;
            if (sm.references) setLocalElements(prev => [...prev.filter(el => el.type !== 'REFERENCE'), ...(sm.references || [])]);
          } catch (e) { }
        }
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

  const handleElementAdded = (newEl: any) => {
    setLocalElements(prev => [...prev, { ...newEl, symbol: symbolType }]);
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
        const res = await fetch('/appm-ems/api/structures/', {
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

      // PERSIST REFERENCE ICONS TO SITE
      const refs = localElements.filter(el => el.type === 'REFERENCE');
      const existingMetadata = site.spatialMetadata ? (typeof site.spatialMetadata === 'string' ? JSON.parse(site.spatialMetadata) : site.spatialMetadata) : {};

      await fetch(`/appm-ems/api/sites/?id=${siteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spatialMetadata: JSON.stringify({
            ...existingMetadata,
            references: refs
          })
        })
      });

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
    <div className="flex-1 flex flex-col min-h-0 bg-[#020617] font-sans selection:bg-sky-500/30">
      <div className="h-20 border-b border-white/5 bg-black/40 backdrop-blur-2xl flex items-center justify-between px-8 relative z-[110]">
        <div className="flex items-center gap-6">
          <div
            className={`p-3 rounded-2xl border transition-all shadow-2xl ${isAdmin ? 'bg-sky-500/10 border-sky-500/20 cursor-pointer hover:bg-sky-500/20 hover:scale-105 active:scale-95' : 'bg-slate-500/5 border-white/5 cursor-default'}`}
            onClick={async () => {
              if (!isAdmin) return;
              const { value: formValues } = await Swal.fire({
                title: '<span class="text-sky-400 font-black italic">GEO-LOCATION ENGINE</span>',
                html: `
                  <div class="text-left space-y-6 p-2">
                    <div class="grid grid-cols-2 gap-4">
                      <div class="space-y-2">
                        <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Site Label</label>
                        <input id="swal-site-name" class="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-sky-500 outline-none transition-all uppercase font-mono" value="${site.name || ''}">
                      </div>
                      <div class="space-y-2">
                        <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Network Alias</label>
                        <input id="swal-site-alias" class="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm text-sky-400 font-black focus:border-sky-500 outline-none transition-all uppercase" value="${site.alias || ''}" placeholder="Ej: DC-LUR-01">
                      </div>
                    </div>
                    <div class="space-y-2">
                      <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Operational Summary</label>
                      <textarea id="swal-site-desc" class="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm h-32 focus:border-sky-500 outline-none transition-all" placeholder="Enter physical and logical details...">${site.description || ''}</textarea>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                      <div class="space-y-2">
                        <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Physical Address</label>
                        <input id="swal-site-address" class="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-sky-500 outline-none transition-all" value="${site.address || ''}">
                      </div>
                      <div class="space-y-2">
                        <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">GPS Coordinates</label>
                        <input id="swal-site-geo" class="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm font-mono focus:border-sky-500 outline-none transition-all uppercase" value="${site.geoCoords || ''}" placeholder="-12.0463, -77.0427">
                      </div>
                    </div>
                  </div>
                `,
                background: '#020617',
                color: '#fff',
                confirmButtonText: 'SYNC EMPLACEMENT',
                confirmButtonColor: '#0ea5e9',
                showCancelButton: true,
                cancelButtonColor: 'rgba(255,255,255,0.05)',
                width: '600px',
                padding: '2rem',
                customClass: {
                  popup: 'rounded-[40px] border border-white/10 backdrop-blur-3xl shadow-2xl site-modal-premium',
                  confirmButton: 'rounded-2xl px-8 py-4 text-[10px] font-black uppercase tracking-widest',
                  cancelButton: 'rounded-2xl px-8 py-4 text-[10px] font-black uppercase tracking-widest'
                },
                preConfirm: () => {
                  return {
                    name: (document.getElementById('swal-site-name') as HTMLInputElement).value,
                    alias: (document.getElementById('swal-site-alias') as HTMLInputElement).value,
                    description: (document.getElementById('swal-site-desc') as HTMLTextAreaElement).value,
                    address: (document.getElementById('swal-site-address') as HTMLInputElement).value,
                    geoCoords: (document.getElementById('swal-site-geo') as HTMLInputElement).value
                  }
                }
              });

              if (formValues) {
                await fetch(`/appm-ems/api/sites/?id=${siteId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(formValues)
                });
                fetchSiteData();
              }
            }}
          >
            <MapPin className="w-5 h-5 text-sky-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-black uppercase text-white leading-none tracking-[0.15em] italic">{site.name}</h2>
              {site.alias && (
                <span className="px-2 py-0.5 bg-sky-500/20 text-sky-400 text-[8px] font-black rounded-full border border-sky-500/30 uppercase tracking-widest">
                  {site.alias}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 rounded-md border border-white/10">
                <MapPin className="w-2 h-2 text-sky-500" />
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{site.geoCoords || 'PENDING'}</p>
              </div>
              {site.geoCoords && (
                <button
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.geoCoords)}`, '_blank')}
                  className="p-1 hover:bg-white/10 rounded-md transition-all group/map"
                >
                  <ArrowRight className="w-2.5 h-2.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 shadow-inner">
              <button
                onClick={() => { setIsDrafting(false); setActiveTool('POLYGON'); }}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${!isDrafting ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <MousePointer2 className="w-4 h-4" /> Inspect
              </button>
              <button
                onClick={() => { setIsDrafting(true); setActiveTool('POLYGON'); }}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${isDrafting && activeTool === 'POLYGON' ? 'bg-sky-500 text-black shadow-lg shadow-sky-500/30' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <PenTool className="w-4 h-4" /> Draw Building
              </button>
              <button
                onClick={() => { setIsDrafting(true); setActiveTool('REFERENCE_SYMBOL'); }}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${isDrafting && activeTool === 'REFERENCE_SYMBOL' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Layers className="w-4 h-4" /> Add Icon
              </button>
            </div>
          )}

          {isDrafting && activeTool === 'REFERENCE_SYMBOL' && (
            <div className="flex bg-sky-500/5 p-1 rounded-2xl border border-sky-500/10 gap-1 mr-4 animate-in slide-in-from-right-4 duration-300">
              {['DOOR', 'COLUMN', 'WINDOW', 'PANEL', 'HVAC', 'SECURITY'].map(s => (
                <button 
                  key={s} 
                  onClick={() => setSymbolType(s as any)} 
                  className={`px-3 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all border ${symbolType === s ? 'bg-sky-500 border-sky-400 text-black' : 'bg-transparent border-transparent text-slate-500 hover:text-white hover:bg-white/5'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {activeTool === 'MOVE' && (
            <button
              onClick={handleSaveStructures}
              disabled={isSaving}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center gap-3 animate-pulse"
            >
              <Save className="w-4 h-4" /> {isSaving ? 'Sincronizando...' : 'Commit Architecture'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-white/5 p-6 flex flex-col gap-8 bg-black/40 backdrop-blur-xl shrink-0 overflow-y-auto custom-scrollbar">
          {site.description && (
            <div className="space-y-3">
              <h4 className="text-[9px] font-black text-sky-500 uppercase tracking-[0.3em] italic flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgb(14,165,233)]" /> 
                Operational Intelligence
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium italic border-l-2 border-sky-500/20 pl-4 py-1">
                {site.description}
              </p>
            </div>
          )}

          <div className="p-6 bg-gradient-to-br from-white/[0.03] to-transparent rounded-[32px] border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-sky-500 group-hover:bg-sky-400 transition-colors" />
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <Activity className="w-3 h-3 text-sky-500" /> Terrain Analytics
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase">Master Surface</span>
                <span className="text-lg font-black text-white italic tracking-tighter">
                  {((site.width || 0) * (site.length || 0)).toLocaleString()} <span className="text-[10px] text-sky-500 not-italic ml-1">M²</span>
                </span>
              </div>
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase">Boundary Perimeter</span>
                <span className="text-lg font-black text-slate-200 italic tracking-tighter">
                  {(2 * ((site.width || 0) + (site.length || 0))).toLocaleString()} <span className="text-[10px] text-slate-500 not-italic ml-1">M</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] px-2 italic flex items-center gap-2">
               Infrastructure Portfolio
               <span className="text-[8px] bg-sky-500/10 text-sky-500 px-1.5 rounded border border-sky-500/20 ml-auto">{structures.length}</span>
            </h3>
            <div className="space-y-2.5">
              {structures.map(st => (
                <div 
                  key={st.id} 
                  onClick={() => onStructureSelect(st.id, st.name)} 
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-sky-500/5 hover:border-sky-500/30 transition-all group text-left relative overflow-hidden cursor-pointer"
                >
                  <div className="p-2.5 bg-sky-500/10 rounded-xl border border-sky-500/10 group-hover:bg-sky-500 group-hover:text-black transition-all">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <p className="text-[11px] font-black text-white uppercase tracking-wider truncate">{st.name}</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 group-hover:text-sky-400 transition-colors">Launch Physical Layer</p>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    {isAdmin && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const result = await Swal.fire({
                            title: '¿Eliminar Edificio?',
                            text: `Esta acción no se puede deshacer. Se verificará que el edificio esté vacío.`,
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#ef4444',
                            cancelButtonColor: 'rgba(255,255,255,0.05)',
                            confirmButtonText: 'ELIMINAR',
                            background: '#020617',
                            color: '#fff'
                          });

                          if (result.isConfirmed) {
                            const res = await fetch(`/appm-ems/api/structures/?id=${st.id}`, { method: 'DELETE' });
                            const data = await res.json();
                            if (data.ok) {
                              Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Edificio eliminado', showConfirmButton: false, timer: 2000, background: '#020617', color: '#fff' });
                              fetchSiteData();
                            } else {
                              Swal.fire({ icon: 'error', title: 'Error de Eliminación', text: data.error, background: '#020617', color: '#fff' });
                            }
                          }
                        }}
                        className="p-2 hover:bg-rose-500/10 rounded-lg group/trash transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-slate-700 group-hover/trash:text-rose-500" />
                      </button>
                    )}
                    <ArrowRight className="w-4 h-4 text-slate-700 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
              {structures.length === 0 && (
                <div className="p-10 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-3xl opacity-40">
                  <div className="p-4 bg-white/5 rounded-full w-fit mx-auto mb-4">
                    <Layers className="w-6 h-6 text-slate-600" />
                  </div>
                  <p className="text-[8px] font-black text-slate-500 uppercase italic tracking-widest">Terrain Unpopulated</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 relative flex items-center justify-center bg-[#01040a] min-h-0 min-w-0">
          <div className="flex-1 w-full h-full relative shadow-2xl border border-white/5 rounded-[40px] overflow-hidden">
            {(() => {
              // Site dimensions in cm
              const siteW = (site.width || 100) * 100;
              const siteH = (site.length || 100) * 100;
              
              // Base perimeter (rect)
              const sitePerimeter = JSON.stringify([
                { x: 0, y: 0 }, { x: siteW, y: 0 }, { x: siteW, y: siteH }, { x: 0, y: siteH }
              ]);

              // Calculate global bounds for all structures to auto-fit
              let minX = 0, minY = 0, maxX = siteW, maxY = siteH;
              if (structures.length > 0) {
                const allPoints = structures.flatMap(s => JSON.parse(s.perimeter || '[]'));
                if (allPoints.length > 0) {
                  const xs = allPoints.map(p => p.x);
                  const ys = allPoints.map(p => p.y);
                  minX = Math.min(minX, ...xs) - 200;
                  minY = Math.min(minY, ...ys) - 200;
                  maxX = Math.max(maxX, ...xs) + 200;
                  maxY = Math.max(maxY, ...ys) + 200;
                }
              }

              return (
                <TechnicalBlueprintEngine
                  widthCm={maxX - minX}
                  heightCm={maxY - minY}
                  viewBoxX={minX}
                  viewBoxY={minY}
                  perimeter={sitePerimeter}
                  showGrid={true}
                  gridSize={200}
                  isEditable={isDrafting}
                  activeTool={activeTool}
                  stampSize={symbolType === 'COLUMN' ? { w: 50, h: 50 } : (symbolType === 'DOOR' ? { w: 100, h: 10 } : (symbolType === 'HVAC' ? { w: 80, h: 80 } : { w: 120, h: 10 }))}
                  elements={allVisualElements}
                  onDrawingComplete={handleDrawingComplete}
                  onElementAdded={handleElementAdded}
                  onElementUpdated={handleElementUpdated}
                  className="w-full h-full"
                />
              );
            })()}
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
