"use client"
import React from 'react';
import { BDFBData, getBDFBSummary } from '@/lib/types';
import Link from 'next/link';

interface BDFBSummaryProps {
  bdfb: BDFBData;
}

const BDFBSummary: React.FC<BDFBSummaryProps> = ({ bdfb }) => {
  const summary = getBDFBSummary(bdfb);
  const getPanel = (name: string) => bdfb.panels.find(p => p.name === name);

  return (
    <Link href={`/bdfb/${bdfb.id}`} className="block">
      <div className="glass-panel p-4 rounded-2xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer h-full">

        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-base font-bold text-white leading-tight group-hover:text-accent-primary transition-colors">
              {bdfb.name}
            </h3>
            <p className="text-xs text-slate-400">{bdfb.location}</p>
          </div>
          <button
            className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            title="View PDF Report"
          >
            <svg className="w-4 h-4 text-slate-400 group-hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* Panel Grid */}
        <div className="bdfb-grid mb-3">
          <div className={`bdfb-panel ${getPanel("A2") ? 'active' : ''}`}>A2</div>
          <div className={`bdfb-panel ${getPanel("B2") ? 'active' : ''}`}>B2</div>
          <div className={`bdfb-panel ${getPanel("A1") ? 'active' : ''}`}>A1</div>
          <div className={`bdfb-panel ${getPanel("B1") ? 'active' : ''}`}>B1</div>
        </div>

        {/* Capacity Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <CapacityMetric label="Instalada" value={summary.installed} color="text-slate-200" />
          <CapacityMetric label="Consumida" value={summary.consumed} color="text-success" />
          <CapacityMetric label="Reservada" value={summary.reserved} color="text-warning" />
          <CapacityMetric label="Vacante" value={summary.vacant} color="text-accent-primary" />
        </div>

      </div>
    </Link>
  );
};

const CapacityMetric: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="bg-black/20 px-2 py-1.5 rounded-lg border border-white/5 text-center">
    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">{label}</span>
    <span className={`text-sm font-mono font-bold ${color}`}>{value}</span>
    <span className="text-[9px] text-slate-500"> A</span>
  </div>
);

export default BDFBSummary;