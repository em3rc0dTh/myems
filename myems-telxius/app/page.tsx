"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Terminal, ShieldCheck, ArrowRight, Globe, Waves, TrendingUp, Bell, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMqtt } from "../lib/MqttContext";

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
  const padding = 10; // Margen superior/inferior en %

  // Puntos para el path (X de 0-100, Y de 0-100 inverso)
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
        </defs>
        
        {/* Guías de fondo */}
        {[0, 25, 50, 75, 100].map(v => (
          <line key={v} x1="0" y1={v} x2="100" y2={v} stroke="white" strokeOpacity="0.02" strokeWidth="0.1" />
        ))}

        {/* Área rellenada */}
        <motion.polyline
          points={`${points} 100,100 0,100`}
          fill="url(#chartGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />

        {/* Línea de tendencia */}
        <motion.polyline
          points={points}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="0.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Círculo en el punto actual */}
        {data.length > 0 && (
          <motion.circle
            cx="100"
            cy={100 - padding - ((data[data.length - 1] - min) / range) * (100 - padding * 2)}
            r="1"
            fill="#06b6d4"
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        )}
      </svg>
      
      {/* Etiquetas de Ejes */}
      <div className="absolute left-0 top-0 text-[7px] font-mono text-slate-800 uppercase tracking-widest">{max.toFixed(2)} kW</div>
      <div className="absolute left-0 bottom-0 text-[7px] font-mono text-slate-800 uppercase tracking-widest">{min.toFixed(2)} kW</div>
    </div>
  );
};

export default function UltraIntelligenceDashboard() {
  const { latestData, rawLogs, setRawLogs } = useMqtt();
  const [efficiency] = useState(98.2); // Estático para prod por ahora
  const [history, setHistory] = useState<number[]>([]);
  const [logs, setLogs] = useState<{ id: string, msg: string, time: string, level: string }[]>([]);
  const [systemTime, setSystemTime] = useState("");
  const [debugMode, setDebugMode] = useState(false);
  const router = useRouter();

  // Calcular totalPower y devicePowers desde el contexto global (Memoizado)
  const devicePowers = useMemo(() => {
    const powers: Record<string, number> = {};
    Object.keys(latestData).forEach(sn => {
      const data = latestData[sn];
      if (data.reported) {
         let deviceSum = 0;
          const reportedData = data.reported as Record<string, { P1?: string | number }>;
          Object.values(reportedData).forEach((val) => {
            if (val && val.P1 !== undefined) {
              deviceSum += (Number(val.P1) || 0);
            }
          });
         powers[sn] = deviceSum / 1000;
      }
    });
    return powers;
  }, [latestData]);

  const totalPower = useMemo(() => {
    return Object.values(devicePowers).reduce((a, b) => a + b, 0);
  }, [devicePowers]);

  // Sincronizar historial con totalPower si hay cambios
  useEffect(() => {
    if (totalPower > 0) {
      setHistory(prev => [...prev.slice(-29), totalPower]);
    }
  }, [totalPower]);

  // Escucha de Alt+D para Debug Mode (Puerta Trasera)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'd') {
        setDebugMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 3. Sincronizar Logs Operacionales desde la telemetría MQTT
  useEffect(() => {
    if (rawLogs.length > 0) {
      const lastRaw = rawLogs[0];
      const topic = lastRaw.split('] ')[0].replace('[', '') || 'unknown';
      // Generar una entrada "bonita" para la UI principal
      setLogs(prev => {
        const newEntry = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          msg: `MQTT_TELEMETRY: [${topic}] Status Update Received`,
          time: new Date().toLocaleTimeString(),
          level: topic.includes('critical') ? 'WARN' : 'INFO'
        };
        // Solo añadimos si es diferente al anterior mensaje crudo para evitar flooding
        if (prev.length > 0 && prev[0].msg.includes(topic) && prev[0].time === newEntry.time) return prev;
        return [newEntry, ...prev].slice(0, 15);
      });
    }
  }, [rawLogs]);

  // 1. Reloj del Sistema
  useEffect(() => {
    const updateTime = () => setSystemTime(new Date().toLocaleTimeString());
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // 2. Inicialización de historial real desde InfluxDB
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/telxius/api/history/?field=P&range=24h');
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
          const powerPoints = data.map((d: { value: number }) => d.value).slice(-30);
          setHistory(powerPoints);
          // Omitimos setTotalPower aquí para dejar que MQTT tome el control si hay flujo
        }
      } catch {
        console.warn("History fetch failed, using defaults");
      }
    }
    fetchHistory();
  }, []);


  return (
    <div className="h-screen w-screen bg-[#020305] text-slate-500 font-sans p-6 overflow-hidden flex flex-col gap-6 selection:bg-cyan-500/30">

      {/* 1. TOP COMMAND BAR */}
      <header className="flex justify-between items-center bg-[#0a0c12]/40 backdrop-blur-md border border-white/5 p-4 rounded-3xl shrink-0 shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="p-3 bg-cyan-600/10 rounded-2xl border border-cyan-500/20"><Activity className="text-cyan-400 w-6 h-6 animate-pulse" /></div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#020305] rounded-full" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">Telxius <span className="text-cyan-500 font-light">OS 5.0</span></h1>
            <div className="flex items-center gap-2 mt-1 px-1">
              <Globe className="w-3 h-3 text-slate-700" />
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.4em]">Asset Management & Predictive Analytics</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8 pr-4">
          <div className="flex gap-4">
            <MiniGauge val={Math.round(efficiency)} label="Global Efficiency" color="text-cyan-500" />
            <MiniGauge val={84} label="Fleet Utilization" color="text-indigo-500" />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/config')}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
              title="System Configuration"
            >
              <Settings className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 group-hover:rotate-90 transition-all" />
            </button>
            <button
              onClick={() => router.push('/rack')}
              className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-400/50 rounded-2xl flex items-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all group shadow-[0_0_25px_#06b6d433] hover:shadow-[0_0_35_#06b6d455]"
            >
              Infrastructure Access <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN ANALYTICS HUB */}
      <main className="flex-1 grid grid-cols-12 gap-6 min-h-0">

        {/* LEFT: TREND ANALYSIS (BIG CHART) */}
        <section className="col-span-8 bg-[#0a0c12] border border-white/5 rounded-[2.5rem] p-10 flex flex-col relative overflow-hidden group shadow-inner">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-all"><Waves className="w-64 h-64 text-cyan-400" /></div>

          <div className="flex justify-between items-start mb-12 relative z-10">
            <div>
              <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.5em] block mb-2">Live Grid Visualization</span>
              <div className="text-8xl font-mono font-black text-white tracking-tighter leading-none flex items-baseline">
                {totalPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span className="text-3xl text-slate-800 ml-4 font-light">kW</span>
              </div>
              <div className="flex items-center gap-2 mt-4 text-emerald-500 text-[10px] font-bold uppercase tracking-widest bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10 inline-flex">
                <TrendingUp className="w-3.5 h-3.5" /> Stable Performance
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-700 uppercase mb-4">Core Telemetry [S-40]</div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                <div className="flex flex-col"><span className="text-[8px] text-slate-600 uppercase font-bold">Voltage</span><span className="text-lg font-mono text-white">224.5V</span></div>
                <div className="flex flex-col"><span className="text-[8px] text-slate-600 uppercase font-bold">Freq</span><span className="text-lg font-mono text-white">50.0Hz</span></div>
              </div>
            </div>
          </div>

          <ModernTrendChart data={history.length > 0 ? history : [0, 0, 0]} />
        </section>

        {/* RIGHT: OPERATIONS & SYSTEM HEALTH */}
        <section className="col-span-4 flex flex-col gap-6 min-h-0">
          <div className="flex-1 bg-[#0a0c12] border border-white/5 rounded-[2rem] flex flex-col overflow-hidden shadow-2xl hover:border-white/10 transition-colors">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Terminal className="text-slate-600 w-4 h-4" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operation Logs</span>
              </div>
              <Bell className="w-4 h-4 text-slate-800" />
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scroll">
              <AnimatePresence initial={false}>
                {logs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`flex flex-col gap-1 p-3 rounded-xl border border-white/[0.03] transition-all hover:bg-white/[0.02] ${log.level === 'WARN' ? 'border-amber-500/20' : ''}`}
                  >
                    <div className="flex justify-between items-center text-[8px] font-bold">
                      <span className={log.level === 'WARN' ? 'text-amber-500' : 'text-cyan-500/50'}>SYSTEM_{log.level}</span>
                      <span className="text-slate-700 font-mono">{log.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium tracking-tight uppercase italic">{log.msg}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-600/10 to-transparent border border-cyan-500/20 rounded-[2rem] p-6 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[9px] font-black text-white uppercase tracking-widest">Network Shield</span>
              <ShieldCheck className="text-emerald-500 w-5 h-5" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-600 uppercase">Gateway Load</span>
                <span className="text-xs font-mono text-white">Low</span>
              </div>
              <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full w-[22%] bg-emerald-500" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 3. FOOTER: REAL-TIME DATA RIBBON */}
      <footer className="h-12 bg-[#0a0c12]/80 backdrop-blur-xl border border-white/5 rounded-2xl flex justify-between items-center px-8 shrink-0 relative overflow-hidden">
        <div className="flex gap-12 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_5px_#06b6d4]" />
            <span>Core-Sync: Healthy</span>
          </div>
          <div>Location: Data Center Alpha</div>
          <div className="text-cyan-500/50">Encrypted Gateway active [TLS 1.3]</div>
        </div>
        <div className="text-[10px] font-mono text-slate-700 relative z-10 uppercase tracking-widest">
            SYSTEM CLOCK: {systemTime || "Initializing..."}
        </div>
        <div className="absolute top-0 bottom-0 left-0 w-24 bg-gradient-to-r from-cyan-500/5 via-transparent to-transparent" />
      </footer>

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 3px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #1a202c; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #2d3748; }
      `}</style>
      
      {/* 4. DEBUG OVERLAY (ALT+D TRIGGER) */}
      <AnimatePresence>
        {debugMode && (
          <motion.div 
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed inset-y-0 right-0 w-96 bg-black/95 backdrop-blur-3xl border-l border-white/5 z-[100] p-6 shadow-[-50px_0_100px_rgba(0,0,0,0.8)] flex flex-col font-mono"
          >
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Telxius Raw Telemetry</span>
              <div onClick={() => setDebugMode(false)} className="cursor-pointer text-slate-700 hover:text-white transition-colors">✕</div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 custom-scroll text-[9px] text-slate-500">
              {rawLogs.length === 0 && <div className="italic text-slate-800">Waiting for MQTT/API tramas...</div>}
              {rawLogs.map((log, i) => (
                <div key={i} className="p-2 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                  <span className="text-[7px] text-cyan-500/50 block mb-1">RX_{new Date().toLocaleTimeString()}</span>
                  <div className="break-all text-slate-300 leading-relaxed">{log}</div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
               <button onClick={() => setRawLogs([])} className="text-[8px] font-black text-slate-700 hover:text-cyan-400 uppercase tracking-widest transition-colors">Clear Console</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
