"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, ArrowLeft, Thermometer, Droplets } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMqtt } from "@/lib/MqttContext";

interface PortReport {
    P1?: string;
    I1?: string;
    U1?: string;
    state?: string;
    [key: string]: string | number | undefined;
}

interface RackModule {
    id: string;
    label: string;
    sn: string;
    temp: number;
    hum: number;
    fans: string;
    ports: Record<string, PortReport>;
}

interface MqttData {
    sn: string;
    reported?: {
        TEMP?: string;
        HUM?: string;
    } & Record<string, unknown>;
}

export default function InfrastructureControl() {
    const { latestData } = useMqtt();
    const [rack, setRack] = useState<Record<string, RackModule>>({});
    const router = useRouter();

    // Sincronización continua con los datos globales de MQTT
    useEffect(() => {
        if (Object.keys(latestData).length === 0) return;

        setRack(prev => {
            const next = { ...prev };
            let changed = false;

            (Object.values(latestData) as unknown as MqttData[]).forEach((data) => {
                const key = Object.keys(next).find(k => next[k].sn === data.sn);
                if (key && data.reported) {
                    changed = true;
                    const reported = data.reported;
                    next[key] = {
                        ...next[key],
                        temp: parseFloat(reported.TEMP || "0") || next[key].temp,
                        hum: parseFloat(reported.HUM || "0") || next[key].hum,
                        ports: { ...next[key].ports, ...(reported as unknown as Record<string, PortReport>) }
                    };
                }
            });

            return changed ? { ...next } : prev;
        });
    }, [latestData]);

    // Carga de configuración real desde la base de datos (Ingesta Cascading)
    useEffect(() => {
        const fetchInfrastructure = async () => {
            try {
                const res = await fetch('/telxius/api/bdfb-dashboard');
                if (res.ok) {
                    const data = await res.json();
                    const newRack: Record<string, RackModule> = {};
                    
                    data.forEach((bdfb: any) => {
                        newRack[bdfb.id] = {
                            id: bdfb.name,
                            label: bdfb.location,
                            sn: bdfb.sn || bdfb.id,
                            temp: 0,
                            hum: 0,
                            fans: 'Auto',
                            ports: {}
                        };
                    });
                    setRack(newRack);
                }
            } catch (error) {
                console.error("Critical: Failed to sync rack config with DB", error);
            }
        };
        fetchInfrastructure();
    }, []);


    return (
        <div className="h-screen w-screen bg-[#020305] text-slate-400 font-sans p-8 overflow-hidden flex flex-col gap-8">
            <header className="flex justify-between items-center shrink-0">
                <button onClick={() => router.push('/')} className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full flex items-center gap-3 text-[10px] font-black uppercase tracking-widest italic transition-all group"><ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Dashboard</button>
                <div className="text-right">
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Control Center</h1>
                    <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.4em] mt-2 underline decoration-cyan-500/30 underline-offset-4">Cluster Deployment Alpha</p>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-2 gap-6 min-h-0">
                {Object.entries(rack).map(([key, mod]) => {
                    const portList = Object.values(mod.ports);
                    const totalKW = portList.reduce((acc: number, p) => acc + (parseFloat(p.P1 || "0") || 0), 0) / 1000;
                    const activeCount = portList.filter((p) => {
                        const power = parseFloat(p.P1 || "0") || 0;
                        const state = p.state || "";
                        // Un puerto es "Active" si reporta potencia > 0 y su estado no es OFFLINE
                        return power > 0.1 && state !== 'OFFLINE';
                    }).length;

                    return (
                        <motion.div
                            key={key}
                            whileHover={{ scale: 0.99, borderColor: 'rgba(6,182,212,0.3)' }}
                            onClick={() => router.push(`/module/${key}?sn=${mod.sn}`)}
                            className="bg-[#0a0c12] border border-white/5 p-8 rounded-[2.5rem] cursor-pointer group hover:bg-[#0e1018] transition-all relative overflow-hidden flex flex-col shadow-2xl"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-all text-white"><Server className="w-48 h-48" /></div>

                            <div className="flex justify-between items-top mb-10 relative z-10">
                                <div>
                                    <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em] mb-2 block font-mono">{mod.sn}</span>
                                    <h2 className="text-5xl font-black text-white tracking-tighter italic leading-none">{mod.id}</h2>
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2 block">{mod.label}</span>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex flex-col items-end gap-1"><Thermometer className="w-3 h-3 text-amber-500" /><span className="text-xs font-mono text-white">{mod.temp.toFixed(1)}°C</span></div>
                                    <div className="flex flex-col items-end gap-1"><Droplets className="w-3 h-3 text-cyan-500" /><span className="text-xs font-mono text-white">{mod.hum}%</span></div>
                                </div>
                            </div>

                            <div className="mt-auto grid grid-cols-2 gap-8 relative z-10 bg-white/[0.01] p-6 rounded-2xl border border-white/5">
                                <div>
                                    <span className="text-[9px] font-black text-slate-600 uppercase block mb-1">Total Power</span>
                                    <span className="text-4xl font-mono font-bold text-white tracking-tighter leading-none">{totalKW.toFixed(3)}<span className="text-sm font-light text-slate-700 ml-2">kW</span></span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] font-black text-slate-600 uppercase block mb-1">Ports Reporting</span>
                                    <div className="flex items-center justify-end gap-2 text-3xl font-mono font-bold text-emerald-500 leading-none">
                                        {activeCount}<span className="text-xs font-light text-slate-800 ml-1">/ 24</span>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute top-0 left-0 h-full w-1.5 bg-cyan-600 opacity-20 group-hover:opacity-100 transition-all" />
                        </motion.div>
                    );
                })}
            </main>
        </div>
    );
}
