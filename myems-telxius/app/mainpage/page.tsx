"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Terminal, ShieldCheck, ArrowRight, Globe, Waves, TrendingUp, Bell, Settings, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMqtt } from "../../lib/MqttContext";

// Componente Reutilizable para Mini-Indicadores
const MiniGauge = ({ val, label, color }: { val: number, label: string, color: string }) => (
  <div className="flex flex-col items-center gap-2 px-4 py-2 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden group">
    <div className={`text-xs font-mono font-bold ${color} group-hover:scale-110 transition-transform`}>{val}%</div>
    <div className="w-10 h-1 bg-slate-900 rounded-full overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: `${val}%` }} className={`h-full ${color.replace('text', 'bg')}`} />
    </div>
    <span className="text-[7px] text-slate-600 font-bold uppercase tracking-widest">{label}</span>
  </div>
);

// Componente de Gráfico de Tendencia Moderno
const ModernTrendChart = ({ data }: { data: number[] }) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const padding = 10;

  const points = data.length > 1
    ? data.map((val, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - padding - ((val - min) / range) * (100 - padding * 2);
      return `${x},${y}`;
    }).join(' ')
    : "0,50 100,50";

  return (
    <div className="flex-1 w-full relative min-h-0 mt-8 mb-4">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
          <filter id="neon">
            <feGaussianBlur stdDeviation="0.4" result="blur"/>
            <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {[0, 25, 50, 75, 100].map(v => (
          <line key={v} x1="0" y1={v} x2="100" y2={v} stroke="white" strokeOpacity="0.02" strokeWidth="0.1" />
        ))}

        <motion.polyline
          points={`${points} 100,100 0,100`}
          fill="url(#chartGradient)"
        />

        <motion.polyline
          points={points}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="0.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#neon)"
        />
      </svg>

      <div className="absolute left-0 top-0 text-[8px] font-mono text-cyan-500/50 uppercase tracking-widest">{max.toFixed(2)} kW</div>
      <div className="absolute left-0 bottom-0 text-[8px] font-mono text-cyan-500/50 uppercase tracking-widest">{min.toFixed(2)} kW</div>
    </div>
  );
};

export default function UltraIntelligenceDashboard() {
  const { latestData, rawLogs, setRawLogs } = useMqtt();
  const [history, setHistory] = useState<number[]>([]);
  const [logs, setLogs] = useState<{ id: string, msg: string, time: string, level: string }[]>([]);
  const [systemTime, setSystemTime] = useState("");
  const [debugMode, setDebugMode] = useState(false);
  const router = useRouter();

  // Calcular totalPower global desde MQTT
  const totalPower = useMemo(() => {
    let sum = 0;
    Object.values(latestData).forEach((device: any) => {
        if (device.reported) {
            Object.values(device.reported).forEach((val: any) => {
                if (val && val.P1 !== undefined) sum += (Number(val.P1) || 0);
            });
        }
    });
    return sum / 1000;
  }, [latestData]);

  useEffect(() => {
    if (totalPower > 0) {
      setHistory(prev => [...prev.slice(-49), totalPower]);
    }
  }, [totalPower]);

  // Manejo de Alt+D (Backdoor Diagnostic) - MODO AGRESIVO PARA OVERRIDE
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Capturamos tanto Alt+D como Alt+Q (por si el navegador bloquea Alt+D)
      if (e.altKey && (e.key.toLowerCase() === 'd' || e.key.toLowerCase() === 'q')) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Diagnostic trigger detected:", e.key);
        setDebugMode(prev => !prev);
        return false;
      }
    };

    // Usamos addEventListener con capture: true para intentar ganar al navegador
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // Sync System Clock
  useEffect(() => {
    const itv = setInterval(() => setSystemTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(itv);
  }, []);

  // Fetch initial history from InfluxDB
  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('/api/history?field=P1&range=24h');
        const d = await r.json();
        if (Array.isArray(d)) setHistory(d.map(p => p.value).slice(-50));
      } catch (e) { console.error(e); }
    }
    load();
  }, []);

  return (
    <div className="h-screen w-screen bg-[#020305] text-slate-500 font-sans p-6 overflow-hidden flex flex-col gap-6 selection:bg-cyan-500/30">
      
      {/* SCANLINES EFFECT OVER EVERYTHING */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />

      {/* TOP COMMAND BAR */}
      <header className="flex justify-between items-center bg-[#0a0c12]/40 backdrop-blur-md border border-white/5 p-4 rounded-3xl shrink-0">
        <div className="flex items-center gap-5">
          <div className="p-3 bg-cyan-600/10 rounded-2xl border border-cyan-500/20 relative">
            <Activity className="text-cyan-400 w-6 h-6 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#020305] rounded-full animate-ping" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">Telxius <span className="text-cyan-500 font-light">CORE</span></h1>
            <span className="text-[7px] font-bold text-slate-600 uppercase tracking-[0.4em]">Infrastructure Operating System</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <MiniGauge val={98} label="Stability" color="text-emerald-500" />
            <MiniGauge val={24} label="Compute" color="text-cyan-500" />
          </div>
          <button
              onClick={() => router.push('/rooms')}
              className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-400/50 rounded-2xl flex items-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all group shadow-[0_0_25px_#06b6d433]"
            >
              Access Digital Twin <ArrowRight className="w-4 h-4 group-hover:translate-x-1" />
          </button>
        </div>
      </header>

      {/* MAIN ANALYTICS HUB */}
      <main className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* BIG TREND CHART */}
        <section className="col-span-8 bg-[#0a0c12]/60 border border-white/5 rounded-[2.5rem] p-10 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:opacity-[0.05] transition-all"><Waves className="w-64 h-64 text-cyan-400" /></div>
          
          <div className="flex justify-between items-start mb-6 z-10">
            <div>
              <span className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.5em] block mb-2">Live Grid Load</span>
              <div className="text-8xl font-mono font-black text-white tracking-tighter leading-none">
                {totalPower.toFixed(2)}<span className="text-2xl text-slate-800 ml-3">kW</span>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              <div className="text-[8px] font-mono text-emerald-500 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10 uppercase animate-pulse">Data Sync Active</div>
              <TrendingUp className="w-8 h-8 text-slate-800" />
            </div>
          </div>

          <ModernTrendChart data={history.length > 0 ? history : [0,0,0]} />
        </section>

        {/* OPERATIONS & SYSTEM HEALTH */}
        <section className="col-span-4 flex flex-col gap-6 min-h-0">
          <div className="flex-1 bg-[#0a0c12]/60 border border-white/5 rounded-[2rem] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Real-Time Event Log</span>
                <Terminal className="text-slate-800 w-4 h-4" />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar font-mono">
                {rawLogs.slice(0, 20).map((log, i) => (
                    <div key={i} className="text-[10px] text-slate-500 hover:text-cyan-400 transition-colors py-1 border-b border-white/[0.02]">
                        <span className="text-slate-700 mr-2">[{new Date().toLocaleTimeString()}]</span> {log.split(']').pop()}
                    </div>
                ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600/10 to-transparent border border-indigo-500/20 rounded-[2rem] p-8 flex flex-col justify-between">
             <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Security Shield</span>
                <ShieldCheck className="text-emerald-500 w-5 h-5" />
             </div>
             <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
                <motion.div animate={{ width: '92%' }} className="h-full bg-emerald-500" />
             </div>
          </div>
        </section>
      </main>

      {/* FOOTER RAINBOW */}      <footer className="h-10 bg-[#0a0c12]/40 border border-white/5 rounded-2xl flex justify-between items-center px-8 shrink-0 relative overflow-hidden">
        <div className="flex gap-8 text-[8px] font-black text-slate-600 uppercase tracking-widest font-mono">
           <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
             SYNC_HEALTH: OPTIMAL
           </div>
           <div>ENCRYPTION: AES-256</div>
        </div>
        <div className="text-[9px] font-mono text-slate-500">{systemTime}</div>
        <div className="absolute top-0 bottom-0 left-0 w-32 bg-cyan-500/5 animate-scan" style={{ animationDuration: '4s' }} />
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(14, 165, 233, 0.2); border-radius: 4px; }
        .animate-scan { animation: scan 3s linear infinite; }
        @keyframes scan { from { transform: translateX(-100%); } to { transform: translateX(500%); } }
      `}</style>
    </div>
  );
}
