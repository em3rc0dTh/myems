"use client"
import React from 'react';
import { BDFBData } from '@/lib/types';
import Link from 'next/link';

interface BDFBSummaryProps {
  bdfb: BDFBData;
}

const BDFBSummary: React.FC<BDFBSummaryProps> = ({ bdfb }) => {
  // Mock summary calculation based on panels
  const summary = {
    installed: bdfb.panels.reduce((acc, p) => acc + p.installedCapacity, 0),
    consumed: bdfb.panels.reduce((acc, p) => acc + p.consumedCapacity, 0),
    reserved: bdfb.panels.reduce((acc, p) => acc + p.reservedCapacity, 0),
    vacant: bdfb.panels.reduce((acc, p) => acc + (p.installedCapacity - p.consumedCapacity - p.reservedCapacity), 0),
  };

  return (
    <Link href={`/bdfb/${bdfb.id}`} className="block h-full group">
      <div className="glass-panel p-6 rounded-3xl bg-slate-950/40 border border-white/5 hover:border-fuchsia-500/30 hover:shadow-[0_0_40px_rgba(232,121,249,0.1)] transition-all duration-500 cursor-pointer h-full flex flex-col relative overflow-hidden">

        {/* Background Glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-fuchsia-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-fuchsia-500/10 transition-colors" />

        {/* Header */}
        <div className="flex justify-between items-start mb-1 shrink-0 relative z-10">
          <div>
            <h3 className="text-xl font-black text-white leading-tight tracking-tight group-hover:text-fuchsia-400 transition-colors uppercase italic">
              {bdfb.name}
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{bdfb.location}</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_#10b981] animate-pulse" />
        </div>

        {/* MANDATORY CHASSIS REPRESENTATION (Miniature) */}
        <div className="flex-1 flex flex-col items-center justify-center py-1 relative z-10">
          <div className="relative w-24 flex flex-col items-center">
            {/* U-Frame Shell */}
            <div className="w-full aspect-[3/4] border-t border-x border-fuchsia-500/60 rounded-t-lg bg-black/40 shadow-inner group-hover:border-fuchsia-400 transition-colors">
              {/* Panel Status Matrix (Dynamic based on DB) */}
              <div className={`absolute inset-x-2 top-3 bottom-6 grid ${bdfb.panels.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 overflow-hidden`}>
                {(() => {
                  const pinned = bdfb.panels.filter((p: any) => p.isPinned);
                  const toShow = pinned.length > 0 ? pinned : bdfb.panels;

                  if (toShow.length === 0) {
                    return (
                      <div className="col-span-full h-full flex items-center justify-center opacity-20 text-center px-4">
                        <span className="text-[6px] font-bold uppercase tracking-widest text-slate-500">Chasis Vacío</span>
                      </div>
                    );
                  }

                  return toShow.map(p => (
                    <div key={p.id} className="flex flex-col items-center justify-center bg-white/[0.03] border border-white/5 rounded-sm p-1">
                      <span className="text-[7px] font-black text-slate-500 group-hover:text-slate-300 transition-colors truncate w-full text-center uppercase tracking-tighter">
                        {p.name.replace('Panel ', '')}
                      </span>
                      <div className="w-1.5 h-0.5 bg-fuchsia-500/40 rounded-full mt-0.5" />
                    </div>
                  ));
                })()}
              </div>
              {/* Space label */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                <span className="text-[6px] text-slate-700 font-mono uppercase tracking-widest"></span>
              </div>
            </div>
            {/* Base Wings */}
            <div className="w-[140%] h-[1px] bg-fuchsia-500/60 shadow-[0_0_10px_#f0abfc] relative">
              <div className="absolute -top-0.5 left-0 w-1 h-1 rounded-full bg-fuchsia-500" />
              <div className="absolute -top-0.5 right-0 w-1 h-1 rounded-full bg-fuchsia-500" />
            </div>
          </div>
        </div>

        {/* Capacity Metrics List */}
        <div className="grid grid-cols-2 gap-1 mt-1 relative z-10">
          <CapacityMetric label="Instalada" value={summary.installed} color="text-slate-300" />
          <CapacityMetric label="Consumida" value={summary.consumed} color="text-success" />
          <CapacityMetric label="Reservada" value={summary.reserved} color="text-warning" />
          <CapacityMetric label="Vacante" value={summary.vacant} color="text-fuchsia-400" />
        </div>

      </div>
    </Link>
  );
};

const CapacityMetric: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="bg-black/40 px-3 py-2 rounded-xl border border-white/5 flex flex-col items-center">
    <span className="text-[7px] uppercase tracking-[0.2em] text-slate-600 font-black block mb-1">{label}</span>
    <div className="flex items-baseline gap-1">
      <span className={`text-xs font-mono font-bold ${color} tracking-widest`}>{value}</span>
      <span className="text-[7px] text-slate-700 font-mono">A</span>
    </div>
  </div>
);

export default BDFBSummary;