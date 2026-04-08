"use client"
import React, { useMemo, useState, useEffect } from 'react';
import { Substructure, Position } from '@/lib/types';
import { ChevronRight, Globe, MousePointer2 } from 'lucide-react';

interface RoomViewProps {
  substructure: Substructure;
  positions: Position[];
  onSelectBDFB: (id: string | null) => void;
}

const RoomView: React.FC<RoomViewProps> = ({ substructure, positions, onSelectBDFB }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Parse perimeter and reference points
  const perimeter: [number, number][] = useMemo(() => {
    try {
      return substructure.perimeter ? JSON.parse(substructure.perimeter) : [[0, 0], [600, 0], [600, 480], [0, 480]];
    } catch {
      return [[0, 0], [600, 0], [600, 480], [0, 480]];
    }
  }, [substructure.perimeter]);

  const referencePoints = useMemo(() => {
    try {
      return substructure.referencePoints ? JSON.parse(substructure.referencePoints) : [{ x: 580, y: 10, type: 'DOOR', label: 'ACCESO PRINCIPAL' }];
    } catch {
      return [];
    }
  }, [substructure.referencePoints]);

  // Calculate Bounding Box for SVG ViewBox
  const viewBox = useMemo(() => {
    const xs = [...perimeter.map(p => p[0]), ...positions.map(p => (substructure.gridCols.indexOf(p.col) * 60) + (p.physWidthCm || 60))];
    const ys = [...perimeter.map(p => p[1]), ...positions.map(p => (substructure.gridRows.indexOf(p.row) * 60) + (p.physDepthCm || 60))];
    const minX = Math.min(...xs, 0) - 40;
    const minY = Math.min(...ys, 0) - 40;
    const maxX = Math.max(...xs, 600) + 40;
    const maxY = Math.max(...ys, 480) + 40;
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  }, [perimeter, positions, substructure.gridRows, substructure.gridCols]);

  return (
    <div className="flex flex-col h-full select-none overflow-hidden pb-4">
      {/* Header with Hierarchical Breadcrumbs */}
      <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-md relative z-30">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
            <Globe className="w-2.5 h-2.5" />
            <span>{substructure.siteName || 'Telxius Global'}</span>
            <ChevronRight className="w-2.5 h-2.5 opacity-30" />
            <span>{substructure.buildingName || 'Central Office'}</span>
            <ChevronRight className="w-2.5 h-2.5 opacity-30" />
            <span className="text-slate-400">Digital Twin Engine</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-widest uppercase italic leading-none">{substructure.name}</h2>
        </div>

        <div className="flex gap-6">
          <LegendItem
            icon={<div className="w-3 h-3 border-t-2 border-x-2 border-fuchsia-500 rounded-t-sm" />}
            label="Equipos (BDFB/Rack)"
          />
          <LegendItem
            icon={<div className="w-3 h-3 border border-white/10 bg-white/5" />}
            label="Tiles Referencia (60x60)"
          />
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="flex-1 relative bg-radial from-slate-900 via-black to-black overflow-hidden flex items-center justify-center p-8">
        {!isMounted ? (
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Iniciando Digital Twin...</span>
          </div>
        ) : (
          <svg
            viewBox={viewBox}
            className="w-full h-full max-w-[1200px] drop-shadow-[0_0_50px_rgba(0,0,0,0.8)] px-10"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* DEFINITIONS for Gradients and Masks */}
            <defs>
              <pattern id="gridPattern" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
              </pattern>
              <radialGradient id="gradRoom" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="rgba(30,41,59,0.1)" />
                <stop offset="100%" stopColor="rgba(15,23,42,0.4)" />
              </radialGradient>
            </defs>

            {/* LAYER 0: Theoretical Grid (Ghost Tiles) */}
            <rect x="-1000" y="-1000" width="3000" height="3000" fill="url(#gridPattern)" />

            {/* LAYER 1: Room Perimeter (Polygonal Walls) */}
            <polygon
              points={perimeter.map(p => p.join(',')).join(' ')}
              fill="url(#gradRoom)"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="2"
              strokeDasharray="4 2"
            />

            {/* LAYER 1.5: Styled Bay Boxes (Based on Mockup Visualization) */}
            {(['C', 'G', 'K']).map((bayRow, idx) => {
              const ri = substructure.gridRows.indexOf(bayRow);
              if (ri === -1) return null;

              const colors = [
                { main: '#d946ef', name: 'BAHÍA A' }, // Fuchsia
                { main: '#06b6d4', name: 'BAHÍA B' }, // Cyan
                { main: '#f59e0b', name: 'BAHÍA C' }  // Amber/Orange
              ];
              const { main, name } = colors[idx];
              const x = 60; // Starts at col 2
              const y = ri * 60;
              const w = 10 * 60;
              const h = 60;

              return (
                <g key={`bay-group-${bayRow}`}>
                  {/* Bay Border Outline */}
                  <rect
                    x={x} y={y} width={w} height={h}
                    fill="none"
                    stroke={main}
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                    rx="4"
                  />

                  {/* Top Label Tag */}
                  <text
                    x={x + 10} y={y - 8}
                    className="font-black text-[10px] uppercase tracking-widest"
                    fill={main}
                  >
                    {name}
                  </text>

                  {/* Bottom Dimension Indicator */}
                  <text
                    x={x + w / 2} y={y + h + 15}
                    textAnchor="middle"
                    className="font-black text-[7px] uppercase tracking-[0.2em] fill-slate-600"
                  >
                    10t × 1t
                  </text>

                  {/* Faint Inner Fill */}
                  <rect
                    x={x} y={y} width={w} height={h}
                    fill={main} fillOpacity="0.03"
                    rx="4"
                    className="pointer-events-none"
                  />
                </g>
              );
            })}

            {/* External Outline for Depth Effect (Restored but Sharp) */}
            <polygon
              points={perimeter.map(p => p.join(',')).join(' ')}
              fill="none"
              stroke="rgba(99,102,241,0.15)"
              strokeWidth="6"
              className=""
            />

            {/* LAYER 2: Reference Markers (Doors, etc.) */}
            {referencePoints.map((point: { x: number, y: number, type: string, label: string }, idx: number) => (
              <g key={idx} transform={`translate(${point.x}, ${point.y})`}>
                {point.type === 'DOOR' && (
                  <g transform={`rotate(${point.x > 500 ? 0 : 180})`}>
                    {/* Swing Path */}
                    <path
                      d="M 30 0 A 30 30 0 0 0 0 30"
                      fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="3 2"
                    />
                    {/* Door Leaf */}
                    <line x1="30" y1="0" x2="30" y2="30" stroke="#475569" strokeWidth="2.5" />
                  </g>
                )}
                <text
                  y={point.y > 400 ? -15 : 45}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-black tracking-tighter uppercase"
                >
                  {point.label}
                </text>
              </g>
            ))}

            {/* LAYER 3: Equipment Positions */}
            {positions.map((pos) => {
              const ri = substructure.gridRows.indexOf(pos.row);
              const ci = substructure.gridCols.indexOf(pos.col);
              if (ri === -1 || ci === -1) return null;

              // Coordinate from theoretical grid + offsets
              const x = (ci * 60) + (pos.physOffsetX || 0);
              const y = (ri * 60) + (pos.physOffsetY || 0);
              const w = pos.physWidthCm || 60;
              const h = pos.physDepthCm || 60;
              const isBDFB = pos.label?.startsWith('BDFB');

              // Determine highlighting based on influence zones
              const isHighlighted = hoveredZone && (pos.deviceId === hoveredZone || pos.fedBy === hoveredZone);
              const isDimmed = hoveredZone && !isHighlighted;

              return (
                <g
                  key={pos.id}
                  className={`cursor-pointer group transition-opacity duration-300 ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
                  onClick={() => pos.deviceId ? onSelectBDFB(pos.deviceId) : onSelectBDFB(null)}
                  onMouseEnter={() => setHoveredZone(isBDFB ? pos.deviceId || null : pos.fedBy || null)}
                  onMouseLeave={() => setHoveredZone(null)}
                >
                  {/* 1. Underlying Theoretical Tile Shadow */}
                  <rect
                    x={ci * 60} y={ri * 60}
                    width={pos.widthUnits * 60} height={pos.depthUnits * 60}
                    className="fill-white/[0.02] stroke-white/5"
                  />

                  {/* 2. Physical Container (Full Color Fill) */}
                  <rect
                    x={x} y={y}
                    width={w} height={h}
                    fill={
                      isHighlighted ? (isBDFB ? 'rgba(217, 70, 239, 0.6)' : 'rgba(217, 70, 239, 0.2)') : /* Zonas de influencia Highlight */
                        isBDFB ? 'rgba(217, 70, 239, 0.25)' :
                          pos.label?.startsWith('MEGA') ? 'rgba(6, 182, 212, 0.25)' :
                            pos.status === 'OCCUPIED' ? 'rgba(71, 85, 105, 0.6)' :
                              'rgba(255,255,255,0.02)'
                    }
                    stroke={
                      isHighlighted ? '#d946ef' : /* Glow border when in active zone */
                        isBDFB ? '#d946ef' :
                          pos.label?.startsWith('MEGA') ? '#06b6d4' :
                            pos.status === 'OCCUPIED' ? '#94a3b8' :
                              'rgba(255,255,255,0.1)'
                    }
                    strokeWidth={pos.status === 'OCCUPIED' || isHighlighted ? "2" : "1"}
                    className={`transition-all duration-300 ${isHighlighted ? 'drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]' : 'group-hover:brightness-125'}`}
                  />

                  {/* 3. Icons / Internal Details */}
                  {isBDFB && (
                    <g transform={`translate(${x}, ${y})`}>
                      {/* Panel A1 */}
                      <rect x={w * 0.1} y={h * 0.1} width={w * 0.35} height={h * 0.3} fill="#d946ef" fillOpacity="0.4" rx="2" />
                      <text x={w * 0.275} y={h * 0.3} textAnchor="middle" className="fill-white font-black text-[6px]">A1</text>

                      {/* Panel B1 */}
                      <rect x={w * 0.55} y={h * 0.1} width={w * 0.35} height={h * 0.3} fill="#d946ef" fillOpacity="0.4" rx="2" />
                      <text x={w * 0.725} y={h * 0.3} textAnchor="middle" className="fill-white font-black text-[6px]">B1</text>

                      {/* Panel A2 */}
                      <rect x={w * 0.1} y={h * 0.5} width={w * 0.35} height={h * 0.3} fill="#d946ef" fillOpacity="0.4" rx="2" />
                      <text x={w * 0.275} y={h * 0.7} textAnchor="middle" className="fill-white font-black text-[6px]">A2</text>

                      {/* Panel B2 */}
                      <rect x={w * 0.55} y={h * 0.5} width={w * 0.35} height={h * 0.3} fill="#d946ef" fillOpacity="0.4" rx="2" />
                      <text x={w * 0.725} y={h * 0.7} textAnchor="middle" className="fill-white font-black text-[6px]">B2</text>

                      {/* Space Label */}
                      <text x={w * 0.5} y={h * 0.92} textAnchor="middle" className="fill-fuchsia-500/40 font-black text-[4px] uppercase tracking-widest"></text>
                    </g>
                  )}

                  {pos.label?.startsWith('MEGA') && (
                    <g transform={`translate(${x}, ${y})`}>
                      {/* Horizontal server tray lines */}
                      <line x1="10" y1={h * 0.3} x2={w - 10} y2={h * 0.3} stroke="#06b6d4" strokeWidth="2" opacity="0.5" />
                      <line x1="10" y1={h * 0.5} x2={w - 10} y2={h * 0.5} stroke="#06b6d4" strokeWidth="2" opacity="0.5" />
                      <line x1="10" y1={h * 0.7} x2={w - 10} y2={h * 0.7} stroke="#06b6d4" strokeWidth="2" opacity="0.5" />
                    </g>
                  )}

                  {/* 4. Labels (only on hover or if label exists) */}
                  <text
                    x={x + w / 2} y={y + h + 15}
                    textAnchor="middle"
                    className="fill-slate-400 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {pos.label || `${pos.row}${pos.col}`}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* Floating Tooltip Helper */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-xl border border-white/5 py-2.5 px-6 rounded-full shadow-2xl">
          <MousePointer2 className="w-3 h-3 text-accent-primary" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vista Top-Down • Escala Real 1cm:1px</span>
          <div className="w-[1px] h-3 bg-white/10 mx-1" />
          <span className="text-[9px] font-black text-white uppercase tracking-widest">SALA-01 Telxius</span>
        </div>
      </div>

      {/* Simplified Footer Summary */}
      <div className="px-6 py-2 flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-widest bg-black/20">
        <div className="flex gap-4">
          <span>Posiciones: {positions.length}</span>
          <span className="text-accent-primary">Ocupadas: {positions.filter(p => p.status === 'OCCUPIED').length}</span>
          <span className="text-warning">Reservadas: {positions.filter(p => p.status === 'RESERVED').length}</span>
          <span>Vacantes: {positions.filter(p => p.status === 'EMPTY').length}</span>
        </div>
        <div className="text-slate-400 italic">Unidad de Medida Balodsa Estándar (Tile): 60x60 CM</div>
      </div>
    </div>
  );
};

const LegendItem: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-2.5">
    <div className="opacity-80 scale-75">{icon}</div>
    <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.15em]">{label}</span>
  </div>
);

export default RoomView;
