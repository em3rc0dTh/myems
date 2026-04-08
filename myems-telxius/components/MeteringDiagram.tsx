"use client"
import React from 'react';
import { ConnectionMapData } from '@/lib/types';
import { Zap, ShieldCheck } from 'lucide-react';

interface MeteringDiagramProps {
  connection: ConnectionMapData;
  bdfbName: string;
}

const MeteringDiagram: React.FC<MeteringDiagramProps> = ({ connection, bdfbName }) => {
  return (
    <div className="glass-panel p-8 rounded-3xl bg-slate-950/60 border border-white/10 h-full flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
        
        {/* Background Decorative Grid */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none transition-opacity group-hover:opacity-[0.05]" 
             style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        {/* Top Badge: Redundancy Status */}
        <div className="absolute top-6 right-8 flex items-center gap-2 bg-accent-primary/10 border border-accent-primary/20 px-3 py-1.5 rounded-full animate-in slide-in-from-right-4 duration-700">
            <ShieldCheck className="w-3.5 h-3.5 text-accent-primary" />
            <span className="text-[9px] font-black text-accent-primary uppercase tracking-[0.2em]">Vista Redundante A+B</span>
        </div>

        {/* Main Diagram Area */}
        <div className="w-full h-full relative flex items-center justify-between gap-4 z-10 px-4">
            
            {/* 1. LEFT: Network Element (NE) Oval */}
            <div className="relative flex flex-col items-center shrink-0">
                <div className="w-32 h-20 rounded-[100%] bg-indigo-500/10 border-2 border-indigo-400/30 flex flex-col items-center justify-center relative shadow-[0_0_30px_rgba(129,140,248,0.15)] group-hover:border-indigo-400 transition-all">
                    <div className="w-24 h-12 rounded-[100%] bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center">
                        <span className="text-lg font-black text-white tracking-widest leading-none">NE</span>
                    </div>
                </div>
                <div className="mt-4 text-center">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-0.5">Network Element</span>
                    <span className="text-xs font-bold text-white uppercase">{connection.clientName || 'ROUTER-01'}</span>
                </div>
                {/* Port Connection Points */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 flex flex-col gap-6">
                    <span className="w-2 h-2 bg-accent-primary rounded-full shadow-[0_0_8px_#38bdf8]" />
                    <span className="w-2 h-2 bg-white rounded-full shadow-[0_0_8px_#fff]" />
                </div>
            </div>

            {/* 2. CENTER: SVG Paths & Metering Unit */}
            <div className="flex-1 h-full relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 400 300" preserveAspectRatio="none">
                    <defs>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                        <linearGradient id="pathAGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#818cf8" />
                        </linearGradient>
                    </defs>

                    {/* PATH A: Top Path (Primary) */}
                    <path 
                        d="M 0 120 Q 200 120, 400 130" 
                        fill="none" 
                        stroke="url(#pathAGrad)" 
                        strokeWidth="3" 
                        className="opacity-40 group-hover:opacity-80 transition-opacity"
                        filter="url(#glow)"
                    />
                    <circle r="4" fill="#38bdf8">
                        <animateMotion dur="3s" repeatCount="indefinite" path="M 0 120 Q 200 120, 400 130" />
                    </circle>

                    {/* PATH B: Bottom Path (Secondary/Redundant) */}
                    <path 
                        d="M 0 170 Q 200 180, 400 170" 
                        fill="none" 
                        stroke="#fff" 
                        strokeWidth="2" 
                        strokeDasharray="8 4"
                        className="opacity-30 group-hover:opacity-60 transition-opacity"
                    />

                    {/* Metering Dotted Connections */}
                    <line x1="200" y1="120" x2="200" y2="150" stroke="#a855f7" strokeWidth="1" strokeDasharray="2 2" />
                    <line x1="200" y1="180" x2="200" y2="150" stroke="#a855f7" strokeWidth="1" strokeDasharray="2 2" />
                </svg>

                {/* Floating Telemetry Unit (Meter-01) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                    <div className="bg-slate-900/90 border border-purple-500/50 p-3 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.2)] backdrop-blur-md animate-in zoom-in duration-500">
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest block">Telemetría</span>
                            <span className="text-[10px] font-bold text-white uppercase tracking-tighter leading-none mb-2">Meter-01</span>
                            <div className="flex gap-4 border-t border-white/5 pt-2">
                                <div className="text-center">
                                    <span className="text-[6px] text-slate-500 font-mono uppercase block">Port X</span>
                                    <span className="text-[8px] text-purple-300 font-mono">Sens A</span>
                                </div>
                                <div className="w-[1px] h-4 bg-white/10" />
                                <div className="text-center">
                                    <span className="text-[6px] text-slate-500 font-mono uppercase block">Port Y</span>
                                    <span className="text-[8px] text-purple-300 font-mono">Sens B</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Port Labels in Path */}
                <span className="absolute left-4 top-[105px] text-[8px] font-mono font-bold text-accent-primary uppercase tracking-tighter">Port K</span>
                <span className="absolute left-4 top-[175px] text-[8px] font-mono font-bold text-slate-400 uppercase tracking-tighter">Port L</span>
            </div>

            {/* 3. RIGHT: PROVIDER (BDFB-1 / BDFB-2) Block */}
            <div className="relative flex flex-col items-center shrink-0">
                <div className="w-24 h-48 rounded-xl bg-slate-900 border-2 border-accent-primary/20 flex flex-col p-2 relative shadow-inner">
                    <div className="flex-1 flex flex-col gap-2">
                        {/* Section A */}
                        <div className="flex-1 bg-white/[0.03] border border-white/5 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group/port">
                             <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-accent-primary" />
                             <span className="text-[14px] font-black text-accent-primary leading-none">A</span>
                             <span className="text-[7px] text-slate-500 font-mono uppercase mt-1">Port M</span>
                        </div>
                        {/* Section B */}
                        <div className="flex-1 bg-white/[0.03] border border-white/5 rounded-lg flex flex-col items-center justify-center relative">
                             <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-white/20" />
                             <span className="text-[14px] font-black text-white/40 leading-none">B</span>
                             <span className="text-[7px] text-slate-500 font-mono uppercase mt-1">Port N</span>
                        </div>
                    </div>
                    {/* Inner Label */}
                    <div className="absolute -left-6 top-1/2 -rotate-90 origin-center whitespace-nowrap opacity-20">
                        <span className="text-[8px] font-mono uppercase tracking-[0.5em] text-white">REDUNDANT POWER UNIT</span>
                    </div>
                </div>
                <div className="mt-4 text-center">
                    <span className="text-[10px] font-black text-accent-primary uppercase tracking-widest block mb-0.5">Provider</span>
                    <span className="text-xs font-bold text-white uppercase">{bdfbName}</span>
                </div>
            </div>

        </div>

        {/* Floating Icons Label Overlay */}
        <div className="absolute bottom-6 w-full px-12 flex justify-between items-center opacity-30 pointer-events-none">
            <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-accent-primary" />
                <span className="text-[8px] font-mono uppercase tracking-widest text-slate-500">Mapeo Lógico de Conexión</span>
            </div>
            <div className="h-[1px] flex-1 mx-8 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-[8px] font-mono uppercase tracking-widest text-slate-500">Centros de Datos EMS</span>
        </div>

    </div>
  );
};

export default MeteringDiagram;
