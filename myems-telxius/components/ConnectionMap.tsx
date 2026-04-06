"use client"
import React from 'react';

const ConnectionMap: React.FC = () => {
  return (
    <div className="glass-panel p-8 rounded-3xl border-white/5 w-full max-w-4xl mx-auto overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="w-1.5 h-6 bg-accent-secondary rounded-full" />
          Diagrama de Conexiones
        </h3>
        <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono text-slate-500 uppercase tracking-widest border border-white/5">
          Vista Redundante A+B
        </span>
      </div>

      <div className="relative w-full aspect-video bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center p-8">
        <svg viewBox="0 0 800 400" className="w-full h-full drop-shadow-2xl">
          {/* Network Element (Router) */}
          <g transform="translate(50, 150)">
            <ellipse cx="60" cy="50" rx="60" ry="35" fill="#1e1b4b" stroke="#3730a3" strokeWidth="3" />
            <ellipse cx="60" cy="40" rx="60" ry="35" fill="#312e81" stroke="#4338ca" strokeWidth="2" />
            <path d="M20,40 L100,40 M60,10 L60,70" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" />
            <text x="60" y="45" textAnchor="middle" fill="#fff" fontWeight="900" fontSize="18" className="tracking-widest">NE</text>
            <text x="60" y="65" textAnchor="middle" fill="#4f46e5" fontSize="10" fontWeight="bold">ROUTER-01</text>
            
            <circle cx="120" cy="30" r="4" fill="#10b981" />
            <text x="125" y="25" fill="#10b981" fontSize="8" fontWeight="bold">Port K</text>
            <circle cx="120" cy="50" r="4" fill="#10b981" />
            <text x="125" y="65" fill="#10b981" fontSize="8" fontWeight="bold">Port L</text>
          </g>

          {/* Metering Device */}
          <g transform="translate(350, 50)">
            <rect x="0" y="0" width="100" height="80" rx="8" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
            <text x="50" y="25" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold" className="uppercase tracking-widest">Telemetría</text>
            <text x="50" y="45" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">METER-01</text>
            <path d="M10,60 H90" stroke="#1e293b" strokeDasharray="2 2" />
            <text x="20" y="72" fill="#8b5cf6" fontSize="8">Port X</text>
            <text x="80" y="72" textAnchor="end" fill="#8b5cf6" fontSize="8">Port Y</text>
          </g>

          {/* BDFB Target */}
          <g transform="translate(600, 100)">
            <rect x="0" y="0" width="120" height="200" rx="16" fill="#020617" stroke="#0ea5e9" strokeWidth="4" />
            <text x="60" y="30" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="900">BDFB-2</text>
            
            <rect x="20" y="60" width="80" height="40" rx="4" fill="#0f172a" stroke="#1e293b" />
            <text x="30" y="85" fill="#0ea5e9" fontSize="12" fontWeight="bold">A</text>
            <text x="45" y="82" fill="#475569" fontSize="8">Port M</text>
            
            <rect x="20" y="120" width="80" height="40" rx="4" fill="#0f172a" stroke="#1e293b" />
            <text x="30" y="145" fill="#0ea5e9" fontSize="12" fontWeight="bold">B</text>
            <text x="45" y="142" fill="#475569" fontSize="8">Port N</text>
          </g>

          {/* Connections (Pathways) */}
          <g className="connections">
            {/* Feed A */}
            <path d="M170,180 Q250,180 320,180 T600,185" fill="none" stroke="#8b5cf6" strokeWidth="4" strokeLinecap="round" />
            <path d="M170,180 Q250,180 320,180 T600,185" fill="none" stroke="#a78bfa" strokeWidth="1" strokeDasharray="8 8" className="animate-pulse" />
            
            {/* Feed B */}
            <path d="M170,200 Q250,200 320,200 T600,245" fill="none" stroke="#8b5cf6" strokeWidth="4" strokeLinecap="round" />
            <path d="M170,200 Q250,200 320,200 T600,245" fill="none" stroke="#a78bfa" strokeWidth="1" strokeDasharray="8 8" className="animate-pulse" />

            {/* Meter Sensors */}
            <circle cx="320" cy="180" r="12" fill="#000" stroke="#8b5cf6" strokeWidth="2" />
            <path d="M320,180 L360,130" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 2" />
            <text x="290" y="184" fill="#8b5cf6" fontSize="8" fontWeight="bold" textAnchor="end">SENSOR A</text>

            <circle cx="320" cy="200" r="12" fill="#000" stroke="#8b5cf6" strokeWidth="2" />
            <path d="M320,200 L440,130" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 2" />
            <text x="290" y="204" fill="#8b5cf6" fontSize="8" fontWeight="bold" textAnchor="end">SENSOR B</text>
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
    </div>
  );
};

export default ConnectionMap;
