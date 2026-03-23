"use client";

import React, { useState, useEffect } from 'react';
import { useMqtt } from "@/lib/MqttContext";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';

// Tipos de datos para telemetría y configuración
interface PortData { 
    id: string; 
    logicalId: string;
    status: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'VACANT'; 
    power: number; 
    voltage: number; 
    current: number; 
    pf: number; 
    energy: number;
    equipment?: string;
    limit: number;
}

interface ReportedPortData {
    I1?: string;
    P1?: string;
    U1?: string;
    PF1?: string;
    EP1?: string;
}

interface TelemetryMessage {
    sn: string;
    reported: Record<string, ReportedPortData>;
}

const AMPS_THRESHOLD_DEFAULT = 30.0; // Umbral de alarma por defecto

export default function ModuleDetail() {
    const { latestData } = useMqtt();
    const { id } = useParams();
    const searchParams = useSearchParams();
    const sn = searchParams.get('sn');
    const router = useRouter();

    // Sincronización continua de Puertos desde Datos Globales (Sin Latencia)
    useEffect(() => {
        if (!sn || !latestData[sn]) return;
        const data = latestData[sn] as unknown as TelemetryMessage;
        if (!data.reported) return;

        setPorts(prev => {
            let changed = false;
            const newPorts = prev.map(p => {
                const r = data.reported[p.logicalId];
                if (!r) return p;

                changed = true;
                const curr = parseFloat(r.I1 || '0') || 0;
                const limit = p.limit;
                
                let status: PortData['status'] = 'VACANT';
                if (curr >= limit) status = 'CRITICAL';
                else if (curr >= limit * 0.8) status = 'WARNING';
                else if (curr > 0.02) status = 'NORMAL';

                return {
                    ...p,
                    status,
                    power: parseFloat(r.P1 || '0') || 0,
                    voltage: parseFloat(r.U1 || '0') || 0,
                    current: curr,
                    pf: parseFloat(r.PF1 || '0.99') || 0.99,
                    energy: parseFloat(r.EP1 || '0') || 0
                };
            });

            if (!changed) return prev;

            const active = newPorts.filter(p => p.status !== 'VACANT');
            setGlobalStats({
                totalPower: newPorts.reduce((acc, p) => acc + p.power, 0),
                avgVoltage: active.length > 0 ? active.reduce((acc, p) => acc + p.voltage, 0) / active.length : 0,
                activeCount: active.length
            });

            return newPorts;
        });
    }, [latestData, sn]);
    
    // Inicialización de 24 puertos (Estado Limpio para Producción)
    const [ports, setPorts] = useState<PortData[]>(
        Array.from({ length: 24 }, (_, i) => ({ 
            id: `P${(i + 1).toString().padStart(2, '0')}`,
            logicalId: `0_1_${i + 1}`,
            status: 'VACANT', 
            power: 0, 
            voltage: 0, 
            current: 0, 
            pf: 1.0, 
            energy: 0,
            equipment: undefined,
            limit: AMPS_THRESHOLD_DEFAULT
        }))
    );

    const [globalStats, setGlobalStats] = useState({ totalPower: 0, avgVoltage: 0, activeCount: 0 });

    // Carga de estado inicial desde InfluxDB (Memoria Histórica)
    useEffect(() => {
        if (!sn) return;
        async function loadLastState() {
            try {
                // Pedimos el último estado de potencia (P) para inicializar
                const res = await fetch(`/telxius/api/history/?sn=${sn}&field=P&range=1h`);
                const data = await res.json();
                
                if (Array.isArray(data) && data.length > 0) {
                    setPorts(prev => {
                        const newPorts = prev.map(p => {
                            // Buscamos el registro que coincida con el logicalId (0_1_X_P)
                            const match = data.find((d: { field: string, value: number }) => d.field.startsWith(p.logicalId));
                            if (!match) return p;
                            
                            // Re-calculamos status básico
                            const pVal = match.value;
                            const currentSim = pVal / 220; // Estimación simple para el inicio
                            let status: PortData['status'] = 'VACANT';
                            if (currentSim >= p.limit) status = 'CRITICAL';
                            else if (currentSim >= p.limit * 0.8) status = 'WARNING';
                            else if (currentSim > 0.02) status = 'NORMAL';

                            return { ...p, power: pVal, voltage: 220, current: currentSim, status };
                        });
                        return newPorts;
                    });
                }
            } catch (e) {
                console.warn("Could not pre-load InfluxDB state", e);
            }
        }
        loadLastState();
    }, [sn]);


    // Función de ayuda para colores
    const getColorClass = (status: PortData['status']) => {
        switch (status) {
            case 'CRITICAL': return 'text-rose-500 border-rose-500/20 bg-rose-500/5 shadow-[0_0_15px_rgba(244,63,94,0.1)]';
            case 'WARNING': return 'text-amber-500 border-amber-500/20 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
            case 'NORMAL': return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
            default: return 'text-slate-600 border-white/5 bg-transparent';
        }
    };

    return (
        <div className="h-screen w-screen bg-[#020305] text-slate-500 font-sans p-6 overflow-hidden flex flex-col gap-6">
            
            {/* NAVIGATION & HEADER */}
            <header className="flex justify-between items-center bg-[#0a0c12]/40 backdrop-blur-xl border border-white/5 p-4 rounded-3xl shrink-0">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => router.push('/rack')} 
                        className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
                    >
                        <ArrowLeft className="w-5 h-5 text-white group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">
                                Panel Analysis <span className="text-cyan-500">[{id}]</span>
                            </h1>
                            <div className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-md text-[8px] font-bold text-cyan-400 uppercase tracking-widest">Live Flow</div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-600 uppercase mt-1 block">SN: {sn}</span>
                    </div>
                </div>

                <div className="flex gap-4 pr-2">
                    <div className="px-5 py-2 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center">
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Total Demand</span>
                        <span className="text-sm font-mono font-bold text-white">{(globalStats.totalPower/1000).toFixed(3)} kW</span>
                    </div>
                    <div className="px-5 py-2 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center">
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Active Links</span>
                        <span className="text-sm font-mono font-bold text-emerald-500">{globalStats.activeCount} / 24</span>
                    </div>
                </div>
            </header>

            {/* MAIN GRID - 24 POSITIONS */}
            <main className="flex-1 overflow-y-auto custom-scroll pr-2">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <AnimatePresence>
                        {ports.map((p) => (
                            <motion.div
                                key={p.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`p-4 border rounded-[2rem] transition-all relative group overflow-hidden ${getColorClass(p.status)}`}
                            >
                                {/* Background Highlight */}
                                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-125 transition-transform"><Zap className="w-20 h-20" /></div>
                                
                                <div className="flex justify-between items-start relative z-10 mb-4">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black opacity-40 uppercase tracking-[0.2em] font-mono leading-none">{p.id}</span>
                                        <span className="text-[7px] font-bold text-slate-500 uppercase mt-1 truncate max-w-[80px]">{p.logicalId}</span>
                                    </div>
                                    <div className={`p-1 rounded-full ${p.status === 'VACANT' ? 'bg-slate-800' : 'animate-pulse bg-current opacity-80'}`}>
                                        {p.status === 'CRITICAL' && <AlertTriangle className="w-3 h-3" />}
                                        {p.status === 'NORMAL' && <ShieldCheck className="w-3 h-3" />}
                                    </div>
                                </div>

                                <div className="mb-6 relative z-10">
                                    <div className="text-4xl font-mono font-black tracking-tighter leading-none flex items-baseline gap-1">
                                        {p.current.toFixed(2)}
                                        <span className="text-xs font-light opacity-30 italic">A</span>
                                    </div>
                                    {p.equipment ? (
                                        <span className="text-[9px] font-bold italic text-white/60 block mt-2 uppercase tracking-wide truncate">{p.equipment}</span>
                                    ) : (
                                        <span className="text-[8px] font-medium text-slate-700/50 block mt-2 uppercase tracking-widest">No Asset Assigned</span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/[0.05] relative z-10">
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-black opacity-30 uppercase tracking-[0.1em]">Load (W)</span>
                                        <span className="text-[11px] font-mono font-bold text-white/80">{p.power.toFixed(1)}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[7px] font-black opacity-30 uppercase tracking-[0.1em]">Voltage</span>
                                        <span className="text-[11px] font-mono font-bold text-white/80">{p.voltage.toFixed(1)}V</span>
                                    </div>
                                </div>

                                {/* Status Bar Overlay */}
                                <div className={`absolute bottom-0 left-0 w-full h-1 opacity-20 ${p.status === 'CRITICAL' ? 'bg-rose-500' : p.status === 'WARNING' ? 'bg-amber-500' : p.status === 'NORMAL' ? 'bg-emerald-500' : 'bg-transparent'}`} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </main>

            <style jsx global>{`
                .custom-scroll::-webkit-scrollbar { width: 4px; }
                .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-scroll::-webkit-scrollbar-thumb { background: #111827; border-radius: 10px; }
                .custom-scroll::-webkit-scrollbar-thumb:hover { background: #1f2937; }
            `}</style>
        </div>
    );
}
