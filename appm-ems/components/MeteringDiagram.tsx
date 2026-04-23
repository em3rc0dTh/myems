"use client"
import React from 'react';
import { ConnectionMapData } from '@/lib/types';

interface MeteringDiagramProps {
    connection: ConnectionMapData;
    bdfbName: string;
}

const MeteringDiagram: React.FC<MeteringDiagramProps> = ({ connection, bdfbName }) => {
    return (
        <>
            <div className="relative w-full bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center p-0">
                <svg viewBox="0 0 800 280" className="w-full h-auto drop-shadow-2xl">
                    {/* Network Element (Router) */}
                    <g transform="translate(50, 110)">
                        {/* Smooth 3D Base & Body */}
                        <path d="M 0,40 V 75 A 60,35 0 0,0 120,75 V 40 Z" fill="#1e1b4b" stroke="#3730a3" strokeWidth="2" />
                        {/* Smooth 3D Lid */}
                        <ellipse cx="60" cy="40" rx="60" ry="35" fill="#312e81" stroke="#4338ca" strokeWidth="2" />

                        <path d="M20,40 L100,40 M60,10 L60,70" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                        <text x="60" y="38" textAnchor="middle" fill="#fff" fontWeight="900" fontSize="18" className="tracking-widest drop-shadow">NE</text>
                        <text x="60" y="56" textAnchor="middle" fill="#a5b4fc" fontSize="10" fontWeight="bold">{connection.clientName || 'ROUTER-01'}</text>

                        {/* Ports aligned with side wall */}
                        <circle cx="120" cy="50" r="4" fill="#10b981" />
                        <text x="125" y="53" fill="#10b981" fontSize="8" fontWeight="bold">Port K</text>
                        <circle cx="120" cy="65" r="4" fill="#10b981" />
                        <text x="125" y="68" fill="#10b981" fontSize="8" fontWeight="bold">Port L</text>
                    </g>

                    {/* Metering Device */}
                    <g transform="translate(350, 10)">
                        <rect x="0" y="0" width="100" height="80" rx="8" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
                        <text x="50" y="25" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold" className="uppercase tracking-widest">Telemetría</text>
                        <text x="50" y="45" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">METER-01</text>
                        <path d="M10,60 H90" stroke="#1e293b" strokeDasharray="2 2" />
                        <text x="20" y="72" fill="#8b5cf6" fontSize="8">Port X</text>
                        <text x="80" y="72" textAnchor="end" fill="#8b5cf6" fontSize="8">Port Y</text>
                    </g>

                    {/* BDFB Target */}
                    <g transform="translate(600, 60)">
                        <rect x="0" y="0" width="120" height="200" rx="16" fill="#020617" stroke="#0ea5e9" strokeWidth="4" />
                        <text x="60" y="30" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="900">{bdfbName || 'BDFB-2'}</text>

                        {/* Panel A (Left) */}
                        <rect x="15" y="55" width="40" height="120" rx="6" fill="#0f172a" stroke="#1e293b" />
                        <text x="35" y="85" textAnchor="middle" fill="#0ea5e9" fontSize="20" fontWeight="bold">A</text>
                        <text x="35" y="110" textAnchor="middle" fill="#475569" fontSize="8">Port M</text>
                        <circle cx="35" cy="150" r="4" fill="#10b981" />

                        {/* Panel B (Right) */}
                        <rect x="65" y="55" width="40" height="120" rx="6" fill="#0f172a" stroke="#1e293b" />
                        <text x="85" y="85" textAnchor="middle" fill="#0ea5e9" fontSize="20" fontWeight="bold">B</text>
                        <text x="85" y="110" textAnchor="middle" fill="#475569" fontSize="8">Port N</text>
                        <circle cx="85" cy="150" r="4" fill="#10b981" />

                        {/* Input Coupling Points on Chassis */}
                        <circle cx="0" cy="80" r="4" fill="#020617" stroke="#0ea5e9" strokeWidth="2" />
                        <circle cx="0" cy="140" r="4" fill="#020617" stroke="#0ea5e9" strokeWidth="2" />
                    </g>

                    {/* Connections (Pathways) */}
                    <g className="connections">
                        {/* Feed A */}
                        <path d="M170,160 H400 C500,160 500,140 600,140" fill="none" stroke="#8b5cf6" strokeWidth="4" strokeLinecap="round" />
                        <path d="M170,160 H400 C500,160 500,140 600,140" fill="none" stroke="#a78bfa" strokeWidth="1" strokeDasharray="8 8" className="animate-pulse" />

                        {/* Feed B */}
                        <path d="M170,175 H400 C500,175 500,200 600,200" fill="none" stroke="#8b5cf6" strokeWidth="4" strokeLinecap="round" />
                        <path d="M170,175 H400 C500,175 500,200 600,200" fill="none" stroke="#a78bfa" strokeWidth="1" strokeDasharray="8 8" className="animate-pulse" />

                        {/* Meter Sensors */}
                        <circle cx="300" cy="160" r="10" fill="#020617" stroke="#8b5cf6" strokeWidth="2" />
                        <circle cx="300" cy="160" r="3" fill="#a78bfa" />
                        <path d="M300,150 L370,90" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 2" />
                        <text x="285" y="155" fill="#a78bfa" fontSize="8" fontWeight="bold" textAnchor="end">SENSOR A</text>

                        <circle cx="350" cy="175" r="10" fill="#020617" stroke="#8b5cf6" strokeWidth="2" />
                        <circle cx="350" cy="175" r="3" fill="#a78bfa" />
                        <path d="M350,165 L430,90" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 2" />
                        <text x="335" y="185" fill="#a78bfa" fontSize="8" fontWeight="bold" textAnchor="end">SENSOR B</text>
                    </g>
                </svg>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-8">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-2">Estado NE</span>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-success rounded-full" />
                        <span className="text-sm font-bold text-white">Online</span>
                    </div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-2">Metering Health</span>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-success rounded-full" />
                        <span className="text-sm font-bold text-white">99.8% Accuracy</span>
                    </div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-2">Redundancia</span>
                    <div className="flex items-center gap-2 text-success">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-bold">Activo / Activo</span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MeteringDiagram;
