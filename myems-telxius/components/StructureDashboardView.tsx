"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Save, MousePointer2, PenTool, DoorOpen } from 'lucide-react';
import TechnicalBlueprintEngine from './TechnicalBlueprintEngine';

interface StructureDashboardViewProps {
  structureId: string;
  onRoomSelect: (id: string) => void;
}

export default function StructureDashboardView({ structureId, onRoomSelect }: StructureDashboardViewProps) {
  const [structure, setStructure] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isDrafting, setIsDrafting] = useState(false);
  const [localElements, setLocalElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [namingModal, setNamingModal] = useState<{ isOpen: boolean, points: any[] }>({ isOpen: false, points: [] });
  const [newRoomName, setNewRoomName] = useState("");
  const [activeTool, setActiveTool] = useState<'POLYGON' | 'MOVE'>('POLYGON');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (structureId) {
      fetchStructureData();
    }
  }, [structureId]);

  const fetchStructureData = async () => {
    setLoading(true);
    try {
      console.log("FETCH: Loading Structure Data for:", structureId);
      const res = await fetch(`/telxius/api/structures/?id=${structureId}&t=${Date.now()}`);
      const data = await res.json();
      console.log("FETCH: API Raw Response:", data);
      
      const obj = Array.isArray(data.data) ? data.data[0] : data.data;
      if (obj) {
        setStructure(obj);
        // Robust room extraction: Flatten rooms from ALL levels
        const allRooms = (obj.levels || []).flatMap((level: any) => level.rooms || []);
        console.log("FETCH: Flattened Rooms discovered:", allRooms.length);
        setRooms(allRooms);
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

  const handleElementUpdated = (updatedEl: any) => {
    setLocalElements(prev => prev.map(el => el.id === updatedEl.id ? updatedEl : el));
  };

  const handleSaveRooms = async () => {
    const polygons = localElements.filter(el => el.type === 'POLYGON');
    if (polygons.length === 0) return;

    setIsSaving(true);
    try {
      let levelId = structure.levels?.[0]?.id;
      if (!levelId) {
        const lRes = await fetch('/telxius/api/levels/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: "PISO 1", structureId: structureId })
        });
        const lData = await lRes.json();
        levelId = lData.data.id;
      }

      for (const poly of polygons) {
        const xs = poly.points.map((p: any) => p.x);
        const ys = poly.points.map((p: any) => p.y);
        const width = (Math.max(...xs) - Math.min(...xs)) / 100;
        const length = (Math.max(...ys) - Math.min(...ys)) / 100;
        
        await fetch('/telxius/api/substructures/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: poly.label,
            levelId: levelId,
            perimeter: JSON.stringify(poly.points),
            type: "ROOM",
            width, length, area: width * length,
            spatialMetadata: JSON.stringify({ metric: 'cm', timestamp: Date.now() })
          })
        });
      }
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

  const allVisualElements = [
    ...rooms.map(r => ({
      id: r.id,
      type: 'POLYGON' as const,
      label: r.name,
      points: JSON.parse(r.perimeter || '[]'),
      isLocked: true
    })),
    ...localElements
  ];

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
          </div>

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

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR MÁS COMPACTO */}
        <div className="w-64 border-r border-white/5 p-4 space-y-4 bg-black/20">
            <h3 className="text-[7px] font-black text-slate-600 uppercase tracking-[0.2em] px-2 italic">Rooms in this Building</h3>
            <div className="space-y-1.5">
              {rooms.map(r => (
                <button key={r.id} onClick={() => onRoomSelect(r.id)} className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/5 transition-all text-left group">
                  <div className="p-1.5 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                    <DoorOpen className="w-3 h-3 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-white uppercase tracking-tight">{r.name}</p>
                    <p className="text-[7px] text-slate-500 font-bold uppercase tracking-tighter">Enter Room</p>
                  </div>
                </button>
              ))}
              {rooms.length === 0 && <div className="p-6 text-center border border-dashed border-white/5 rounded-2xl opacity-30"><p className="text-[7px] font-bold text-slate-500 uppercase">Empty Building</p></div>}
            </div>
        </div>

        {/* CANVAS CON MEJOR ESCALA */}
        <div className="flex-1 bg-[#01040a] relative overflow-hidden flex items-center justify-center p-8">
          <div 
            className="relative shadow-[0_0_100px_rgba(30,58,138,0.1)] rounded-[40px] border border-white/5 bg-slate-900/40 p-4 transition-all duration-700 ease-in-out"
            style={{ 
              width: '100%', 
              height: '100%',
              maxWidth: `${canvasWidth}px`,
              maxHeight: `${canvasHeight}px`,
              aspectRatio: `${canvasWidth} / ${canvasHeight}`
            }}
          >
            <TechnicalBlueprintEngine 
              widthCm={canvasWidth}
              heightCm={canvasHeight}
              viewBoxX={minX - 100}
              viewBoxY={minY - 100}
              perimeter={structure.perimeter}
              showGrid={true}
              gridSize={80}
              isEditable={isDrafting}
              activeTool={activeTool}
              elements={allVisualElements}
              onDrawingComplete={handleDrawingComplete}
              onElementUpdated={handleElementUpdated}
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
