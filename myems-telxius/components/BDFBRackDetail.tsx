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
}

interface BDFBRackDetailProps {
  panelName: string;
  breakers: Breaker[];
  onPositionClick?: (panelName: string, breaker: Breaker) => void;
}

const BDFBRackDetail: React.FC<BDFBRackDetailProps> = ({ panelName, breakers, onPositionClick }) => {
  // Assume a 2x6 or similar matrix for the physical rack representation
  const matrix = Array.from({ length: 24 }, (_, i) => {
    const breaker = breakers.find(b => b.position === i + 1);
    return breaker || { id: `empty-${i}`, position: i + 1, status: 'empty' as const };
  });

  return (
    <div className="glass-panel p-6 rounded-2xl border-white/5 h-full">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-1 h-1 bg-accent-primary rounded-full" />
          Vista Rack: Panel {panelName}
        </h4>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
          Posiciones 1-24
        </span>
      </div>

      <div className="grid grid-cols-2 gap-y-1 gap-x-2">
        {matrix.map((b) => (
          <div
            key={b.id}
            onClick={() => onPositionClick && onPositionClick(panelName, b)}
            className={`
        relative rounded-md border px-2 py-1 min-w-0 transition-all cursor-pointer group
        ${b.status === 'occupied'
                ? 'bg-slate-900 border-slate-700 hover:border-accent-primary hover:scale-[1.02] shadow-lg shadow-black/40'
                : 'bg-transparent border-dashed border-white/5 hover:border-white/20'}
      `}
          >
            {b.status === 'occupied' ? (
              <>
                {/* barra */}
                <div className={`absolute top-0 left-0 w-full h-[2px] ${b.online === false ? 'bg-slate-700' : 'bg-accent-primary/30'}`}>
                  {b.online !== false && (
                    <div className="h-full bg-accent-primary w-1/3 animate-pulse" />
                  )}
                </div>

                {/* grid interno */}
                <div className="grid grid-cols-[auto_1fr_auto] items-center text-[10px] gap-1 min-w-0">

                  {/* Pos */}
                  <span className="font-bold text-slate-400 whitespace-nowrap">
                    Pos {b.position}
                  </span>

                  {/* Label */}
                  <span className="text-slate-300 font-mono truncate overflow-hidden whitespace-nowrap text-center">
                    {b.label || 'Occupied'}
                  </span>

                  {/* Métricas */}
                  <span className="text-right font-mono whitespace-nowrap">
                    {b.voltage ? (
                      <>
                        <span className="text-accent-primary">{b.voltage}V</span>
                        <span className="text-slate-500 mx-1">|</span>
                        <span className="text-accent-secondary">{b.current}A</span>
                      </>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </span>

                </div>
              </>
            ) : (
              <div className="grid grid-cols-[auto_1fr_auto] text-[10px] text-slate-700 italic min-w-0">
                <span className="whitespace-nowrap">Pos {b.position}</span>
                <span className="text-center truncate">Vacío</span>
                <span className="text-right whitespace-nowrap">—</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BDFBRackDetail;
