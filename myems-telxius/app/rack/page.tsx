"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, ArrowLeft, Thermometer, Droplets } from 'lucide-react';
import { useRouter } from 'next/navigation';
import mqtt from 'mqtt';

interface RackModule {
    id: string;
    label: string;
    sn: string;
    temp: number;
    hum: number;
    fans: string;
    ports: Record<string, any>;
}

export default function InfrastructureControl() {
    const [rack, setRack] = useState<Record<string, RackModule>>({});
    const router = useRouter();

    // Carga de configuración real desde LocalStorage (Inicialización Diferida)
    useEffect(() => {
        const load = () => {
            const savedQdfs = localStorage.getItem('telxius_qdfs');
            const savedMeters = localStorage.getItem('telxius_meters');
            
            if (savedQdfs && savedMeters) {
                const qdfs = JSON.parse(savedQdfs);
                const meters = JSON.parse(savedMeters);
                
                const newRack: Record<string, RackModule> = {};
                qdfs.forEach((qdf: any) => {
                    const meter = meters.find((m: any) => m.qdfId === qdf.id);
                    newRack[qdf.name] = {
                        id: qdf.name,
                        label: qdf.room + ' (Feed ' + qdf.feeds + ')',
                        sn: meter ? meter.serial : 'NOT_PAIRED',
                        temp: 0, 
                        hum: 0, 
                        fans: 'Auto',
                        ports: {}
                    };
                });
                setRack(newRack);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const url = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const client = mqtt.connect(`${url}${window.location.host}/mqtt/`, {
            username: 'th-testing-2w', password: 'Aa12345678@@',
            clientId: 'telxius_rack_mgr_' + Math.random().toString(16).substring(2, 6),
        });

        client.on('connect', () => client.subscribe('data/dev/#'));
        client.on('message', (_, msg) => {
            try {
                const data = JSON.parse(msg.toString());
                if (data.sn && data.reported) {
                    setRack(prev => {
                        const key = Object.keys(prev).find(k => prev[k].sn === data.sn);
                        if (!key) return prev;

                        const next = { ...prev };
                        // Solo actualizamos con data real de MQTT
                        next[key] = {
                            ...next[key],
                            // Actualizamos temp y hum solo si vienen en el payload (ajusta según tu sensor real)
                            temp: parseFloat(data.reported.TEMP) || next[key].temp,
                            hum: parseFloat(data.reported.HUM) || next[key].hum,
                            ports: { ...next[key].ports, ...data.reported }
                        };
                        return { ...next };
                    });
                }
            } catch (e) { }
        });
        return () => { client.end(); };
    }, [rack]);

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
                    const portList = Object.values(mod.ports) as any[];
                    const totalKW = portList.reduce((acc: number, p: any) => acc + (parseFloat(p.P1) || 0), 0) / 1000;
                    const activeCount = portList.filter((p: any) => p.state === 'ONLINE' || (parseFloat(p.P1) > 0)).length;

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
