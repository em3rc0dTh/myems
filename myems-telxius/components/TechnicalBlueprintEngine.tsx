"use client"
import React, { useMemo, useState, useRef } from 'react';
import { Plus, Maximize2 } from 'lucide-react';
interface Point {
  x: number;
  y: number;
}

interface BlueprintProps {
  widthCm: number;
  heightCm: number;
  viewBoxX?: number;
  viewBoxY?: number;
  perimeter?: string; // JSON points
  elements?: any[];
  children?: React.ReactNode;
  showGrid?: boolean;
  gridSize?: number;
  className?: string;
  isEditable?: boolean;
  onDrawingComplete?: (points: Point[]) => void;
  onElementAdded?: (element: any) => void;
  onElementUpdated?: (element: any) => void;
  activeTool?: 'POLYGON' | 'CLUSTER_STAMP' | 'MOVE' | null;
  stampSize?: { w: number, h: number };
}

const TechnicalBlueprintEngine: React.FC<BlueprintProps> = ({
  widthCm,
  heightCm,
  viewBoxX = 0,
  viewBoxY = 0,
  perimeter,
  // ... rest of props handle zoom now
  elements = [],
  children,
  showGrid = false,
  gridSize = 60,
  className = "",
  isEditable = false,
  onDrawingComplete,
  onElementAdded,
  onElementUpdated,
  activeTool = 'POLYGON',
  stampSize = { w: 60, h: 60 }
}) => {
  const [activePoints, setActivePoints] = useState<Point[]>([]);
  const [previewStamp, setPreviewStamp] = useState<Point | null>(null);
  const [draggingElement, setDraggingElement] = useState<{ id: string, initialX: number, initialY: number, startX: number, startY: number } | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  // ZOOM & PAN ENGINE
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  const getSvgCoords = (e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current) return null;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const transformed = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    return {
      x: transformed.x,
      y: transformed.y
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditable || activeTool === 'MOVE' || activeTool === null) {
      if (e.button === 0 || e.button === 1) { // Left or middle click for pan
        setIsPanning(true);
        setLastMouse({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleMouseMoveGlobal = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = (e.clientX - lastMouse.x) * (1 / zoom);
      const dy = (e.clientY - lastMouse.y) * (1 / zoom);
      setPan(prev => ({ x: prev.x - dx, y: prev.y - dy }));
      setLastMouse({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!isEditable) return;
    const coords = getSvgCoords(e);
    if (!coords) return;
    // ... rest of logic for drafting ...
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.min(10, Math.max(0.1, prev * delta)));
    }
  };

  const handleDragStart = (e: React.MouseEvent, el: any) => {
    if (!isEditable || activeTool !== 'MOVE' || !el.points || el.points.length === 0) return;
    e.stopPropagation();
    const coords = getSvgCoords(e);
    if (!coords) return;

    setDraggingElement({
      id: el.id,
      initialX: el.points[0].x,
      initialY: el.points[0].y,
      startX: coords.x,
      startY: coords.y
    });
  };

  // const handleMouseMove = (e: React.MouseEvent) => {
  //   if (!isEditable) return;

  //   const coords = getSvgCoords(e);
  //   if (!coords) return;

  //   if (activeTool === 'CLUSTER_STAMP') {
  //     setPreviewStamp(coords);
  //   } else if (draggingElement && onElementUpdated) {
  //     const dx = coords.x - draggingElement.startX;
  //     const dy = coords.y - draggingElement.startY;

  //     const element = elements.find(el => el.id === draggingElement.id);
  //     if (element && element.points) {
  //       const newPoints = element.points.map((p: any) => ({
  //         x: p.x + dx,
  //         y: p.y + dy
  //       }));

  //       const isOutOfBounds = newPoints.some((p: any) => p.x < viewBoxX || p.x > viewBoxX + widthCm || p.y < viewBoxY || p.y > viewBoxY + heightCm);
  //       if (!isOutOfBounds) {
  //         onElementUpdated({ ...element, points: newPoints });
  //         setDraggingElement(prev => prev ? { ...prev, startX: coords.x, startY: coords.y } : null);
  //       }
  //     }
  //   }
  // };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isEditable || draggingElement || isPanning) return;
    const coords = getSvgCoords(e);
    if (!coords) return;

    if (activeTool === 'POLYGON') {
      setActivePoints(prev => [...prev, coords]);
    } else if (activeTool === 'CLUSTER_STAMP' && onElementAdded) {
      onElementAdded({
        id: `cluster-${Date.now()}`,
        type: 'ZONE',
        label: 'New Area',
        points: [
          { x: coords.x, y: coords.y },
          { x: coords.x + stampSize.w, y: coords.y },
          { x: coords.x + stampSize.w, y: coords.y + stampSize.h },
          { x: coords.x, y: coords.y + stampSize.h }
        ]
      });
    }
  };

  const handleFinishDrawing = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePoints.length > 2 && onDrawingComplete) {
      onDrawingComplete(activePoints);
      setActivePoints([]);
    }
  };

  const handleMouseUp = () => {
    setDraggingElement(null);
    setIsPanning(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handling pan/zoom taking precedence
    if (isPanning) {
      const dx = (e.clientX - lastMouse.x) * (1 / (zoom || 1));
      const dy = (e.clientY - lastMouse.y) * (1 / (zoom || 1));
      setPan(prev => ({ x: prev.x - dx, y: prev.y - dy }));
      setLastMouse({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!isEditable) return;

    const coords = getSvgCoords(e);
    if (!coords) return;

    if (activeTool === 'CLUSTER_STAMP') {
      setPreviewStamp(coords);
    } else if (draggingElement && onElementUpdated) {
      const dx = coords.x - draggingElement.startX;
      const dy = coords.y - draggingElement.startY;

      const element = elements.find(el => el.id === draggingElement.id);
      if (element && element.points) {
        const newPoints = element.points.map((p: any) => ({
          x: p.x + dx,
          y: p.y + dy
        }));

        const isOutOfBounds = newPoints.some((p: any) => p.x < viewBoxX || p.x > viewBoxX + widthCm || p.y < viewBoxY || p.y > viewBoxY + heightCm);
        if (!isOutOfBounds) {
          onElementUpdated({ ...element, points: newPoints });
          setDraggingElement(prev => prev ? { ...prev, startX: coords.x, startY: coords.y } : null);
        }
      }
    }
  };

  const dynamicViewBox = useMemo(() => {
    const w = (widthCm || 1000) / (zoom || 1);
    const h = (heightCm || 1000) / (zoom || 1);
    const x = (viewBoxX || 0) + (pan.x || 0);
    const y = (viewBoxY || 0) + (pan.y || 0);
    return `${x} ${y} ${w} ${h}`;
  }, [widthCm, heightCm, viewBoxX, viewBoxY, zoom, pan]);

  const boundaryPoints: Point[] = useMemo(() => {
    try {
      return perimeter ? JSON.parse(perimeter) : [
        { x: viewBoxX, y: viewBoxY }, 
        { x: viewBoxX + widthCm, y: viewBoxY }, 
        { x: viewBoxX + widthCm, y: viewBoxY + heightCm }, 
        { x: viewBoxX, y: viewBoxY + heightCm }
      ];
    } catch {
      return [
        { x: viewBoxX, y: viewBoxY }, 
        { x: viewBoxX + widthCm, y: viewBoxY }, 
        { x: viewBoxX + widthCm, y: viewBoxY + heightCm }, 
        { x: viewBoxX, y: viewBoxY + heightCm }
      ];
    }
  }, [perimeter, widthCm, heightCm, viewBoxX, viewBoxY]);

  return (
    <div
      className={`relative bg-slate-950 overflow-hidden rounded-[20px] border border-white/5 shadow-2xl ${className} select-none`}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
    >
      <div className="absolute bottom-8 right-8 z-[100] flex flex-col gap-2 scale-75 lg:scale-100">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-1 flex flex-col gap-1 shadow-2xl">
          <button
            onClick={() => setZoom(prev => Math.min(10, prev * 1.2))}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(0.1, prev / 1.2))}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <Maximize2 className="w-4 h-4 scale-75" />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="h-10 flex items-center justify-center text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-white px-2"
          >
            Reset
          </button>
        </div>
      </div>

      {isEditable && activeTool === 'POLYGON' && (
        <div className="absolute top-8 left-8 z-[100] flex gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
          <button onClick={handleFinishDrawing} className="bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl shadow-xl shadow-emerald-500/20">
            Completar Perímetro ({activePoints.length})
          </button>
          <button onClick={() => setActivePoints([])} className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl transition-all border border-white/10">
            Borrar
          </button>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={dynamicViewBox}
        onClick={handleSvgClick}
        className={`w-full h-full drop-shadow-2xl transition-viewbox duration-200 ease-out ${isEditable ? (activeTool === 'MOVE' ? 'cursor-grab' : 'cursor-crosshair') : (isPanning ? 'cursor-grabbing' : 'cursor-grab')}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="blueprint-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={1 / zoom} />
          </pattern>
        </defs>

        {showGrid && <rect x={viewBoxX + pan.x} y={viewBoxY + pan.y} width={widthCm / zoom} height={heightCm / zoom} fill="url(#blueprint-grid)" />}

        {isEditable && activePoints.length > 0 && activeTool === 'POLYGON' && (
          <g>
            <polyline points={activePoints.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth={2 / zoom} strokeDasharray={`${4 / zoom} ${2 / zoom}`} />
            {activePoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={8 / zoom} fill="#3b82f6" className="animate-pulse" />
            ))}
          </g>
        )}

        <polyline points={boundaryPoints.length > 0 ? [...boundaryPoints, boundaryPoints[0]].map(p => `${p.x},${p.y}`).join(' ') : ""} fill="rgba(15, 23, 42, 0.6)" stroke="#475569" strokeWidth={3 / zoom} />

        {elements.map(zone => (
          <g key={zone.id} onMouseDown={(e) => handleDragStart(e, zone)} className={`${isEditable && activeTool === 'MOVE' ? 'cursor-grab active:cursor-grabbing hover:filter hover:brightness-125' : ''}`}>
            {zone.points && (
              <polygon points={zone.points.map((p: any) => `${p.x},${p.y}`).join(' ')} fill={zone.color || 'rgba(59, 130, 246, 0.1)'} stroke={zone.color || '#3b82f6'} strokeWidth={(draggingElement?.id === zone.id ? 3 : 1.5) / zoom} strokeDasharray={draggingElement?.id === zone.id ? "" : `${4 / zoom} ${2 / zoom}`} />
            )}
            {zone.label && zone.points && zone.points.length >= 3 && (
              <text 
                x={zone.points.reduce((acc: number, p: any) => acc + p.x, 0) / zone.points.length} 
                y={zone.points.reduce((acc: number, p: any) => acc + p.y, 0) / zone.points.length} 
                textAnchor="middle" 
                dominantBaseline="central"
                className="fill-white font-black uppercase tracking-widest pointer-events-none italic drop-shadow-lg" 
                style={{ fontSize: 48 / zoom }}
              >
                {zone.label}
              </text>
            )}
          </g>
        ))}
        {children}
      </svg>
    </div>
  );
};

export default TechnicalBlueprintEngine;
