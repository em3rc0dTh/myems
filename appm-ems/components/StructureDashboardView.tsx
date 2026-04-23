"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Save, MousePointer2, PenTool, DoorOpen, Activity, Info, ChevronRight, MapPin, Ruler, Trash2, Plus, X, Layers, RotateCcw } from 'lucide-react';
import TechnicalBlueprintEngine from './TechnicalBlueprintEngine';
import { useAuth } from '@/lib/AuthContext';
import Swal from 'sweetalert2';

interface StructureDashboardViewProps {
  structureId: string;
  onRoomSelect: (id: string, name?: string) => void;
  siteDimensions: { width?: number; length?: number };
}

export default function StructureDashboardView({ structureId, onRoomSelect, siteDimensions }: StructureDashboardViewProps) {
  const { isAdmin } = useAuth();
  const [structure, setStructure] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isDrafting, setIsDrafting] = useState(false);
  const [localElements, setLocalElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [namingModal, setNamingModal] = useState<{ isOpen: boolean, points: any[] }>({ isOpen: false, points: [] });
  const [newRoomName, setNewRoomName] = useState("");
  const [activeTool, setActiveTool] = useState<'POLYGON' | 'MOVE' | 'REFERENCE_SYMBOL'>('POLYGON');
  const [symbolType, setSymbolType] = useState<'DOOR' | 'COLUMN' | 'WINDOW' | 'PANEL' | 'HVAC' | 'SECURITY'>('DOOR');
  const [symbolRotation, setSymbolRotation] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);

  const [activeLevelId, setActiveLevelId] = useState<string | null>(null);
  const [activeLevelData, setActiveLevelData] = useState<any>(null);

  useEffect(() => {
    if (structureId) {
      fetchStructureData();
    }
  }, [structureId]);

  const fetchStructureData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/appm-ems/api/structures/?id=${structureId}&t=${Date.now()}`);
      const data = await res.json();
      const obj = Array.isArray(data.data) ? data.data[0] : data.data;
      if (obj) {
        setStructure(obj);

        // Handle Level selection
        const levels = obj.levels || [];
        const currentLevel = levels.find((l: any) => l.id === activeLevelId) || levels[0];

        if (currentLevel) {
          setActiveLevelId(currentLevel.id);
          setActiveLevelData(currentLevel);
          setRooms(currentLevel.rooms || []);
        } else {
          setActiveLevelId(null);
          setActiveLevelData(null);
          setRooms([]);
        }

        if (obj.spatialMetadata) {
          try {
            const sm = typeof obj.spatialMetadata === 'string' ? JSON.parse(obj.spatialMetadata) : obj.spatialMetadata;
            if (sm.references) setLocalElements(prev => [...prev.filter(el => el.type !== 'REFERENCE'), ...(sm.references || [])]);
          } catch (e) { }
        }
      }
    } catch (e) {
      console.error("Error loading building data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDrawingComplete = (points: any[]) => {
    setNamingModal({ isOpen: true, points });
    setNewRoomName(`ROOM-${Date.now().toString().slice(-4)}`);
  };

  const confirmRoomNaming = () => {
    if (!newRoomName) return;
    setLocalElements([{
      id: `draft-${Date.now()}`,
      type: 'POLYGON',
      label: newRoomName,
      points: namingModal.points,
      color: 'rgba(59, 130, 246, 0.4)'
    }]);
    setNamingModal({ isOpen: false, points: [] });
    setNewRoomName("");
    setActiveTool('MOVE');
  };

  const handleElementAdded = (newEl: any) => {
    setLocalElements(prev => [...prev, { ...newEl, symbol: symbolType }]);
  };

  const handleElementUpdated = (updatedEl: any) => {
    setLocalElements(prev => prev.map(el => el.id === updatedEl.id ? updatedEl : el));
  };

  const handleSaveRooms = async () => {
    const polygons = localElements.filter(el => el.type === 'POLYGON');
    if (polygons.length === 0 && localElements.filter(el => el.type === 'REFERENCE').length === 0) return;

    setIsSaving(true);
    try {
      let currentLevelId = activeLevelId;

      // If no levels exist, create Level 1
      if (!currentLevelId) {
        const lRes = await fetch('/appm-ems/api/levels/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: "Level 1", structureId })
        });
        const lData = await lRes.json();
        if (lRes.ok && lData.ok) {
          currentLevelId = lData.data.id;
          setActiveLevelId(currentLevelId);
        } else {
          throw new Error("Could not create initial level");
        }
      }

      for (const poly of polygons) {
        const res = await fetch('/appm-ems/api/substructures/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: poly.label,
            levelId: currentLevelId,
            perimeter: JSON.stringify(poly.points),
            spatialMetadata: JSON.stringify({ metric: 'cm', timestamp: Date.now() })
          })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.details || data.error);
      }

      // PERSIST REFERENCE ICONS TO STRUCTURE (Site Map)
      const refs = localElements.filter(el => el.type === 'REFERENCE');
      const existingMetadata = structure.spatialMetadata ? (typeof structure.spatialMetadata === 'string' ? JSON.parse(structure.spatialMetadata) : structure.spatialMetadata) : {};

      await fetch(`/appm-ems/api/structures/?id=${structureId}`, {
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
      fetchStructureData();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const allVisualElements = useMemo(() => {
    return [
      ...rooms.map((r, idx) => ({
        id: r.id,
        type: 'POLYGON' as const,
        label: `${idx + 1}`,
        points: JSON.parse(r.perimeter || '[]'),
        isLocked: true,
        isHovered: hoveredRoomId === r.id,
        color: hoveredRoomId === r.id ? 'rgba(56, 189, 248, 0.4)' : 'rgba(56, 189, 248, 0.15)'
      })),
      ...localElements
    ];
  }, [rooms, localElements, hoveredRoomId]);

  if (loading || !structure) return <div className="p-20 text-center animate-pulse text-blue-500 font-black uppercase tracking-widest text-[10px]">Scanning Building...</div>;

  const buildingPoints = JSON.parse(structure.perimeter || '[]');
  const xs = buildingPoints.length > 0 ? buildingPoints.map((p: any) => p.x) : [0, 2000];
  const ys = buildingPoints.length > 0 ? buildingPoints.map((p: any) => p.y) : [0, 2000];
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  const canvasWidth = Math.max(1000, (maxX - minX) + 200);
  const canvasHeight = Math.max(1000, (maxY - minY) + 200);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#020617] font-sans">
      <div className="h-14 border-b border-white/5 bg-black/40 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20"><Layout className="w-4 h-4 text-blue-400" /></div>
          <div>
            <h2 className="text-[10px] font-black uppercase text-white leading-none tracking-widest">{structure.name}</h2>
            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest italic">Substructure Engineering</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
              <button
                onClick={() => { setIsDrafting(false); setActiveTool('POLYGON'); }}
                className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${!isDrafting ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Inspect
              </button>
              <button
                onClick={() => { setIsDrafting(true); setActiveTool('POLYGON'); }}
                className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${isDrafting && activeTool === 'POLYGON' ? 'bg-amber-500 text-black' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Draw Room
              </button>
              <button
                onClick={() => { setIsDrafting(true); setActiveTool('REFERENCE_SYMBOL'); }}
                className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${isDrafting && activeTool === 'REFERENCE_SYMBOL' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Add Icon
              </button>
            </div>
          )}

          {isDrafting && activeTool === 'REFERENCE_SYMBOL' && (
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/5 gap-1 mr-4">
              {['DOOR', 'COLUMN', 'WINDOW', 'PANEL', 'HVAC', 'SECURITY'].map(s => (
                <button key={s} onClick={() => setSymbolType(s as any)} className={`px-2 py-1 text-[7px] font-black uppercase rounded-md transition-all ${symbolType === s ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>{s}</button>
              ))}
            </div>
          )}

          {activeTool === 'MOVE' && (
            <button
              onClick={handleSaveRooms}
              className="px-4 py-1.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all border border-blue-400/30"
            >
              {isSaving ? 'Saving...' : 'Finalizar Perímetro'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
        {/* HIGH-FIDELITY SIDEBAR */}
        <div className="w-80 border-r border-white/5 p-6 flex flex-col gap-8 bg-black/40 backdrop-blur-xl shrink-0 overflow-y-auto custom-scrollbar">
          {/* TERRAIN ANALYTICS (Site Level Awareness) */}
          <div className="p-6 bg-gradient-to-br from-white/[0.03] to-transparent rounded-[32px] border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-sky-500 group-hover:bg-sky-400 transition-colors" />
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <Activity className="w-3 h-3 text-sky-500" /> Terrain Analytics
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase">Master Surface</span>
                <span className="text-lg font-black text-white italic tracking-tighter">
                  {((siteDimensions?.width || 0) * (siteDimensions?.length || 0)).toLocaleString()} <span className="text-[10px] text-sky-500 not-italic ml-1">M²</span>
                </span>
              </div>
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase">Boundary Perimeter</span>
                <span className="text-lg font-black text-white italic tracking-tighter">
                  {(2 * ((siteDimensions?.width || 0) + (siteDimensions?.length || 0))).toLocaleString()} <span className="text-[10px] text-slate-500 not-italic ml-1">M</span>
                </span>
              </div>
            </div>
          </div>

          {/* LEVEL MANAGEMENT (Building Stack) */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] px-2 italic flex items-center gap-2">
              Building Vertical Stack
              <span className="text-[8px] bg-blue-500/10 text-blue-500 px-1.5 rounded border border-blue-500/20 ml-auto">{(structure.levels || []).length} Floors</span>
            </h3>

            <div className="flex flex-col gap-2">
              {(structure.levels || []).slice().sort((a: any, b: any) => {
                // Sort logic: Higher floors top, basements bottom
                const getNum = (name: string) => {
                  const m = name.match(/-?\d+/);
                  return m ? parseInt(m[0]) : 0;
                };
                return getNum(b.name) - getNum(a.name);
              }).map((level: any) => (
                <div
                  key={level.id}
                  className={`group flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${activeLevelId === level.id ? 'bg-blue-500/10 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
                  onClick={() => {
                    setActiveLevelId(level.id);
                    setActiveLevelData(level);
                    setRooms(level.rooms || []);
                  }}
                >
                  <div className={`p-2 rounded-xl border transition-all ${activeLevelId === level.id ? 'bg-blue-500 border-blue-400 text-black shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[10px] font-black uppercase tracking-wider ${activeLevelId === level.id ? 'text-white' : 'text-slate-400'}`}>{level.name}</p>
                    <p className="text-[7px] text-slate-600 font-bold uppercase tracking-widest">{level.rooms?.length || 0} Units Mapped</p>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const result = await Swal.fire({
                          title: '¿Eliminar Nivel?',
                          text: 'Se verificará que no tenga salas asignadas.',
                          icon: 'warning',
                          showCancelButton: true,
                          confirmButtonColor: '#ef4444',
                          confirmButtonText: 'ELIMINAR',
                          background: '#020617',
                          color: '#fff'
                        });

                        if (result.isConfirmed) {
                          const res = await fetch(`/appm-ems/api/levels/?id=${level.id}`, { method: 'DELETE' });
                          const data = await res.json();
                          if (data.ok) {
                            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Nivel eliminado', showConfirmButton: false, timer: 2000, background: '#020617', color: '#fff' });
                            fetchStructureData();
                          } else {
                            Swal.fire({ icon: 'error', title: 'Error', text: data.error, background: '#020617', color: '#fff' });
                          }
                        }
                      }}
                      className="p-2 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-rose-500" />
                    </button>
                  )}
                </div>
              ))}

              {isAdmin && (
                <button
                  onClick={async () => {
                    const { value: levelName } = await Swal.fire({
                      title: 'ADD NEW FLOOR',
                      input: 'text',
                      inputLabel: 'Nombre del Nivel (Ej: Piso 2, Sótano -1)',
                      inputPlaceholder: 'Piso X',
                      showCancelButton: true,
                      background: '#020617',
                      color: '#fff',
                      confirmButtonColor: '#3b82f6',
                      customClass: {
                        input: 'bg-black/50 border-white/10 text-white rounded-xl'
                      }
                    });

                    if (levelName) {
                      const res = await fetch('/appm-ems/api/levels/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: levelName, structureId })
                      });
                      if (res.ok) {
                        fetchStructureData();
                      }
                    }
                  }}
                  className="w-full flex items-center justify-center gap-3 p-3 rounded-2xl border border-dashed border-white/10 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group"
                >
                  <div className="p-1.5 bg-white/5 rounded-lg text-slate-600 group-hover:text-blue-400 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-blue-400">Add Higher/Lower Floor</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] px-2 italic flex items-center gap-2">
              Building Substructures
              <span className="text-[8px] bg-sky-500/10 text-sky-500 px-1.5 rounded border border-sky-500/20 ml-auto">{rooms.length} Units</span>
            </h3>
            <div className="space-y-2">
              {rooms.map((r, idx) => (
                <div
                  key={r.id}
                  onMouseEnter={() => setHoveredRoomId(r.id)}
                  onMouseLeave={() => setHoveredRoomId(null)}
                  onClick={() => onRoomSelect(r.id, r.name)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group cursor-pointer ${hoveredRoomId === r.id ? 'bg-sky-500/10 border-sky-500/40 shadow-xl shadow-sky-500/5' : 'bg-white/[0.02] border-white/5 hover:bg-sky-500/5 hover:border-sky-500/20'}`}
                >
                  <div className={`p-2 rounded-xl border transition-all ${hoveredRoomId === r.id ? 'bg-sky-500 border-sky-400 text-black' : 'bg-sky-500/10 border-sky-500/20 text-sky-400'}`}>
                    <span className="text-[11px] font-black">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[11px] font-black text-white uppercase tracking-tight italic group-hover:text-sky-400 transition-colors truncate">{r.name}</h4>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Physical Namespace</p>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    {isAdmin && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const result = await Swal.fire({
                            title: '¿Eliminar Sala?',
                            text: `Se verificará que la sala no tenga racks o bahías instaladas.`,
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#ef4444',
                            cancelButtonColor: 'rgba(255,255,255,0.05)',
                            confirmButtonText: 'ELIMINAR',
                            background: '#020617',
                            color: '#fff'
                          });

                          if (result.isConfirmed) {
                            const res = await fetch(`/appm-ems/api/substructures/?id=${r.id}`, { method: 'DELETE' });
                            const data = await res.json();
                            if (data.ok) {
                              Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Sala eliminada', showConfirmButton: false, timer: 2000, background: '#020617', color: '#fff' });
                              fetchStructureData();
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
                    <ChevronRight className={`w-3 h-3 transition-all group-hover:translate-x-1 ${hoveredRoomId === r.id ? 'text-sky-400' : 'text-slate-700'}`} />
                  </div>
                </div>
              ))}
              {rooms.length === 0 && (
                <div className="p-10 text-center border border-dashed border-white/5 rounded-[32px] opacity-20">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic text-center">Engineered Void</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CANVAS CON MEJOR ESCALA */}
        <div className="flex-1 bg-[#01040a] relative overflow-hidden flex items-center justify-center p-8 min-h-0 min-w-0">
          <div
            className="flex-1 w-full h-full relative shadow-[0_0_100px_rgba(30,58,138,0.1)] rounded-[40px] border border-white/5 bg-slate-900/40 p-1"
          >
            <TechnicalBlueprintEngine
              widthCm={Math.max(maxX - minX + 1000, 3000)}
              heightCm={Math.max(maxY - minY + 1000, 3000)}
              viewBoxX={minX - 500}
              viewBoxY={minY - 500}
              perimeter={structure.perimeter}
              showGrid={true}
              gridSize={80}
              isEditable={isDrafting}
              activeTool={activeTool}
              stampSize={symbolType === 'COLUMN' ? { w: 50, h: 50 } : (symbolType === 'DOOR' ? { w: 100, h: 10 } : (symbolType === 'HVAC' ? { w: 80, h: 80 } : { w: 120, h: 10 }))}
              elements={allVisualElements}
              onDrawingComplete={handleDrawingComplete}
              onElementAdded={handleElementAdded}
              onElementUpdated={handleElementUpdated}
              onElementHover={setHoveredRoomId}
              onElementClick={(id) => {
                const r = rooms.find(rm => rm.id === id);
                if (r) onRoomSelect(r.id, r.name);
              }}
              className="w-full h-full"
            />

            {namingModal.isOpen && (
              <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
                <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-blue-500/20 rounded-2xl"><DoorOpen className="w-6 h-6 text-blue-500" /></div>
                    <h3 className="text-lg font-black uppercase text-white leading-none">Identify Room</h3>
                  </div>
                  <input autoFocus value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none mb-8" placeholder="Room Name..." />
                  <div className="flex gap-3">
                    <button onClick={() => setNamingModal({ isOpen: false, points: [] })} className="flex-1 px-4 py-3 bg-white/5 text-white text-[9px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                    <button onClick={confirmRoomNaming} className="flex-1 px-4 py-3 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl">Confirm</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
