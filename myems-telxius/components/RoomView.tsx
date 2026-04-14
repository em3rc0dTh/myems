"use client"
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Substructure, Position } from '@/lib/types';
import { ChevronRight, Globe, MousePointer2, Layers, Cpu, CheckCircle2, AlertTriangle, Activity, Save, Trash2, Maximize2, MoveRight, Plus } from 'lucide-react';
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
  const [activeTool, setActiveTool] = useState<'POLYGON' | 'CLUSTER_STAMP' | 'BAY_DRAFTING' | 'REFERENCE_SYMBOL'>('CLUSTER_STAMP');
  const [stampSize, setStampSize] = useState({ w: 60, h: 60 });
  const [containerType, setContainerType] = useState<'RACK' | 'CABINET'>('RACK');
  const [symbolType, setSymbolType] = useState<'DOOR' | 'COLUMN' | 'WINDOW' | 'PANEL' | 'HVAC' | 'SECURITY'>('DOOR');
  const [symbolRotation, setSymbolRotation] = useState(0);
  const [uCapacity, setUCapacity] = useState(42);
  const [customSize, setCustomSize] = useState({ w: 60, h: 60 });
  const [localElements, setLocalElements] = useState<any[]>([]);
  const [activePoints, setActivePoints] = useState<any[]>([]);
  const [localRacks, setLocalRacks] = useState<any[]>([]);
  const [persistedRows, setPersistedRows] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const TILE_SIZE = 60;
  const contentRef = useRef<SVGGElement>(null);

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
              if (sm.clusters) setLocalElements(prev => [...prev.filter(el => el.type !== 'ZONE'), ...(sm.clusters || [])]);
              if (sm.references) setLocalElements(prev => [...prev.filter(el => el.type !== 'REFERENCE'), ...(sm.references || [])]);
            } catch (e) { }
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

  // ZOOM & PAN STATE
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  const getSvgCoords = (e: React.MouseEvent) => {
    if (!svgRef.current || !contentRef.current) return null;
    const svg = svgRef.current;
    const content = contentRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const transformed = pt.matrixTransform(content.getScreenCTM()?.inverse());
    return {
      x: transformed.x,
      y: transformed.y
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && !isDrafting)) { // Middle click or left click when not drafting
      setIsPanning(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = (e.clientX - lastMouse.x) * (1 / zoom);
      const dy = (e.clientY - lastMouse.y) * (1 / zoom);
      setPan(prev => ({ x: prev.x - dx, y: prev.y - dy }));
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const rotatePoint = (x: number, y: number, angleDeg: number, cx: number, cy: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = x - cx;
    const dy = y - cy;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos
    };
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.min(5, Math.max(0.5, prev * delta)));
    }
  };

  const handleSvgClick = (e: React.MouseEvent) => {
    if (!isDrafting) return;
    const coords = getSvgCoords(e);
    if (!coords) return;

    if (activeTool === 'CLUSTER_STAMP' && alignmentData) {
      const w = stampSize.w;
      const h = stampSize.h;

      // 1. Transform Click to Aligned Space
      const uCoords = rotatePoint(coords.x, coords.y, -alignmentData.angle, alignmentData.centerX, alignmentData.centerY);

      const allBays = [
        ...persistedRows.map(r => {
          const sm = JSON.parse(r.spatialMetadata);
          const pts = sm.points || [
            { x: sm.x, y: sm.y },
            { x: sm.x + sm.w, y: sm.y },
            { x: sm.x + sm.w, y: sm.y + sm.h },
            { x: sm.x, y: sm.y + sm.h }
          ];
          // Transform world-norm points to Aligned Space
          const uPts = pts.map((p: any) => rotatePoint(p.x - bounds.minX, p.y - bounds.minY, -alignmentData.angle, alignmentData.centerX, alignmentData.centerY));
          return { ...r, uPts };
        }),
        ...localElements.filter(el => el.type === 'BAY').map(el => ({
          ...el,
          uPts: el.points.map((p: any) => rotatePoint(p.x, p.y, -alignmentData.angle, alignmentData.centerX, alignmentData.centerY))
        }))
      ];

      const targetBay = allBays.find(bay => {
        const uXS = bay.uPts.map((p: any) => p.x);
        const uYS = bay.uPts.map((p: any) => p.y);
        const uMinX = Math.min(...uXS);
        const uMaxX = Math.max(...uXS);
        const uMinY = Math.min(...uYS);
        const uMaxY = Math.max(...uYS);

        // Check if uCoords (in aligned space) is inside the aligned bay boundary
        return (uCoords.x >= uMinX && uCoords.x + w <= uMaxX && uCoords.y >= uMinY && uCoords.y <= uMaxY);
      });

      if (!targetBay) {
        Swal.fire({
          toast: true, position: 'top-end', icon: 'warning', title: 'Fuera de Límites',
          text: 'El rack debe estar dentro de una bahía.',
          showConfirmButton: false, timer: 3000, background: '#020617', color: '#fff'
        });
        return;
      }

      // 2. Magnetize Y to the Bay's top edge in Aligned Space
      const uBayTopY = Math.min(...targetBay.uPts.map((p: any) => p.y));

      // 3. Check for Overlap in Aligned Space
      const currentDraftRacks = localElements.filter(el => el.type === 'ZONE').map(el => ({
        ...el,
        uPts: el.points.map((p: any) => rotatePoint(p.x, p.y, -alignmentData.angle, alignmentData.centerX, alignmentData.centerY))
      }));

      const hasOverlap = currentDraftRacks.some(r => {
        const ruXS = r.uPts.map((p: any) => p.x);
        const ruYS = r.uPts.map((p: any) => p.y);
        const ruMinX = Math.min(...ruXS);
        const ruMaxX = Math.max(...ruXS);
        const ruMinY = Math.min(...ruYS);
        const ruMaxY = Math.max(...ruYS);
        
        return (uCoords.x < ruMaxX && uCoords.x + w > ruMinX && uBayTopY < ruMaxY && uBayTopY + h > ruMinY);
      });

      if (hasOverlap) {
        Swal.fire({
          toast: true, position: 'top-end', icon: 'error', title: 'SolapamientoDetectado',
          text: 'No se pueden superponer los racks.',
          showConfirmButton: false, timer: 3000, background: '#020617', color: '#fff'
        });
        return;
      }

      // 4. Form 4 vertices in Aligned Space and un-rotate back to World-norm
      const newAlignedPoints = [
        { x: uCoords.x, y: uBayTopY },
        { x: uCoords.x + w, y: uBayTopY },
        { x: uCoords.x + w, y: uBayTopY + h },
        { x: uCoords.x, y: uBayTopY + h }
      ];

      const worldPoints = newAlignedPoints.map(p => rotatePoint(p.x, p.y, alignmentData.angle, alignmentData.centerX, alignmentData.centerY));

      const newEl = {
        id: `rack-${Date.now()}`,
        type: 'ZONE',
        cType: containerType,
        uCapacity: uCapacity,
        label: `${containerType} ${localElements.filter(x => x.type === 'ZONE').length + 1}`,
        points: worldPoints
      };
      setLocalElements(prev => [...prev, newEl]);
    } else if (activeTool === 'REFERENCE_SYMBOL' && alignmentData) {
      const sizes = {
        DOOR: { w: 100, h: 10 },
        COLUMN: { w: 50, h: 50 },
        WINDOW: { w: 120, h: 10 },
        PANEL: { w: 40, h: 20 },
        HVAC: { w: 80, h: 80 },
        SECURITY: { w: 20, h: 20 }
      };
      const s = sizes[symbolType];
      
      // Calculate 4 points in Aligned Space (centered at click)
      const uClick = rotatePoint(coords.x, coords.y, -alignmentData.angle, alignmentData.centerX, alignmentData.centerY);
      
      // Rotation within aligned space (0, 90, 180, 270)
      const uPts = [
        { x: uClick.x - s.w/2, y: uClick.y - s.h/2 },
        { x: uClick.x + s.w/2, y: uClick.y - s.h/2 },
        { x: uClick.x + s.w/2, y: uClick.y + s.h/2 },
        { x: uClick.x - s.w/2, y: uClick.y + s.h/2 }
      ];

      // Apply symbol rotation around uClick
      const rotatedUPts = uPts.map(p => rotatePoint(p.x, p.y, symbolRotation, uClick.x, uClick.y));

      // Un-rotate back to World Space
      const worldPoints = rotatedUPts.map(p => rotatePoint(p.x, p.y, alignmentData.angle, alignmentData.centerX, alignmentData.centerY));

      setLocalElements(prev => [...prev, {
        id: `ref-${Date.now()}`,
        type: 'REFERENCE',
        symbol: symbolType,
        angle: symbolRotation,
        points: worldPoints
      }]);
    } else if (activeTool === 'BAY_DRAFTING') {
      if (activePoints.length === 1 && alignmentData) {
        const p1 = activePoints[0]; // World-norm point
        const p2 = coords;           // World-norm point

        // 1. Project to Aligned Space to form the oriented rectangle
        const u1 = rotatePoint(p1.x, p1.y, -alignmentData.angle, alignmentData.centerX, alignmentData.centerY);
        const u2 = rotatePoint(p2.x, p2.y, -alignmentData.angle, alignmentData.centerX, alignmentData.centerY);

        const uxMin = Math.min(u1.x, u2.x);
        const uyMin = Math.min(u1.y, u2.y);
        const uw = Math.max(TILE_SIZE, Math.abs(u1.x - u2.x));
        const uh = Math.max(TILE_SIZE, Math.abs(u1.y - u2.y));

        // 2. Form 4 vertices in Aligned Space
        const alignedPoints = [
          { x: uxMin, y: uyMin },
          { x: uxMin + uw, y: uyMin },
          { x: uxMin + uw, y: uyMin + uh },
          { x: uxMin, y: uyMin + uh }
        ];

        // 3. Un-rotate back to World Space
        const worldPoints = alignedPoints.map(p => rotatePoint(p.x, p.y, alignmentData.angle, alignmentData.centerX, alignmentData.centerY));

        setLocalElements(prev => [...prev, { 
          id: `bay-${Date.now()}`, 
          type: 'BAY', 
          label: `BAY ${prev.filter(x => x.type === 'BAY').length + 1}`, 
          points: worldPoints 
        }]);
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
        const points = bay.points.map((p: any) => ({ x: p.x + bounds.minX, y: p.y + bounds.minY }));
        const res = await fetch('/telxius/api/rows/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: bay.label,
            substructureId: roomId,
            spatialMetadata: JSON.stringify({ points, metric: 'cm' })
          })
        });
        if (res.ok) { 
          const data = await res.json(); 
          savedRows.push({ ...data.data, localId: bay.id }); 
        }
      }

      const newPersistedRacks = [];
      for (const rack of racks) {
        const points = rack.points.map((p: any) => ({ x: p.x + bounds.minX, y: p.y + bounds.minY }));
        const minX = Math.min(...points.map((p: any) => p.x));
        const minY = Math.min(...points.map((p: any) => p.y));
        const maxX = Math.max(...points.map((p: any) => p.x));
        const maxY = Math.max(...points.map((p: any) => p.y));
        const w = maxX - minX;
        const h = maxY - minY;

        const res = await fetch('/telxius/api/containers/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: rack.label,
            substructureId: roomId,
            row: "A", 
            position: 0,
            type: rack.cType || 'RACK',
            width: w,
            depth: h,
            uCapacity: rack.uCapacity || 42,
            spatialMetadata: JSON.stringify({ points, x: minX, y: minY, w, h, uCapacity: rack.uCapacity || 42, metric: 'cm' })
          })
        });
        if (res.ok) { 
          const data = await res.json(); 
          newPersistedRacks.push(data.data); 
        }
      }

      setLocalRacks(prev => [...prev, ...newPersistedRacks]);
      
      // PERSIST REFERENCE ICONS
      const refs = localElements.filter(el => el.type === 'REFERENCE');
      const existingMetadata = substructure.spatialMetadata ? (typeof substructure.spatialMetadata === 'string' ? JSON.parse(substructure.spatialMetadata) : substructure.spatialMetadata) : {};
      
      await fetch(`/telxius/api/substructures/?id=${roomId}`, {
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
      
      // RE-FETCH ALL ROOM DATA (including spatialMetadata with the new references/icons)
      const roomRes = await fetch(`/telxius/api/substructures/?id=${roomId}&t=${Date.now()}`);
      const roomData = await roomRes.json();
      const obj = Array.isArray(roomData.data) ? roomData.data[0] : roomData.data;
      if (obj) {
        setSubstructure(obj);
        if (obj.spatialMetadata) {
          try {
            const sm = typeof obj.spatialMetadata === 'string' ? JSON.parse(obj.spatialMetadata) : obj.spatialMetadata;
            if (sm.clusters) setLocalElements(prev => [...prev.filter(el => el.type !== 'ZONE'), ...(sm.clusters || [])]);
            if (sm.references) setLocalElements(prev => [...prev.filter(el => el.type !== 'REFERENCE'), ...(sm.references || [])]);
          } catch (e) { }
        }
      }

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
    } catch (e) { 
      console.error(e); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const roomPoints = useMemo(() => {
    console.log("DEBUG: Processing Perimeter for Substructure:", substructure?.name, "Raw perimeter:", substructure?.perimeter);
    if (!substructure?.perimeter) {
      // Si no hay perímetro, intentamos generarlo desde width/length
      const w = (resolveValue(substructure?.width) || 12) * 100;
      const h = (resolveValue(substructure?.length) || 8) * 100;
      console.log("DEBUG: No perimeter found. Synthesizing rectangle:", w, "x", h);
      return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
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

  const alignmentData = useMemo(() => {
    if (!roomPoints || roomPoints.length < 2) return null;

    // 1. Identify the 'Top Wall' (Lowest Average Y)
    let minAvgY = Infinity;
    let topWallIndex = 0;
    for (let i = 0; i < roomPoints.length; i++) {
      const p1 = roomPoints[i];
      const p2 = roomPoints[(i + 1) % roomPoints.length];
      const avgY = (p1.y + p2.y) / 2;
      if (avgY < minAvgY) {
        minAvgY = avgY;
        topWallIndex = i;
      }
    }

    const pA = roomPoints[topWallIndex];
    const pB = roomPoints[(topWallIndex + 1) % roomPoints.length];
    
    // 2. Calculate Angle (Ensuring it flows somewhat left-to-right)
    let angle = Math.atan2(pB.y - pA.y, pB.x - pA.x) * (180 / Math.PI);
    
    // 3. Find Global Extents in Oriented Space
    const rad = (-angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const orientedPoints = roomPoints.map((p: any) => ({
      x: (p.x - bounds.minX) * cos - (p.y - bounds.minY) * sin,
      y: (p.x - bounds.minX) * sin + (p.y - bounds.minY) * cos
    }));

    const oXS = orientedPoints.map((p: any) => p.x);
    const oYS = orientedPoints.map((p: any) => p.y);
    const oMinX = Math.min(...oXS);
    const oMinY = Math.min(...oYS);
    const oMaxX = Math.max(...oXS);
    const oMaxY = Math.max(...oYS);

    return {
      angle,
      oMinX, oMinY,
      w: oMaxX - oMinX,
      h: oMaxY - oMinY,
      orientedPoints: orientedPoints.map(p => ({ x: p.x - oMinX, y: p.y - oMinY })),
      // Reference for rotation center (middle of the world box)
      centerX: bounds.w / 2,
      centerY: bounds.h / 2
    };
  }, [roomPoints, bounds]);

  const viewBox = (() => {
    const baseW = bounds.w + 200;
    const baseH = bounds.h + 200;
    const zW = baseW / zoom;
    const zH = baseH / zoom;
    const startX = -100 + pan.x;
    const startY = -100 + pan.y;
    return `${startX} ${startY} ${zW} ${zH}`;
  })();

  if (loading || !substructure) return <div className="flex-1 flex flex-col items-center justify-center bg-black"><Activity className="animate-spin text-blue-500 mb-4" /></div>;

  return (
    <div className="w-full h-full flex flex-col bg-[#050508] font-sans selection:bg-blue-500/30">
      {/* ... header remains same ... */}
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
              {[
                { id: 'CLUSTER_STAMP', label: 'Racks' },
                { id: 'BAY_DRAFTING', label: 'Bays' },
                { id: 'REFERENCE_SYMBOL', label: 'Icons' }
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTool(t.id as any)} className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${activeTool === t.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 gap-1 mr-4">
            <button
              onClick={() => setZoom(prev => Math.min(5, prev * 1.2))}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(0.5, prev / 1.2))}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              title="Zoom Out"
            >
              <Maximize2 className="w-4 h-4 scale-75" />
            </button>
            <button
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="px-4 h-10 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              Reset
            </button>
          </div>

          {isDrafting && activeTool === 'REFERENCE_SYMBOL' && (
            <div className="flex items-center gap-3 pr-4 border-r border-white/10">
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 gap-1">
                {['DOOR', 'COLUMN', 'WINDOW', 'PANEL', 'HVAC', 'SECURITY'].map(s => (
                  <button key={s} onClick={() => setSymbolType(s as any)} className={`px-2 py-1 text-[8px] font-black uppercase rounded-lg transition-all ${symbolType === s ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}>{s}</button>
                ))}
              </div>
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 gap-1 items-center px-3">
                <span className="text-[8px] font-black uppercase text-slate-500 mr-2">Rot</span>
                <select 
                  value={symbolRotation} 
                  onChange={e => setSymbolRotation(Number(e.target.value))}
                  className="bg-transparent text-[10px] text-white font-black outline-none appearance-none cursor-pointer"
                >
                  {[0, 90, 180, 270].map(deg => <option key={deg} value={deg} className="bg-slate-900">{deg}°</option>)}
                </select>
              </div>
            </div>
          )}

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
                <button key={s.label} onClick={() => setStampSize({ w: s.w, h: s.h })} className={`w-12 h-8 flex items-center justify-center text-[8px] font-bold border rounded-lg transition-all ${stampSize.w === s.w && stampSize.h === s.h ? 'border-amber-500 bg-amber-500/10 text-white' : 'border-white/10 text-slate-500'}`}>
                  {s.label}
                </button>
              ))}
              <div className="flex gap-1 ml-2">
                <input
                  type="number" value={customSize.w}
                  onChange={e => setCustomSize(prev => ({ ...prev, w: Math.min(120, Number(e.target.value)) }))}
                  className="w-10 h-8 bg-black/40 border border-white/10 rounded-lg text-[9px] text-center text-white"
                />
                <input
                  type="number" value={customSize.h}
                  onChange={e => setCustomSize(prev => ({ ...prev, h: Math.min(120, Number(e.target.value)) }))}
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

      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black cursor-crosshair" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 bg-sky-500/10 border border-sky-500/20 rounded-full flex items-center gap-3">
          <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest">Nivel de Zoom: {(zoom * 100).toFixed(0)}%</span>
          <div className="h-3 w-[1px] bg-sky-500/20" />
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest underline decoration-sky-500/30 underline-offset-2">Click + Arrastrar para mover</span>
        </div>

        <svg ref={svgRef} viewBox={viewBox} onClick={handleSvgClick} className="w-full h-full p-12 transition-all duration-200 ease-out select-none">
          <defs>
            <pattern id="grid30" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" /></pattern>
            <pattern id="grid60" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" /></pattern>

            <clipPath id="roomClip">
              {roomPoints ? (
                <polygon points={normalizedPointsString} />
              ) : (
                <rect x={0} y={0} width={bounds.w} height={bounds.h} />
              )}
            </clipPath>
          </defs>

          {/* MAIN ROTATED CONTENT GROUP */}
          <g ref={contentRef} transform={`rotate(${isDrafting && alignmentData ? -alignmentData.angle : 0}, ${alignmentData?.centerX || 0}, ${alignmentData?.centerY || 0})`} className="transition-transform duration-700 ease-in-out">
            {/* BACKGROUND FONDATION */}
            {roomPoints ? (
              <polygon points={normalizedPointsString} fill="#050508" stroke="#3b82f6" strokeWidth={8 / zoom} strokeLinejoin="round" />
            ) : (
              <rect x={0} y={0} width={bounds.w} height={bounds.h} fill="#050508" stroke="#3b82f6" strokeWidth={4 / zoom} />
            )}

            {/* DYNAMIC COORDINATE SYSTEM (60x60 Tiles) - Aligned to Room Orientation */}
            <g clipPath="url(#roomClip)">
              {/* Discrete Tile border and labels generated in aligned space */}
              {(() => {
                if (!alignmentData) return null;
                const rows = Math.ceil(alignmentData.h / 60);
                const cols = Math.ceil(alignmentData.w / 60);
                const grid = [];
                
                // Inverse transform to place grid in original coordinate space if needed
                // But since everything is inside the group, we work in Aligned Space directly.
                
                // We need to shift the grid to match the Orientated Bounds
                // Let's create a sub-group for the grid that translates to the oriented origin
                return (
                  <g transform={`translate(${alignmentData.oMinX}, ${alignmentData.oMinY}) rotate(${alignmentData.angle}, 0, 0)`}>
                    {/* The grid pattern itself can be simpler now */}
                    <rect x={-500} y={-500} width={alignmentData.w + 1000} height={alignmentData.h + 1000} fill="url(#grid30)" opacity={0.5} />
                    <rect x={-500} y={-500} width={alignmentData.w + 1000} height={alignmentData.h + 1000} fill="url(#grid60)" />

                    {Array.from({ length: rows }).map((_, r) => (
                      Array.from({ length: cols }).map((_, c) => {
                        const label = `${String.fromCharCode(65 + r)}${c + 1}`;
                        return (
                          <g key={`${r}-${c}`}>
                            <rect
                              x={c * 60} y={r * 60} width="60" height="60"
                              fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={0.5 / zoom}
                            />
                            <text
                              x={c * 60 + 30}
                              y={r * 60 + 35}
                              textAnchor="middle"
                              className="fill-white/10 font-black pointer-events-none uppercase tracking-tighter"
                              style={{ fontSize: '10px' }}
                            >
                              {label}
                            </text>
                          </g>
                        );
                      })
                    ))}
                  </g>
                );
              })()}
            </g>

            {/* PERIMETER MEASUREMENTS */}
            <g>
              {(() => {
                const points = roomPoints ? roomPoints.map((p: any) => ({
                  x: p.x - bounds.minX,
                  y: p.y - bounds.minY
                })) : [
                  { x: 0, y: 0 }, { x: bounds.w, y: 0 }, { x: bounds.w, y: bounds.h }, { x: 0, y: bounds.h }
                ];

                const measurements = [];
                for (let i = 0; i < points.length; i++) {
                  const p1 = points[i];
                  const p2 = points[(i + 1) % points.length];

                  const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                  const midX = (p1.x + p2.x) / 2;
                  const midY = (p1.y + p2.y) / 2;

                  // Normal vector for offset
                  const dx = p2.x - p1.x;
                  const dy = p2.y - p1.y;
                  const angle = Math.atan2(dy, dx);
                  const offsetX = Math.sin(angle) * (20 / zoom);
                  const offsetY = -Math.cos(angle) * (20 / zoom);

                  measurements.push(
                    <g key={`measure-${i}`}>
                      <text
                        x={midX + offsetX} y={midY + offsetY}
                        textAnchor="middle"
                        className="fill-blue-400 font-black tracking-tighter"
                        style={{ fontSize: 12 / zoom }}
                      >
                        {(dist / 100).toFixed(2)}m
                      </text>
                    </g>
                  );
                }
                return measurements;
              })()}
            </g>

            <g>
              {persistedRows.map(row => {
                if (!row.spatialMetadata) return null;
                const sm = JSON.parse(row.spatialMetadata);
                
                // Si tiene puntos (formato nuevo), úsalos. Si no, usa x,y,w,h (formato viejo)
                let ptsString = "";
                if (sm.points) {
                  ptsString = sm.points.map((p: any) => `${p.x - bounds.minX},${p.y - bounds.minY}`).join(' ');
                } else {
                  const nx = sm.x - bounds.minX;
                  const ny = sm.y - bounds.minY;
                  ptsString = `${nx},${ny} ${nx + sm.w},${ny} ${nx + sm.w},${ny + sm.h} ${nx},${ny + sm.h}`;
                }

                // Centro del polígono para la etiqueta
                const sumX = (sm.points || []).reduce((acc: number, p: any) => acc + p.x, 0) || (sm.x + sm.w / 2) * (sm.points?.length || 1);
                const sumY = (sm.points || []).reduce((acc: number, p: any) => acc + p.y, 0) || (sm.y + sm.h / 2) * (sm.points?.length || 1);
                const labelX = (sumX / (sm.points?.length || 1)) - bounds.minX;
                const labelY = (sumY / (sm.points?.length || 1)) - bounds.minY;

                return (
                  <g key={row.id}>
                    <polygon points={ptsString} fill="rgba(217, 70, 239, 0.03)" stroke="#d946ef" strokeWidth={2 / zoom} strokeDasharray={`${10 / zoom} ${5 / zoom}`} />
                    <text x={labelX} y={labelY} textAnchor="middle" alignmentBaseline="middle" className="fill-white font-black uppercase tracking-widest drop-shadow-md" style={{ fontSize: 18 / zoom }}>{row.name}</text>
                  </g>
                );
              })}

              {localRacks.map(rack => {
                let x, y, w, h;
                const isCab = rack.type === 'CABINET';
                if (rack.spatialMetadata) {
                  const sm = typeof rack.spatialMetadata === 'string' ? JSON.parse(rack.spatialMetadata) : rack.spatialMetadata;
                  x = sm.x - bounds.minX + 4; y = sm.y - bounds.minY + 4; w = sm.w - 8; h = sm.h - 8;
                } else { x = Number(rack.position || 0) * TILE_SIZE + 4; y = 4; w = TILE_SIZE - 8; h = TILE_SIZE - 8; }
                return (
                  <g key={rack.id} className="cursor-pointer group" onClick={(e) => { e.stopPropagation(); if (!isDrafting) setSelectedContainer(rack); }}>
                    <rect x={x} y={y} width={w} height={h} rx="4" fill={isCab ? 'rgba(71, 85, 105, 0.2)' : 'rgba(16, 185, 129, 0.15)'} stroke={isCab ? '#94a3b8' : '#10b981'} strokeWidth={(isCab ? 3 : 2) / zoom} className="transition-all group-hover:stroke-white" />
                    {isCab && <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} rx="2" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1 / zoom} />}
                    <text x={x + w / 2} y={y + h / 2} textAnchor="middle" alignmentBaseline="middle" className="font-black fill-white uppercase tracking-tighter drop-shadow-sm" style={{ fontSize: 12 / zoom }}>{rack.name}</text>
                  </g>
                );
              })}

              {positions.map(pos => {
                const x = ((Number(pos.col) || 1) - 1) * TILE_SIZE + 8, y = ((Number(pos.row) || 1) - 1) * TILE_SIZE + 8;
                const isOccupied = pos.status !== 'EMPTY';
                return <rect key={pos.id} x={x} y={y} width={TILE_SIZE - 16} height={TILE_SIZE - 16} rx="4" fill={isOccupied ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.01)'} stroke={isOccupied ? '#3b82f6' : 'rgba(255,255,255,0.04)'} strokeWidth={1 / zoom} />;
              })}

              {localElements.map(el => {
                const ptsString = (el.points || []).map((p: any) => `${p.x},${p.y}`).join(' ');
                
                if (el.type === 'REFERENCE') {
                  const color = el.symbol === 'DOOR' ? '#ef4444' : (el.symbol === 'COLUMN' ? '#3b82f6' : (el.symbol === 'HVAC' ? '#06b6d4' : '#10b981'));
                  return (
                    <g key={el.id}>
                      <polygon points={ptsString} fill={`${color}20`} stroke={color} strokeWidth={2/zoom} />
                      {/* Technical detail for Doors */}
                      {el.symbol === 'DOOR' && (
                        <circle cx={el.points[0].x} cy={el.points[0].y} r={30/zoom} fill="none" stroke={color} strokeWidth={1/zoom} strokeDasharray="2 2" />
                      )}
                      {/* Technical detail for HVAC */}
                      {el.symbol === 'HVAC' && (
                        <path d={`M ${el.points[0].x} ${el.points[0].y} L ${el.points[2].x} ${el.points[2].y} M ${el.points[1].x} ${el.points[1].y} L ${el.points[3].x} ${el.points[3].y}`} stroke={color} strokeWidth={1/zoom} opacity={0.5} />
                      )}
                      <text x={el.points[0].x} y={el.points[0].y} dy="-5" className="fill-white/40 text-[6px] font-black uppercase">{el.symbol}</text>
                    </g>
                  );
                }

                return (
                  <g key={el.id}>
                    <polygon
                      points={ptsString}
                      fill={el.type === 'BAY' ? 'rgba(217,70,239,0.1)' : (el.cType === 'CABINET' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(245,158,11,0.2)')}
                      stroke={el.type === 'BAY' ? '#d946ef' : (el.cType === 'CABINET' ? '#94a3b8' : '#f59e0b')}
                      strokeWidth={2 / zoom} strokeDasharray={`${6 / zoom} ${4 / zoom}`}
                    />
                  </g>
                );
              })}
            </g>
          </g>

          <text x={bounds.w / 2} y={bounds.h / 2} textAnchor="middle" className="fill-white/[0.03] font-black uppercase italic tracking-tighter select-none pointer-events-none" style={{ fontSize: 120 / zoom }}>AppM</text>
        </svg>

        <div className="absolute bottom-10 left-10 flex flex-col gap-3 bg-black/60 backdrop-blur-xl p-6 rounded-[32px] border border-white/10 shadow-2xl animate-in slide-in-from-left-4 duration-700">
          <h4 className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Referencia Técnica</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <LegendItem icon={<div className="w-3 h-3 bg-blue-500 rounded-sm shadow-[0_0_10px_rgba(59,130,246,0.4)]" />} label="Equipos Activos" />
            <LegendItem icon={<div className="w-3 h-3 bg-fuchsia-500 rounded-sm shadow-[0_0_10px_rgba(217,70,239,0.4)]" />} label="Bahías de Pasillo" />
            <LegendItem icon={<div className="w-3 h-3 bg-emerald-500 rounded-sm shadow-[0_0_10px_rgba(16,185,129,0.4)]" />} label="Racks Estándar" />
            <LegendItem icon={<div className="w-3 h-3 bg-slate-500 rounded-sm" />} label="Gabinete / Cabinet" />
            <LegendItem icon={<div className="w-3 h-3 border border-white/20 rounded-sm bg-white/5" />} label="Mosaico 60x60 (A1...)" />
            <LegendItem icon={<div className="w-3 h-[2px] bg-blue-500 shadow-[0_0_5px_#3b82f6]" />} label="Perímetro de Sala" />
          </div>
        </div>
      </div>

      {selectedContainer && (
        <RackElevationManager
          container={selectedContainer}
          siteId={substructure?.level?.structure?.siteId}
          onClose={() => setSelectedContainer(null)}
          onUpdate={() => {
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

const LegendItem: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-3 group transition-all duration-300">
    <div className="shrink-0">{icon}</div>
    <span className="text-[9px] font-bold text-slate-400 capitalize whitespace-nowrap group-hover:text-white transition-colors">{label}</span>
  </div>
);

export default RoomView;
