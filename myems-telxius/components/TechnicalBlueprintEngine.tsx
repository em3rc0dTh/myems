"use client"
import React, { useMemo, useState, useRef } from 'react';

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

  const getSvgCoords = (e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current) return null;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const transformed = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    
    return { 
      x: Math.round(transformed.x / 10) * 10, // 10cm snapping
      y: Math.round(transformed.y / 10) * 10 
    };
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

  const handleMouseMove = (e: React.MouseEvent) => {
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

  const handleMouseUp = () => {
    setDraggingElement(null);
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isEditable || draggingElement) return;
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

  const boundaryPoints: Point[] = useMemo(() => {
    try {
      return perimeter ? JSON.parse(perimeter) : [
        {x: 0, y: 0}, {x: widthCm, y: 0}, {x: widthCm, y: heightCm}, {x: 0, y: heightCm}
      ];
    } catch {
      return [{x: 0, y: 0}, {x: widthCm, y: 0}, {x: widthCm, y: heightCm}, {x: 0, y: heightCm}];
    }
  }, [perimeter, widthCm, heightCm]);

  const viewBox = `${viewBoxX} ${viewBoxY} ${widthCm} ${heightCm}`;

  return (
    <div 
      className={`relative bg-slate-950 overflow-hidden rounded-[40px] border border-white/5 shadow-2xl ${className}`}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
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
        viewBox={viewBox}
        onClick={handleSvgClick}
        onMouseMove={handleMouseMove}
        className={`w-full h-full drop-shadow-2xl ${isEditable ? (activeTool === 'MOVE' ? 'cursor-grab' : 'cursor-crosshair') : ''}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="blueprint-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>
        </defs>

        {showGrid && <rect x={viewBoxX} y={viewBoxY} width={widthCm} height={heightCm} fill="url(#blueprint-grid)" />}

        {isEditable && activePoints.length > 0 && activeTool === 'POLYGON' && (
          <g>
            <polyline points={activePoints.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 2" />
            {activePoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="8" fill="#3b82f6" className="animate-pulse" />
            ))}
          </g>
        )}

        <polyline points={boundaryPoints.length > 0 ? [...boundaryPoints, boundaryPoints[0]].map(p => `${p.x},${p.y}`).join(' ') : ""} fill="rgba(15, 23, 42, 0.6)" stroke="#475569" strokeWidth="3" />

        {elements.map(zone => (
          <g key={zone.id} onMouseDown={(e) => handleDragStart(e, zone)} className={`${isEditable && activeTool === 'MOVE' ? 'cursor-grab active:cursor-grabbing hover:filter hover:brightness-125' : ''}`}>
            {zone.points && (
              <polygon points={zone.points.map((p: any) => `${p.x},${p.y}`).join(' ')} fill={zone.color || 'rgba(59, 130, 246, 0.1)'} stroke={zone.color || '#3b82f6'} strokeWidth={draggingElement?.id === zone.id ? "3" : "1.5"} strokeDasharray={draggingElement?.id === zone.id ? "" : "4 2"} />
            )}
            {zone.label && zone.points && zone.points.length > 0 && (
              <text x={zone.points[0].x + 5} y={zone.points[0].y + 15} className="fill-white/60 text-[10px] uppercase font-black tracking-widest pointer-events-none italic">
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
