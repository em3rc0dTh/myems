"use client"
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Substructure, Position } from '@/lib/types';
import { ChevronRight, Globe, MousePointer2, Layers, X, Cpu, CheckCircle2, AlertTriangle, Activity, Save, Trash2, Maximize2, MoveRight, Plus, Flame } from 'lucide-react';
import Swal from 'sweetalert2';
import RackElevationManager from './RackElevationManager';
import { useMqtt } from '@/lib/MqttContext';
import { useAuth } from '@/lib/AuthContext';

interface RoomViewProps {
  substructureId: string;
  onSelectBDFB?: (id: string | null) => void;
  onContainerSelect?: (container: any | null) => void;
  siteDimensions?: { width?: number; length?: number };
}

const RoomView: React.FC<RoomViewProps> = ({ substructureId, onSelectBDFB, onContainerSelect, siteDimensions }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [substructure, setSubstructure] = useState<any | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedContainer, _setSelectedContainer] = useState<any | null>(null);
  const setSelectedContainer = (c: any | null) => {
    _setSelectedContainer(c);
    if (onContainerSelect) onContainerSelect(c);
  };

  // DRAWING ENGINE STATE
  const [isDrafting, setIsDrafting] = useState(false);
  const [activeTool, setActiveTool] = useState<'POLYGON' | 'CLUSTER_STAMP' | 'BAY_DRAFTING' | 'REFERENCE_SYMBOL'>('CLUSTER_STAMP');
  const [stampSize, setStampSize] = useState({ w: 60, h: 60 });
  const [containerType, setContainerType] = useState<'RACK' | 'CABINET'>('RACK');
  const [sizeMode, setSizeMode] = useState<'PRESET' | 'CUSTOM'>('PRESET');
  const [symbolType, setSymbolType] = useState<'DOOR' | 'COLUMN' | 'WINDOW' | 'PANEL' | 'HVAC' | 'SECURITY'>('DOOR');
  const [symbolRotation, setSymbolRotation] = useState(0);
  const [uCapacity, setUCapacity] = useState(42);
  const [customSize, setCustomSize] = useState({ w: 60, h: 60 });
  const [localElements, setLocalElements] = useState<any[]>([]);
  const [activePoints, setActivePoints] = useState<any[]>([]);
  const [localRacks, setLocalRacks] = useState<any[]>([]);
  const [persistedRows, setPersistedRows] = useState<any[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const { latestData } = useMqtt();
  const { isAdmin } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [ghostPoint, setGhostPoint] = useState<any | null>(null);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
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
        const res = await fetch(`/appm-ems/api/substructures/?id=${substructureId}&t=${Date.now()}`);
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

          const pRes = await fetch(`/appm-ems/api/positions/?substructureId=${substructureId}`);
          const pData = await pRes.json();
          setPositions(pData.data || []);

          const rRes = await fetch(`/appm-ems/api/rows/?substructureId=${substructureId}`);
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

    if (activePoints.length > 0) {
      setGhostPoint(getSvgCoords(e));
    } else {
      setGhostPoint(null);
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

  const calculateRackHeat = (rack: any) => {
    let totalPower = 0;
    const devices = rack.devices || [];

    devices.forEach((dev: any) => {
      const sns: string[] = [];
      const findSns = (eqs: any[]) => {
        eqs.forEach(eq => {
          if (eq.sn) sns.push(eq.sn);
          if (eq.children) findSns(eq.children);
        });
      };
      findSns(dev.equipments || []);

      sns.forEach(sn => {
        const telemetry = (latestData as any)[sn];
        if (telemetry?.reported) {
          const p1 = parseFloat(telemetry.reported.P1) || 0;
          const p2 = parseFloat(telemetry.reported.P2) || 0;
          if (p1 > 0 || p2 > 0) {
            totalPower += (p1 + p2);
          } else {
            const u1 = parseFloat(telemetry.reported.U1) || 0;
            const i1 = parseFloat(telemetry.reported.I1) || 0;
            totalPower += (u1 * i1) / 1000;
          }
        }
      });
    });

    const intensity = Math.min(1, totalPower / 10);
    const r = Math.floor(intensity * 255);
    const b = Math.floor((1 - intensity) * 255);
    const g = Math.floor((1 - Math.abs(intensity - 0.5) * 2) * 200);

    return {
      power: totalPower,
      color: `rgb(${r}, ${g}, ${b})`,
      opacity: 0.1 + (intensity * 0.4)
    };
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.min(5, Math.max(0.5, prev * delta)));
    }
  };

  const handleSvgClick = async (e: React.MouseEvent) => {
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

      const totalRacks = localRacks.length + localElements.filter(x => x.type === 'ZONE').length;
      const nextRackNum = totalRacks + 1;
      const rackLabel = `${containerType === 'CABINET' ? 'CAB' : 'RACK'}-${nextRackNum}`;

      const newEl = {
        id: `rack-${Date.now()}`,
        type: 'ZONE',
        cType: containerType,
        uCapacity: uCapacity,
        label: rackLabel,
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
        { x: uClick.x - s.w / 2, y: uClick.y - s.h / 2 },
        { x: uClick.x + s.w / 2, y: uClick.y - s.h / 2 },
        { x: uClick.x + s.w / 2, y: uClick.y + s.h / 2 },
        { x: uClick.x - s.w / 2, y: uClick.y + s.h / 2 }
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

        const totalBays = persistedRows.length + localElements.filter(el => el.type === 'BAY').length;
        const nextBayNum = totalBays + 1;

        const { value: bayName } = await Swal.fire({
          title: 'Nombre de Bahía',
          input: 'text',
          inputValue: `BAHÍA-${nextBayNum} (${(uw / 100).toFixed(1)}m)`,
          showCancelButton: true,
          background: '#020617',
          color: '#fff',
          confirmButtonText: 'IDENTIFICAR',
          confirmButtonColor: '#d946ef'
        });

        if (bayName) {
          setLocalElements(prev => [...prev, {
            id: `bay-${Date.now()}`,
            type: 'BAY',
            label: bayName,
            width: uw,
            height: uh,
            points: worldPoints
          }]);
        }
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
      const savedRows: any[] = [];

      for (const bay of bays) {
        const points = bay.points.map((p: any) => ({ x: p.x + bounds.minX, y: p.y + bounds.minY }));
        const res = await fetch('/appm-ems/api/rows/', {
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

      const newPersistedRacks: any[] = [];
      for (const rack of racks) {
        const points = rack.points.map((p: any) => ({ x: p.x + bounds.minX, y: p.y + bounds.minY }));
        const minX = Math.min(...points.map((p: any) => p.x));
        const minY = Math.min(...points.map((p: any) => p.y));
        const maxX = Math.max(...points.map((p: any) => p.x));
        const maxY = Math.max(...points.map((p: any) => p.y));
        const w = maxX - minX;
        const h = maxY - minY;
        const centerX = minX + w / 2;
        const centerY = minY + h / 2;

        // Find which bay (row) contains this rack
        let assignedRowId = null;
        for (const sr of savedRows) {
          try {
            const sm = typeof sr.spatialMetadata === 'string' ? JSON.parse(sr.spatialMetadata) : sr.spatialMetadata;
            const rPoints = sm.points || [];
            // Simple bounding box check for assignment
            const rMinX = Math.min(...rPoints.map((p: any) => p.x));
            const rMaxX = Math.max(...rPoints.map((p: any) => p.x));
            const rMinY = Math.min(...rPoints.map((p: any) => p.y));
            const rMaxY = Math.max(...rPoints.map((p: any) => p.y));

            if (centerX >= rMinX && centerX <= rMaxX && centerY >= rMinY && centerY <= rMaxY) {
              assignedRowId = sr.id;
              break;
            }
          } catch (e) { }
        }

        const res = await fetch('/appm-ems/api/containers/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: rack.label,
            substructureId: roomId,
            row: "A",
            rowId: assignedRowId,
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

      await fetch(`/appm-ems/api/substructures/?id=${roomId}`, {
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
      const roomRes = await fetch(`/appm-ems/api/substructures/?id=${roomId}&t=${Date.now()}`);
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

      const rRes = await fetch(`/appm-ems/api/rows/?substructureId=${substructureId}`);
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
    const angle = Math.atan2(pB.y - pA.y, pB.x - pA.x) * (180 / Math.PI);

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

  const viewBox = useMemo(() => {
    const baseW = bounds.w + 200;
    const baseH = bounds.h + 200;
    const zW = baseW / zoom;
    const zH = baseH / zoom;
    const startX = -100 + pan.x;
    const startY = -100 + pan.y;
    return `${startX} ${startY} ${zW} ${zH}`;
  }, [bounds, zoom, pan]);

  if (loading || !substructure) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black">
        <Activity className="animate-spin text-blue-500 mb-4" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#050508] font-sans selection:bg-blue-500/30">
      {/* HEADER REMOVED - NOW FLOATING IN CANVAS */}


      {/* METADATA BAR REMOVED - NOW IN FLOATING MEMBRETE */}


      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* FLOATING TOOLS PANEL */}
        {isDrafting && (
          <div className="absolute left-6 top-6 bottom-6 w-80 z-[150] flex flex-col gap-4 pointer-events-none">
            <div className="glass-panel p-4 rounded-[32px] border border-white/10 pointer-events-auto flex flex-col gap-6 shadow-2xl bg-[#0a0a0f]/80">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <span className="text-[10px] font-black text-white uppercase italic tracking-widest">Drafting Machine</span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 text-[8px] font-black rounded border border-amber-500/30">ACTIVE</span>
              </div>
              <div className="grid grid-cols-3 gap-2 bg-black/40 p-1 rounded-2xl border border-white/5">
                {[{ id: 'CLUSTER_STAMP', label: 'Racks' }, { id: 'BAY_DRAFTING', label: 'Bays' }, { id: 'REFERENCE_SYMBOL', label: 'Icons' }].map(t => (
                  <button key={t.id} onClick={() => setActiveTool(t.id as any)} className={`py-2 text-[8px] font-black uppercase rounded-xl transition-all ${activeTool === t.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{t.label}</button>
                ))}
              </div>
              {/* Contextual Tools */}
              <div className="flex flex-col gap-4 animate-in slide-in-from-left-2 duration-300">
                {activeTool === 'CLUSTER_STAMP' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest">Type</label>
                        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 gap-1">
                          <button onClick={() => setContainerType('RACK')} className={`flex-1 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all ${containerType === 'RACK' ? 'bg-emerald-500 text-black' : 'text-slate-600'}`}>Rack</button>
                          <button onClick={() => setContainerType('CABINET')} className={`flex-1 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all ${containerType === 'CABINET' ? 'bg-white/20 text-white' : 'text-slate-600'}`}>Cab</button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest">Height (U)</label>
                        <div className="flex items-center bg-black/40 px-3 py-1 rounded-xl border border-white/5">
                          <input type="number" value={uCapacity} onChange={e => setUCapacity(Number(e.target.value))} className="w-full bg-transparent text-[11px] text-white font-black outline-none" />
                          <span className="text-[8px] text-slate-600 font-black">U</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Size Engine</label>
                        <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
                          <button onClick={() => setSizeMode('PRESET')} className={`px-3 py-1 text-[7px] font-black uppercase rounded-md transition-all ${sizeMode === 'PRESET' ? 'bg-amber-500 text-black' : 'text-slate-500'}`}>Presets</button>
                          <button onClick={() => setSizeMode('CUSTOM')} className={`px-3 py-1 text-[7px] font-black uppercase rounded-md transition-all ${sizeMode === 'CUSTOM' ? 'bg-blue-500 text-white' : 'text-slate-500'}`}>Custom</button>
                        </div>
                      </div>

                      {sizeMode === 'PRESET' ? (
                        <div className="grid grid-cols-2 gap-2">
                          {PRESET_SIZES.map(s => (
                            <button key={s.label} onClick={() => setStampSize({ w: s.w, h: s.h })} className={`py-2.5 text-[9px] font-bold border rounded-xl transition-all ${stampSize.w === s.w && stampSize.h === s.h ? 'border-amber-500 bg-amber-500/10 text-white shadow-xl' : 'border-white/5 bg-white/5 text-slate-500 hover:text-slate-300'}`}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 p-1">
                          <div className="bg-black/40 border border-white/10 rounded-xl p-2 group hover:border-blue-500/50 transition-all">
                            <label className="text-[7px] font-black text-slate-600 uppercase mb-1 block">Width (cm)</label>
                            <input type="number" value={stampSize.w} onChange={e => setStampSize(prev => ({ ...prev, w: Number(e.target.value) }))} className="w-full bg-transparent text-white text-[10px] font-black outline-none" />
                          </div>
                          <div className="bg-black/40 border border-white/10 rounded-xl p-2 group hover:border-blue-500/50 transition-all">
                            <label className="text-[7px] font-black text-slate-600 uppercase mb-1 block">Depth (cm)</label>
                            <input type="number" value={stampSize.h} onChange={e => setStampSize(prev => ({ ...prev, h: Number(e.target.value) }))} className="w-full bg-transparent text-white text-[10px] font-black outline-none" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTool === 'REFERENCE_SYMBOL' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-2">
                      {['DOOR', 'COLUMN', 'WINDOW', 'PANEL', 'HVAC', 'SECURITY'].map(s => (
                        <button key={s} onClick={() => setSymbolType(s as any)} className={`py-2.5 text-[8px] font-black uppercase rounded-xl transition-all border ${symbolType === s ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-black/40 border-white/5 text-slate-600 hover:text-slate-400'}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTool === 'BAY_DRAFTING' && (
                  <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl text-center">
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-tighter italic">Click en el mapa para iniciar punto A, selecciona punto B para delimitar la bahía.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SIDEBAR */}
        {/* <div className="w-80 border-r border-white/5 p-6 flex flex-col gap-8 bg-black/40 backdrop-blur-xl shrink-0 overflow-y-auto custom-scrollbar">
          {!selectedContainer && siteDimensions?.width && siteDimensions?.length && (
            <div className="p-6 bg-gradient-to-br from-white/[0.03] to-transparent rounded-[32px] border border-white/10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-sky-500" />
              <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Activity className="w-3 h-3 text-sky-500" /> Terrain Analytics
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Master Surface</span>
                  <span className="text-lg font-black text-white italic tracking-tighter">
                    {((siteDimensions.width || 0) * (siteDimensions.length || 0)).toLocaleString()} <span className="text-[10px] text-sky-500 not-italic ml-1">M²</span>
                  </span>
                </div>
                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Boundary Perimeter</span>
                  <span className="text-lg font-black text-white italic tracking-tighter">
                    {(2 * ((siteDimensions.width || 0) + (siteDimensions.length || 0))).toLocaleString()} <span className="text-[10px] text-slate-500 not-italic ml-1">M</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] px-2 italic flex items-center gap-2">
              Infrastructure Assets
              <span className="text-[8px] bg-sky-500/10 text-sky-500 px-1.5 rounded border border-sky-500/20 ml-auto">{persistedRows.length} Bays</span>
            </h3>
            <div className="space-y-2">
              {persistedRows.map(row => (
                <div
                  key={row.id}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] group text-left relative overflow-hidden"
                >
                  <div className="p-2.5 bg-fuchsia-500/10 rounded-xl border border-fuchsia-500/10 text-fuchsia-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-white uppercase tracking-wider truncate">{row.name}</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Physical Partition</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        // PRE-EMPTIVE UX CHECK
                        const hasRacks = localRacks.some(r => r.rowId === row.id);
                        if (hasRacks) {
                          Swal.fire({
                            icon: 'error',
                            title: 'Bahía Ocupada',
                            text: 'No se puede eliminar una bahía que contiene racks. Mueve o elimina los racks primero.',
                            background: '#020617',
                            color: '#fff'
                          });
                          return;
                        }

                        const result = await Swal.fire({
                          title: '¿Eliminar Bahía?',
                          text: "Esta acción eliminará la partición lógica del suelo.",
                          icon: 'warning',
                          showCancelButton: true,
                          confirmButtonColor: '#ef4444',
                          confirmButtonText: 'ELIMINAR',
                          background: '#020617',
                          color: '#fff'
                        });

                        if (result.isConfirmed) {
                          const res = await fetch(`/appm-ems/api/rows/?id=${row.id}`, { method: 'DELETE' });
                          const data = await res.json();
                          if (data.ok) {
                            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Bahía eliminada', showConfirmButton: false, timer: 2000, background: '#020617', color: '#fff' });
                            // Refresh room data
                            const fetchRoom = async () => {
                              const rRes = await fetch(`/appm-ems/api/substructures/?id=${substructureId}&t=${Date.now()}`);
                              const rData = await rRes.json();
                              const obj = Array.isArray(rData.data) ? rData.data[0] : rData.data;
                              if (obj) setPersistedRows(obj.rows || []);
                            };
                            fetchRoom();
                          } else {
                            Swal.fire({ icon: 'error', title: 'Error', text: data.error, background: '#020617', color: '#fff' });
                          }
                        }
                      }}
                      className="p-2 hover:bg-rose-500/10 rounded-lg group/trash transition-all"
                    >
                      <X className="w-3.5 h-3.5 text-slate-700 group-hover/trash:text-rose-500" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div> */}

        {/* MAIN CANVAS */}
        <div className="flex-1 bg-[#01040a] relative overflow-hidden flex items-center justify-center min-w-0" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>

          {/* FLOATING MEMBRETE (DENTRO DEL CANVAS) */}
          <div className="absolute top-8 left-8 z-[100] pointer-events-none">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-[1px] w-8 bg-sky-500" />
                <span className="text-[9px] font-black text-sky-500 uppercase tracking-[0.4em] drop-shadow-md">
                  Infrastructure Digital Twin
                </span>
              </div>
              <h1 className="text-4xl font-black text-white leading-tight uppercase italic tracking-tighter drop-shadow-2xl">
                {resolveValue(substructure.name)}
              </h1>
              <div className="mt-2 flex flex-row justify-between w-full gap-6 border-l border-white/10 pl-4 py-0">
                <div className="flex flex-row items-baseline gap-2">
                  <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-1">Dimensiones</span>
                  <span className="text-[11px] font-black text-white">{(bounds.w / 100).toFixed(2)}m x {(bounds.h / 100).toFixed(2)}m</span>
                </div>
                <div className="flex flex-row items-baseline gap-2">
                  <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-1">Área Total</span>
                  <span className="text-[11px] font-black text-sky-400 italic font-mono tracking-tighter">{((bounds.w * bounds.h) / 10000).toFixed(2)} m²</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Live System Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* FLOATING CONTROLS (TOP RIGHT) */}
          <div className="absolute top-8 right-8 z-[100] flex items-center gap-4">
            <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/10 gap-1 backdrop-blur-md">
              <button onClick={() => setZoom(prev => Math.min(5, prev * 1.2))} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"><Plus className="w-4 h-4" /></button>
              <button onClick={() => setZoom(prev => Math.max(0.5, prev / 1.2))} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"><Maximize2 className="w-4 h-4 scale-75" /></button>
            </div>

            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border backdrop-blur-md ${showHeatmap ? 'bg-orange-500 text-black border-orange-400 shadow-lg shadow-orange-500/30' : 'bg-black/60 text-slate-400 border-white/10 hover:bg-white/10'}`}
            >
              <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'animate-pulse' : ''}`} />
              {showHeatmap ? 'HEATMAP' : 'THERMAL'}
            </button>

            {isAdmin && (
              <div className="flex gap-2 bg-black/60 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
                <button onClick={() => setIsDrafting(!isDrafting)} className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${isDrafting ? 'bg-amber-500 text-black shadow-xl' : 'text-slate-500 hover:text-white'}`}>
                  {isDrafting ? 'Drafting' : 'Edit Mode'}
                </button>
                {isDrafting && (
                  <button onClick={handleSaveEngineering} disabled={isSaving || localElements.length === 0} className="px-4 py-1.5 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-20 flex items-center gap-2">
                    <Save className="w-3 h-3" /> {isSaving ? '...' : 'Save'}
                  </button>
                )}
              </div>
            )}
          </div>
          <svg
            ref={svgRef}
            viewBox={viewBox}
            className="w-full h-full drop-shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500 select-none"
            onClick={handleSvgClick}
          >
            <defs>
              <pattern id="roomGrid" width={TILE_SIZE} height={TILE_SIZE} patternUnits="userSpaceOnUse">
                <path d={`M ${TILE_SIZE} 0 L 0 0 0 ${TILE_SIZE}`} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              </pattern>
              <pattern id="grid30" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
              </pattern>
              <pattern id="grid60" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              </pattern>
              <clipPath id="roomClip">
                {roomPoints ? <polygon points={normalizedPointsString} /> : <rect x={0} y={0} width={bounds.w} height={bounds.h} />}
              </clipPath>
            </defs>
            <rect x={-1000} y={-1000} width={bounds.w + 2000} height={bounds.h + 2000} fill="url(#roomGrid)" />
            <g ref={contentRef} transform={`rotate(${isDrafting && alignmentData ? -alignmentData.angle : 0}, ${alignmentData?.centerX || 0}, ${alignmentData?.centerY || 0})`}>
              <g clipPath="url(#roomClip)">
                {roomPoints ? (
                  <polygon points={normalizedPointsString} fill="#050508" stroke="#3b82f6" strokeWidth={8 / zoom} />
                ) : (
                  <rect x={0} y={0} width={bounds.w} height={bounds.h} fill="#050508" stroke="#3b82f6" strokeWidth={4 / zoom} />
                )}

                {/* DYNAMIC COORDINATE SYSTEM (60x60 Tiles) */}
                {alignmentData && (
                  <g transform={`translate(${alignmentData.oMinX}, ${alignmentData.oMinY}) rotate(${alignmentData.angle}, 0, 0)`}>
                    <rect x={-500} y={-500} width={alignmentData.w + 1000} height={alignmentData.h + 1000} fill="url(#grid30)" opacity={0.5} />
                    <rect x={-500} y={-500} width={alignmentData.w + 1000} height={alignmentData.h + 1000} fill="url(#grid60)" />

                    {Array.from({ length: Math.ceil(alignmentData.h / 60) }).map((_, r) => (
                      Array.from({ length: Math.ceil(alignmentData.w / 60) }).map((_, c) => {
                        const label = `${String.fromCharCode(65 + r)}${c + 1}`;
                        return (
                          <text
                            key={`${r}-${c}`}
                            x={c * 60 + 30}
                            y={r * 60 + 35}
                            textAnchor="middle"
                            className="fill-white/20 font-black pointer-events-none uppercase tracking-tighter"
                            style={{ fontSize: 14 / zoom }}
                          >
                            {label}
                          </text>
                        );
                      })
                    ))}
                  </g>
                )}

                {/* BAYS */}
                {persistedRows.map(row => {
                  if (!row.spatialMetadata) return null;
                  const sm = JSON.parse(row.spatialMetadata);
                  const pts = sm.points ? sm.points.map((p: any) => `${p.x - bounds.minX},${p.y - bounds.minY}`).join(' ') : "";

                  const minX = sm.points ? Math.min(...sm.points.map((p: any) => p.x)) : 0;
                  const maxX = sm.points ? Math.max(...sm.points.map((p: any) => p.x)) : 0;
                  const bayW = maxX - minX;

                  const labelX = (sm.points ? sm.points.reduce((a: any, b: any) => a + b.x, 0) / sm.points.length : 0) - bounds.minX;
                  const labelY = (sm.points ? sm.points.reduce((a: any, b: any) => a + b.y, 0) / sm.points.length : 0) - bounds.minY;

                  return (
                    <g key={row.id}>
                      <polygon points={pts} fill="rgba(217, 70, 239, 0.08)" stroke="#d946ef" strokeWidth={4 / zoom} strokeDasharray="10 5" />
                      <g transform={`translate(${labelX}, ${labelY})`}>
                        <text textAnchor="middle" className="fill-white font-black uppercase tracking-[0.2em]" style={{ fontSize: 36 / zoom, paintOrder: 'stroke', stroke: 'black', strokeWidth: 4 / zoom }}>{row.name}</text>
                        <text y={24 / zoom} textAnchor="middle" className="fill-fuchsia-400 font-bold italic" style={{ fontSize: 16 / zoom }}>{(bayW / 100).toFixed(2)}m Width</text>
                      </g>
                    </g>
                  );
                })}

                {/* RACKS */}
                {localRacks.map(rack => {
                  const sm = typeof rack.spatialMetadata === 'string' ? JSON.parse(rack.spatialMetadata) : rack.spatialMetadata;
                  if (!sm || !sm.points) return null;
                  const pts = sm.points.map((p: any) => `${p.x - bounds.minX},${p.y - bounds.minY}`).join(' ');
                  const lx = (sm.points.reduce((a: any, b: any) => a + b.x, 0) / sm.points.length) - bounds.minX;
                  const ly = (sm.points.reduce((a: any, b: any) => a + b.y, 0) / sm.points.length) - bounds.minY;

                  const heat = calculateRackHeat(rack);
                  const isCabinet = rack.type?.toUpperCase() === 'CABINET';
                  const basePrimary = isCabinet ? '#94a3b8' : '#10b981';
                  const baseFill = isCabinet ? 'rgba(71, 85, 105, 0.2)' : 'rgba(16, 185, 129, 0.15)';

                  const fillColor = showHeatmap ? heat.color : baseFill;
                  const strokeColor = showHeatmap ? heat.color : basePrimary;

                  return (
                    <g key={rack.id} className="cursor-pointer group" onClick={(e) => { e.stopPropagation(); if (!isDrafting) setSelectedContainer(rack); }}>
                      <polygon
                        points={pts}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={(showHeatmap ? 6 : 3) / zoom}
                        className="transition-all duration-700 group-hover:stroke-white"
                        style={{ fillOpacity: showHeatmap ? 0.6 : 0.8 }}
                      />
                      {showHeatmap && (
                        <polygon points={pts} fill={heat.color} className="animate-pulse" style={{ opacity: 0.2 }} />
                      )}
                      <text x={lx} y={ly} textAnchor="middle" alignmentBaseline="middle" className="font-black fill-white uppercase tracking-tighter" style={{ fontSize: 18 / zoom, paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.5)', strokeWidth: 2 / zoom }}>{rack.name}</text>
                    </g>
                  );
                })}

                {/* REFERENCE ICONS & DRAFTING ELEMENTS */}
                {localElements.map(el => {
                  const ptsString = (el.points || []).map((p: any) => `${p.x},${p.y}`).join(' ');
                  if (el.type === 'REFERENCE') {
                    const color = el.symbol === 'DOOR' ? '#ef4444' : (el.symbol === 'COLUMN' ? '#3b82f6' : '#10b981');
                    return (
                      <g key={el.id}>
                        <polygon points={ptsString} fill={`${color}30`} stroke={color} strokeWidth={3 / zoom} />
                        <text x={el.points[0].x} y={el.points[0].y} dy="-5" className="fill-white font-black uppercase" style={{ fontSize: 8 / zoom }}>{el.symbol}</text>
                      </g>
                    );
                  }
                  return (
                    <g key={el.id}>
                      <polygon points={ptsString} fill="rgba(255,255,255,0.05)" stroke="white" strokeWidth={1 / zoom} strokeDasharray="5 5" />
                    </g>
                  );
                })}

                {/* GHOST / ACTIVE DRAFTING FEEDBACK */}
                {activeTool === 'BAY_DRAFTING' && activePoints.length === 1 && ghostPoint && alignmentData && (
                  (() => {
                    const u1 = rotatePoint(activePoints[0].x, activePoints[0].y, -alignmentData.angle, alignmentData.centerX, alignmentData.centerY);
                    const u2 = rotatePoint(ghostPoint.x, ghostPoint.y, -alignmentData.angle, alignmentData.centerX, alignmentData.centerY);
                    const ux = Math.min(u1.x, u2.x);
                    const uy = Math.min(u1.y, u2.y);
                    const uw = Math.abs(u1.x - u2.x);
                    const uh = Math.abs(u1.y - u2.y);
                    const uPts = [{ x: ux, y: uy }, { x: ux + uw, y: uy }, { x: ux + uw, y: uy + uh }, { x: ux, y: uy + uh }];
                    const wPts = uPts.map(p => rotatePoint(p.x, p.y, alignmentData.angle, alignmentData.centerX, alignmentData.centerY));
                    const ptsStr = wPts.map(p => `${p.x},${p.y}`).join(' ');
                    return (
                      <g>
                        <polygon points={ptsStr} fill="rgba(217, 70, 239, 0.2)" stroke="#d946ef" strokeWidth={2 / zoom} strokeDasharray="5 5" />
                        <text x={wPts[0].x} y={wPts[0].y} dy="-10" className="fill-fuchsia-400 font-black" style={{ fontSize: 12 / zoom }}>{(uw / 100).toFixed(2)}m Width</text>
                      </g>
                    );
                  })()
                )}
              </g>
            </g>
          </svg>

          {/* FLOATING LEGEND - Bottom Left */}
          <div className="absolute bottom-8 left-8 z-[160] flex flex-col-reverse items-start gap-4">
            <button
              onClick={() => setIsLegendOpen(!isLegendOpen)}
              className={`p-3 rounded-2xl border transition-all shadow-2xl backdrop-blur-md ${isLegendOpen ? 'bg-accent-primary text-white border-accent-primary' : 'bg-[#0a0a0f]/80 text-slate-400 border-white/10 hover:text-white hover:bg-white/5'}`}
            >
              <Layers className="w-5 h-5" />
            </button>

            {isLegendOpen && (
              <div className="glass-panel p-6 rounded-[32px] border border-white/10 pointer-events-auto bg-[#0a0a0f]/90 backdrop-blur-xl shadow-2xl space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
                <h3 className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] px-1 italic">REFERENCIA TÉCNICA</h3>
                <div className="space-y-3">
                  <LegendItem icon={<div className="w-3 h-3 bg-blue-500 rounded-sm" />} label="Equipos Activos" />
                  <LegendItem icon={<div className="w-3 h-3 bg-fuchsia-500/20 border border-fuchsia-500/50 rounded-sm" />} label="Bahías De Pasillo" />
                  <LegendItem icon={<div className="w-3 h-3 bg-emerald-500/30 border border-emerald-500 rounded-sm" />} label="Racks Estándar" />
                  <LegendItem icon={<div className="w-3 h-3 bg-slate-500/30 border border-slate-400 rounded-sm" />} label="Gabinete/Cabinet" />
                  <LegendItem icon={<div className="text-[10px] font-black text-white/20 leading-none">A1</div>} label="Mosaico 60x60 (A1...)" />
                  <LegendItem icon={<div className="w-3 h-[2px] bg-blue-500 shadow-[0_0_5px_#3b82f6]" />} label="Perímetro De Sala" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedContainer && !onContainerSelect && (
        <RackElevationManager
          container={selectedContainer}
          siteId={substructure?.level?.structure?.siteId}
          onClose={() => setSelectedContainer(null)}
          onUpdate={() => {
            const fetchRoomData = async () => {
              const res = await fetch(`/appm-ems/api/substructures/?id=${substructureId}&t=${Date.now()}`);
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
