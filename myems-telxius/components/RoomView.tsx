"use client"
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Substructure, Position } from '@/lib/types';
import { ChevronRight, Globe, MousePointer2, Layers, Cpu, CheckCircle2, AlertTriangle, Activity, Save, Trash2, Maximize2, MoveRight } from 'lucide-react';
import Swal from 'sweetalert2';
import RackElevationManager from './RackElevationManager';

interface RoomViewProps {
  substructureId: string;
  onSelectBDFB?: (id: string | null) => void;
}

const RoomView: React.FC<RoomViewProps> = ({ substructureId, onSelectBDFB }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [substructure, setSubstructure] = useState<any | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<any | null>(null);
  
  // DRAWING ENGINE STATE
  const [isDrafting, setIsDrafting] = useState(false);
  const [activeTool, setActiveTool] = useState<'POLYGON' | 'CLUSTER_STAMP' | 'BAY_DRAFTING'>('CLUSTER_STAMP');
  const [stampSize, setStampSize] = useState({ w: 60, h: 60 });
  const [containerType, setContainerType] = useState<'RACK' | 'CABINET'>('RACK');
  const [uCapacity, setUCapacity] = useState(42);
  const [customSize, setCustomSize] = useState({ w: 60, h: 60 });
  const [localElements, setLocalElements] = useState<any[]>([]);
  const [activePoints, setActivePoints] = useState<any[]>([]);
  const [localRacks, setLocalRacks] = useState<any[]>([]);
  const [persistedRows, setPersistedRows] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const TILE_SIZE = 60; 

  const PRESET_SIZES = [
    { label: '60x60', w: 60, h: 60 },
    { label: '60x90', w: 60, h: 90 },
    { label: '30x60', w: 30, h: 60 },
    { label: '30x90', w: 30, h: 90 },
  ];

  useEffect(() => {
    const fetchRoomData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/telxius/api/substructures/?id=${substructureId}&t=${Date.now()}`);
        const data = await res.json();
        const obj = Array.isArray(data.data) ? data.data[0] : data.data;
        if (obj) {
          setSubstructure(obj);
          if (obj.spatialMetadata) {
            try {
              const sm = typeof obj.spatialMetadata === 'string' ? JSON.parse(obj.spatialMetadata) : obj.spatialMetadata;
              if (sm.clusters) setLocalElements(sm.clusters);
            } catch (e) {}
          }
          if (obj.racks) setLocalRacks(obj.racks);
          
          const pRes = await fetch(`/telxius/api/positions/?substructureId=${substructureId}`);
          const pData = await pRes.json();
          setPositions(pData.data || []);

          const rRes = await fetch(`/telxius/api/rows/?substructureId=${substructureId}`);
          const rData = await rRes.json();
          setPersistedRows(rData.data || []);
        }
      } catch (e) {
        console.error("Error loading room engine", e);
      } finally {
        setLoading(false);
        setIsMounted(true);
      }
    };
    if (substructureId) fetchRoomData();
  }, [substructureId]);

  const resolveValue = (v: any) => {
    if (v && typeof v === 'object') {
      if ('$numberLong' in v) return parseInt(v.$numberLong);
      if ('$oid' in v) return v.$oid;
    }
    return v;
  };

  const getID = (obj: any) => {
    if (!obj) return null;
    return resolveValue(obj.id) || resolveValue(obj._id);
  };

  const getSvgCoords = (e: React.MouseEvent) => {
    if (!svgRef.current) return null;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const transformed = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { 
      x: Math.round(transformed.x / 10) * 10, 
      y: Math.round(transformed.y / 10) * 10 
    };
  };

  const handleSvgClick = (e: React.MouseEvent) => {
    if (!isDrafting) return;
    const coords = getSvgCoords(e);
    if (!coords) return;

    if (activeTool === 'CLUSTER_STAMP') {
      const w = stampSize.w;
      const h = stampSize.h;
      
      const allBays = [
        ...persistedRows.map(r => ({ ...r, points: JSON.parse(r.spatialMetadata).points || [
          {x: JSON.parse(r.spatialMetadata).x, y: JSON.parse(r.spatialMetadata).y},
          {x: JSON.parse(r.spatialMetadata).x + JSON.parse(r.spatialMetadata).w, y: JSON.parse(r.spatialMetadata).y},
          {x: JSON.parse(r.spatialMetadata).x + JSON.parse(r.spatialMetadata).w, y: JSON.parse(r.spatialMetadata).y + JSON.parse(r.spatialMetadata).h},
          {x: JSON.parse(r.spatialMetadata).x, y: JSON.parse(r.spatialMetadata).y + JSON.parse(r.spatialMetadata).h}
        ]})),
        ...localElements.filter(el => el.type === 'BAY')
      ];

      const targetBay = allBays.find(bay => {
        const sm = bay.points ? {
          x: bay.points[0].x,
          y: bay.points[0].y,
          w: bay.points[2].x - bay.points[0].x,
          h: bay.points[2].y - bay.points[0].y
        } : (typeof bay.spatialMetadata === 'string' ? JSON.parse(bay.spatialMetadata) : bay.spatialMetadata);

        // Normalizar los límites de la bahía para comparar con el click local
        const nx = sm.x - bounds.minX;
        const ny = sm.y - bounds.minY;

        // RULE: Click MUST be inside the bay's local vertical slice initially.
        return (coords.x >= nx && coords.x + w <= nx + sm.w && coords.y >= ny && coords.y <= ny + sm.h);
      });

      if (!targetBay) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'warning',
          title: 'Fuera de Límites',
          text: 'El rack debe estar dentro de una bahía.',
          showConfirmButton: false,
          timer: 3000,
          background: '#020617',
          color: '#fff'
        });
        return;
      }

      const baySM = targetBay.points ? {
        x: targetBay.points[0].x,
        y: targetBay.points[0].y,
        w: targetBay.points[2].x - targetBay.points[0].x,
        h: targetBay.points[2].y - targetBay.points[0].y
      } : (typeof targetBay.spatialMetadata === 'string' ? JSON.parse(targetBay.spatialMetadata) : targetBay.spatialMetadata);

      // Normalizar Y para el iman (magnetize)
      const finalY = baySM.y - bounds.minY;

      // RULE 2: No Overlap
      const currentDraftRacks = localElements.filter(el => el.type === 'ZONE');
      const hasOverlap = currentDraftRacks.some(r => {
        const rx = r.points[0].x;
        const ry = r.points[0].y;
        const rw = r.points[1].x - rx;
        const rh = r.points[3].y - ry;
        return (coords.x < rx + rw && coords.x + w > rx && finalY < ry + rh && finalY + h > ry);
      });

      if (hasOverlap) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'error',
          title: 'SolapamientoDetectado',
          text: 'No se pueden superponer los racks.',
          showConfirmButton: false,
          timer: 3000,
          background: '#020617',
          color: '#fff'
        });
        return;
      }

      const newEl = {
        id: `rack-${Date.now()}`,
        type: 'ZONE',
        cType: containerType,
        uCapacity: uCapacity,
        label: `${containerType} ${localElements.filter(x => x.type === 'ZONE').length + 1}`,
        points: [
          { x: coords.x, y: finalY },
          { x: coords.x + w, y: finalY },
          { x: coords.x + w, y: finalY + h },
          { x: coords.x, y: finalY + h }
        ]
      };
      setLocalElements(prev => [...prev, newEl]);
    } else if (activeTool === 'BAY_DRAFTING') {
      if (activePoints.length === 1) {
        const p1 = activePoints[0];
        const p2 = coords;
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);
        const w = Math.max(TILE_SIZE, Math.abs(p1.x - p2.x));
        const h = Math.max(TILE_SIZE, Math.abs(p1.y - p2.y));
        setLocalElements(prev => [...prev, { id: `bay-${Date.now()}`, type: 'BAY', label: `BAY ${prev.filter(x => x.type === 'BAY').length + 1}`, points: [{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}] }]);
        setActivePoints([]);
      } else {
        setActivePoints([coords]);
      }
    }
  };

  const handleSaveEngineering = async () => {
    const roomId = getID(substructure);
    if (!roomId) return;
    setIsSaving(true);
    try {
      const bays = localElements.filter(el => el.type === 'BAY');
      const racks = localElements.filter(el => el.type === 'ZONE');
      const savedRows = [];
      for (const bay of bays) {
        // Des-normalizar para guardar en coordenadas absolutas
        const x = bay.points[0].x + bounds.minX;
        const y = bay.points[0].y + bounds.minY;
        const w = bay.points[2].x - bay.points[0].x;
        const h = bay.points[2].y - bay.points[0].y;
        
        const res = await fetch('/telxius/api/rows/', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
            name: bay.label, 
            substructureId: roomId, 
            spatialMetadata: JSON.stringify({ x, y, w, h, metric: 'cm' }) 
          }) 
        });
        if (res.ok) { const data = await res.json(); savedRows.push({ ...data.data, localId: bay.id }); }
      }
      
      const newPersistedRacks = [];
      for (const rack of racks) {
        // Des-normalizar para guardar en coordenadas absolutas
        const x = rack.points[0].x + bounds.minX;
        const y = rack.points[0].y + bounds.minY;
        const w = rack.points[2].x - rack.points[0].x;
        const h = rack.points[2].y - rack.points[0].y;
        
        const parentRow = savedRows.find(r => { 
          const sm = JSON.parse(r.spatialMetadata); 
          return (x >= sm.x && x + w <= sm.x + sm.w && y >= sm.y && y + h <= sm.y + sm.h); 
        });
        
        const res = await fetch('/telxius/api/containers/', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
            name: rack.label, 
            substructureId: roomId, 
            rowId: parentRow ? parentRow.id : null, 
            row: parentRow ? parentRow.name : "A", 
            position: Math.floor((x - bounds.minX) / TILE_SIZE), 
            type: rack.cType || 'RACK', 
            width: w, 
            depth: h, 
            uCapacity: rack.uCapacity || 42, 
            spatialMetadata: JSON.stringify({ x, y, w, h, uCapacity: rack.uCapacity || 42, metric: 'cm' }) 
          }) 
        });
        if (res.ok) { const data = await res.json(); newPersistedRacks.push(data.data); }
      }
      setLocalRacks(prev => [...prev, ...newPersistedRacks]);
      setLocalElements([]);
      const rRes = await fetch(`/telxius/api/rows/?substructureId=${substructureId}`);
      const rData = await rRes.json();
      setPersistedRows(rData.data || []);
      
      Swal.fire({
        icon: 'success',
        title: 'Sincronización Exitosa',
        html: `Se han persistido <b>${savedRows.length}</b> Bahías y <b>${newPersistedRacks.length}</b> Contenedores en MongoDB.`,
        background: '#020617',
        color: '#fff',
        confirmButtonColor: '#2563eb',
        backdrop: `rgba(0,0,0,0.8) backdrop-blur-sm`
      });
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const roomPoints = useMemo(() => {
    console.log("DEBUG: Processing Perimeter for Substructure:", substructure?.name, "Raw perimeter:", substructure?.perimeter);
    if (!substructure?.perimeter) {
      // Si no hay perímetro, intentamos generarlo desde width/length
      const w = (resolveValue(substructure?.width) || 12) * 100;
      const h = (resolveValue(substructure?.length) || 8) * 100;
      console.log("DEBUG: No perimeter found. Synthesizing rectangle:", w, "x", h);
      return [{x:0, y:0}, {x:w, y:0}, {x:w, y:h}, {x:0, y:h}];
    }
    try {
      const pts = JSON.parse(substructure.perimeter);
      if (Array.isArray(pts) && pts.length > 0) return pts;
      return null;
    } catch (e) {
      console.error("DEBUG: Failed to parse perimeter JSON", e);
      return null;
    }
  }, [substructure]);

  const bounds = useMemo(() => {
    if (!roomPoints || roomPoints.length === 0) return { minX: 0, minY: 0, w: 1200, h: 800 };
    const xs = roomPoints.map((p: any) => p.x);
    const ys = roomPoints.map((p: any) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return { minX, minY, w: maxX - minX, h: maxY - minY };
  }, [roomPoints]);

  const normalizedPointsString = useMemo(() => {
    if (!roomPoints) return "";
    return roomPoints.map((p: any) => `${p.x - bounds.minX},${p.y - bounds.minY}`).join(' ');
  }, [roomPoints, bounds]);

  const viewBox = `-100 -100 ${bounds.w + 200} ${bounds.h + 200}`;

  if (loading || !substructure) return <div className="flex-1 flex flex-col items-center justify-center bg-black"><Activity className="animate-spin text-blue-500 mb-4" /></div>;

  return (
    <div className="w-full h-full flex flex-col bg-[#020617] font-sans selection:bg-blue-500/30">
      <div className="h-24 px-8 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-2xl shrink-0 z-50">
        <div className="flex items-center gap-6">
           <div>
             <div className="flex items-center gap-2 text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">
               <Globe className="w-2.5 h-2.5" />
               <span>Infrastructure Digital Twin</span>
             </div>
             <h2 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">{resolveValue(substructure.name)}</h2>
           </div>

           {isDrafting && (
             <div className="flex items-center gap-3 ml-8 bg-white/5 p-1.5 rounded-2xl border border-white/5 animate-in zoom-in-95">
                {['CLUSTER_STAMP', 'BAY_DRAFTING'].map(t => (
                  <button key={t} onClick={() => setActiveTool(t as any)} className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${activeTool === t ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                    {t === 'CLUSTER_STAMP' ? 'Add Rack' : 'Define Bay'}
                  </button>
                ))}
             </div>
           )}
        </div>

        <div className="flex items-center gap-4">
          {isDrafting && activeTool === 'CLUSTER_STAMP' && (
             <div className="flex items-center gap-3 pr-4 border-r border-white/10">
               <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 gap-1 mr-2 items-center px-3">
                 <span className="text-[8px] font-black uppercase text-slate-500 mr-2">Capacity</span>
                 <input 
                    type="number" value={uCapacity} 
                    onChange={e => setUCapacity(Number(e.target.value))}
                    className="w-10 h-6 bg-white/5 border border-white/5 rounded text-[10px] text-center text-white font-black"
                 />
                 <span className="text-[8px] font-black uppercase text-slate-500 ml-1">U</span>
               </div>
               <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 gap-1 mr-2">
                 <button onClick={() => setContainerType('RACK')} className={`px-3 py-1 text-[8px] font-black uppercase rounded-lg transition-all ${containerType === 'RACK' ? 'bg-emerald-500 text-black' : 'text-slate-500'}`}>Rack</button>
                 <button onClick={() => setContainerType('CABINET')} className={`px-3 py-1 text-[8px] font-black uppercase rounded-lg transition-all ${containerType === 'CABINET' ? 'bg-slate-400 text-black' : 'text-slate-500'}`}>Cabinet</button>
               </div>
               {PRESET_SIZES.map(s => (
                 <button key={s.label} onClick={() => setStampSize({w: s.w, h: s.h})} className={`w-12 h-8 flex items-center justify-center text-[8px] font-bold border rounded-lg transition-all ${stampSize.w === s.w && stampSize.h === s.h ? 'border-amber-500 bg-amber-500/10 text-white' : 'border-white/10 text-slate-500'}`}>
                   {s.label}
                 </button>
               ))}
               <div className="flex gap-1 ml-2">
                  <input 
                    type="number" value={customSize.w} 
                    onChange={e => setCustomSize(prev => ({...prev, w: Math.min(120, Number(e.target.value))}))}
                    className="w-10 h-8 bg-black/40 border border-white/10 rounded-lg text-[9px] text-center text-white" 
                  />
                  <input 
                    type="number" value={customSize.h} 
                    onChange={e => setCustomSize(prev => ({...prev, h: Math.min(120, Number(e.target.value))}))}
                    className="w-10 h-8 bg-black/40 border border-white/10 rounded-lg text-[9px] text-center text-white" 
                  />
                  <button onClick={() => setStampSize(customSize)} className="w-8 h-8 flex items-center justify-center bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-[10px]">+</button>
               </div>
             </div>
          )}
          
          <button onClick={handleSaveEngineering} disabled={isSaving || localElements.length === 0} className="px-6 py-2.5 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl disabled:opacity-20 flex items-center gap-2">
            <Save className="w-3.5 h-3.5" /> {isSaving ? 'Syncing...' : 'Save Draft'}
          </button>
          <button onClick={() => setIsDrafting(!isDrafting)} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${isDrafting ? 'bg-amber-500 text-black border-amber-400 shadow-xl' : 'bg-white/5 text-slate-500 border-white/5 hover:text-white'}`}>
            {isDrafting ? 'Drafting Machine ON' : 'Drafting Engine'}
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        <svg ref={svgRef} viewBox={viewBox} onClick={handleSvgClick} className="w-full h-full p-12 transition-all duration-700">
          <defs>
            <pattern id="grid30" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5"/></pattern>
            <pattern id="grid60" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/></pattern>
            
            <clipPath id="roomClip">
              {roomPoints ? (
                <polygon points={normalizedPointsString} />
              ) : (
                <rect x={0} y={0} width={bounds.w} height={bounds.h} />
              )}
            </clipPath>
          </defs>

          {/* BACKGROUND FONDATION */}
          {roomPoints ? (
            <polygon points={normalizedPointsString} fill="#020617" stroke="#3b82f6" strokeWidth="6" strokeLinejoin="round" />
          ) : (
            <rect x={0} y={0} width={bounds.w} height={bounds.h} fill="#020617" stroke="#3b82f6" strokeWidth="2" />
          )}

          {/* GRID CLIPPED TO ROOM SHAPE */}
          <g clipPath="url(#roomClip)">
            <rect x={-100} y={-100} width={bounds.w + 200} height={bounds.h + 200} fill="url(#grid30)" />
            <rect x={-100} y={-100} width={bounds.w + 200} height={bounds.h + 200} fill="url(#grid60)" />
          </g>

          <g>
            {persistedRows.map(row => {
               if (!row.spatialMetadata) return null;
               const sm = JSON.parse(row.spatialMetadata);
               // Normalizar posición de la bahía
               const nx = sm.x - bounds.minX;
               const ny = sm.y - bounds.minY;
               return (
                 <g key={row.id}>
                    <rect x={nx} y={ny} width={sm.w} height={sm.h} fill="rgba(217, 70, 239, 0.03)" stroke="#d946ef" strokeWidth="2" strokeDasharray="10 5" />
                    <text x={nx + 10} y={ny - 10} className="fill-slate-500 text-[10px] font-black uppercase tracking-widest">{row.name}</text>
                 </g>
               );
            })}

            {localRacks.map(rack => {
                let x, y, w, h;
                const isCab = rack.type === 'CABINET';
                if (rack.spatialMetadata) {
                  const sm = typeof rack.spatialMetadata === 'string' ? JSON.parse(rack.spatialMetadata) : rack.spatialMetadata;
                  x = sm.x - bounds.minX + 4; y = sm.y - bounds.minY + 4; w = sm.w - 8; h = sm.h - 8;
                } else { x = Number(rack.position || 0)*TILE_SIZE+4; y = 4; w = TILE_SIZE-8; h = TILE_SIZE-8; }
                return (
                  <g key={rack.id} className="cursor-pointer group" onClick={(e) => { e.stopPropagation(); if(!isDrafting) setSelectedContainer(rack); }}>
                    <rect x={x} y={y} width={w} height={h} rx="4" fill={isCab ? 'rgba(71, 85, 105, 0.2)' : 'rgba(16, 185, 129, 0.15)'} stroke={isCab ? '#94a3b8' : '#10b981'} strokeWidth={isCab ? "3" : "2"} className="transition-all group-hover:stroke-white" />
                    {isCab && <rect x={x+2} y={y+2} width={w-4} height={h-4} rx="2" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />}
                    <text x={x+4} y={y+10} className="text-[5px] font-black fill-white/40 uppercase tracking-tighter">{rack.name}</text>
                  </g>
                );
            })}

            {positions.map(pos => {
              const x = ((Number(pos.col)||1)-1)*TILE_SIZE+8, y = ((Number(pos.row)||1)-1)*TILE_SIZE+8;
              const isOccupied = pos.status !== 'EMPTY';
              return <rect key={pos.id} x={x} y={y} width={TILE_SIZE-16} height={TILE_SIZE-16} rx="4" fill={isOccupied ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.01)'} stroke={isOccupied ? '#3b82f6' : 'rgba(255,255,255,0.04)'} />;
            })}

            {localElements.map(el => (
              <g key={el.id}>
                <rect 
                  x={el.points[0].x} y={el.points[0].y} 
                  width={el.points[1].x - el.points[0].x} 
                  height={el.points[2].y - el.points[1].y} 
                  fill={el.type === 'BAY' ? 'rgba(217,70,239,0.1)' : (el.cType === 'CABINET' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(245,158,11,0.2)')} 
                  stroke={el.type === 'BAY' ? '#d946ef' : (el.cType === 'CABINET' ? '#94a3b8' : '#f59e0b')} 
                  strokeWidth="2" strokeDasharray="6 4" 
                />
              </g>
            ))}
          </g>
          
          <text x={bounds.w/2} y={bounds.h/2} textAnchor="middle" className="fill-white/[0.03] text-[120px] font-black uppercase italic tracking-tighter select-none pointer-events-none">TELXIUS</text>
        </svg>

        <div className="absolute bottom-10 left-10 flex gap-4">
           <LegendItem icon={<div className="w-3 h-3 bg-blue-500 rounded-sm" />} label="Assets Inventariados" />
           <LegendItem icon={<div className="w-3 h-3 bg-fuchsia-500 rounded-sm" />} label="Bahías (Bays)" />
           <LegendItem icon={<div className="w-3 h-3 bg-emerald-500 rounded-sm" />} label="Racks Operativos" />
        </div>
      </div>

      {selectedContainer && (
        <RackElevationManager 
          container={selectedContainer} 
          siteId={substructure?.level?.structure?.siteId}
          onClose={() => setSelectedContainer(null)} 
          onUpdate={() => {
            // Re-fetch substructure data to see new racks/devices if necessary
            const fetchRoomData = async () => {
              const res = await fetch(`/telxius/api/substructures/?id=${substructureId}&t=${Date.now()}`);
              const data = await res.json();
              const obj = Array.isArray(data.data) ? data.data[0] : data.data;
              if (obj && obj.racks) setLocalRacks(obj.racks);
            };
            fetchRoomData();
          }}
        />
      )}
    </div>
  );
};

const LegendItem = ({ icon, label }: { icon: React.ReactNode, label: string }) => (
  <div className="flex items-center gap-3 px-5 py-2.5 bg-black/60 backdrop-blur-3xl rounded-2xl border border-white/5 shadow-2xl">
    {icon} <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
  </div>
);

export default RoomView;
