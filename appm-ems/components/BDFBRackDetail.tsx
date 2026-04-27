"use client"
import React from 'react';

interface Breaker {
  id: string;
  position: number;
  status: 'occupied' | 'empty';
  label?: string;
  voltage?: string;
  current?: string;
  online?: boolean;
  power?: string;
  energy?: string;
  isMapped?: boolean;
}

interface BDFBRackDetailProps {
  panelName: string;
  breakers: Breaker[];
  mappedPositions?: number[];
  onPositionClick?: (panelName: string, breaker: Breaker) => void;
}

const BDFBRackDetail: React.FC<BDFBRackDetailProps> = ({ panelName, breakers, mappedPositions = [], onPositionClick }) => {
  const matrix = Array.from({ length: 24 }, (_, i) => {
    // Reorder for 2-column vertical flow: 1-12 in col 1, 13-24 in col 2
    // If i is even (0, 2, 4...), it's the left column: position is (i/2) + 1
    // If i is odd (1, 3, 5...), it's the right column: position is (Math.floor(i/2)) + 13
    const pos = i % 2 === 0 ? (i / 2) + 1 : Math.floor(i / 2) + 13;
    const breaker = breakers.find(b => b.position === pos);
    return breaker || { id: `empty-${pos}`, position: pos, status: 'empty' as const };
  });

  return (
    <div className="bg-[#0f111a] p-4 rounded-[32px] border border-white/5 h-full flex flex-col shadow-2xl relative overflow-hidden text-left">
      {/* Texture/Industrial Background Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

      {/* Panel Header */}
      <div className="flex items-center justify-between mb-4 px-2 shrink-0 relative z-10">
        <div className="flex flex-col">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Distribution Unit</h4>
          <h3 className="text-sm font-black text-white uppercase tracking-tighter italic">Panel {panelName} <span className="text-accent-primary ml-2">24 POSITIONS</span></h3>
        </div>
        <div className="flex gap-1">
          <div className="w-1 h-1 rounded-full bg-emerald-500/50 shadow-[0_0_5px_#10b981]" />
          <div className="w-1 h-1 rounded-full bg-slate-800" />
        </div>
      </div>

      {/* The 24 positions grid */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1 relative z-10">
        {matrix.map((b) => {
          const isOccupied = b.status === 'occupied';
          const isOnline = b.online !== false;
          const ledColor = !isOccupied ? 'bg-slate-800' : (isOnline ? 'bg-[#10b981] shadow-[0_0_10px_#10b981]' : 'bg-[#f43f5e] shadow-[0_0_10px_#f43f5e]');

          return (
            <div
              key={b.id}
              onClick={() => onPositionClick && onPositionClick(panelName, b)}
              className={`
                relative h-10 rounded-lg border flex items-center px-3 transition-all cursor-pointer group
                ${isOccupied
                  ? 'bg-gradient-to-r from-slate-900 to-slate-800/50 border-slate-700/50 hover:border-accent-primary'
                  : 'bg-black/20 border-white/5 border-dashed hover:border-white/10'}
              `}
            >
              {/* ID Plate */}
              <div className="w-6 shrink-0 flex items-center justify-center border-r border-white/5 mr-3 h-full">
                <span className="text-[9px] font-black text-slate-500 font-mono">{b.position.toString().padStart(2, '0')}</span>
              </div>

              {/* Info Area */}
              <div className="flex-1 flex flex-row min-w-0 justify-between">
                {isOccupied ? (
                  <>
                    <span className="text-[14px] font-black text-white truncate uppercase tracking-tight leading-tight group-hover:text-accent-primary transition-colors">
                      {b.label || 'LOAD_PORT'}
                    </span>
                    <div className="flex items-center gap-1.5 opacity-60 text-left">
                      <span className="text-[12px] font-mono font-bold text-slate-400">{b.voltage || '48.0'}V</span>
                      <div className="w-[1px] h-1.5 bg-slate-700" />
                      <span className="text-[12px] font-mono font-bold text-slate-400">{b.current || '0.0'}A</span>
                    </div>
                  </>
                ) : (
                  <span className="text-[12px] font-black text-slate-700 italic uppercase tracking-widest">Empty</span>
                )}
              </div>

              {/* THE LED INDICATOR (RIGHT SIDE) */}
              <div className="ml-2 shrink-0 flex items-center">
                <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${ledColor}`} />
              </div>

              {/* Mapping Indicator Hook */}
              {isOccupied && mappedPositions.includes(b.position) && (
                <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-accent-primary/20 rounded-bl-lg border-b border-l border-accent-primary/30" />
              )}
            </div>
          );
        })}
      </div>

      {/* Panel Footer / Branding */}
      <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center shrink-0 opacity-40">
        <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.3em]">Hardware v2.4 • Millimetric Monitoring</span>
        <div className="flex gap-4">
          <div className="h-1 w-8 bg-slate-800 rounded-full" />
          <div className="h-1 w-4 bg-slate-800 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default BDFBRackDetail;
