"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Save, 
    Plus, 
    Trash2, 
    Building2, 
    Cpu, 
    Zap, 
    ArrowLeft,
    CheckCircle2,
    Settings
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Interfaces del Modelo de Datos Extraído
interface QDFConfig {
    id: string;
    name: string;
    room: string;
    site: string;
    row: string;
    col: string;
    capacity: number;
    feeds: 'A' | 'A+B';
}

interface MeterDeviceConfig {
    id: string;
    serial: string;
    qdfId: string;
    panel: 'A1' | 'A2' | 'B1' | 'B2';
}

interface PortMapping {
    meterId: string;
    portIdx: number;
    targetPanel: string;
    targetSlot: string;
}

export default function ConfigPanel() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'QDF' | 'METERS' | 'MAPPING'>('QDF');
    const [selectedMeterId, setSelectedMeterId] = useState<string>('');
    
    // Inicializadores perezosos
    const [qdfs, setQdfs] = useState<QDFConfig[]>([]);
    const [meters, setMeters] = useState<MeterDeviceConfig[]>([]);
    const [mappings, setMappings] = useState<PortMapping[]>([]);

    useEffect(() => {
        const savedQdfs = localStorage.getItem('appm_qdfs');
        const savedMeters = localStorage.getItem('appm_meters');
        const savedMappings = localStorage.getItem('appm_mappings');
        
        if (savedQdfs) setQdfs(JSON.parse(savedQdfs));
        if (savedMeters) setMeters(JSON.parse(savedMeters));
        if (savedMappings) setMappings(JSON.parse(savedMappings));
    }, []);

    const [saved, setSaved] = useState(false);

    const saveToLocal = () => {
        localStorage.setItem('appm_qdfs', JSON.stringify(qdfs));
        localStorage.setItem('appm_meters', JSON.stringify(meters));
        localStorage.setItem('appm_mappings', JSON.stringify(mappings));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const updateMapping = (portIdx: number, field: keyof PortMapping, value: string) => {
        if (!selectedMeterId) return;
        const newMappings = [...mappings];
        const existingIdx = newMappings.findIndex(m => m.meterId === selectedMeterId && m.portIdx === portIdx);
        
        if (existingIdx > -1) {
            const item = { ...newMappings[existingIdx] };
            if (field === 'targetPanel') item.targetPanel = value;
            if (field === 'targetSlot') item.targetSlot = value;
            newMappings[existingIdx] = item;
        } else {
            const newMap: PortMapping = { 
                meterId: selectedMeterId, 
                portIdx, 
                targetPanel: field === 'targetPanel' ? value : 'A1', 
                targetSlot: field === 'targetSlot' ? value : (portIdx + 1).toString().padStart(2, '0') 
            };
            newMappings.push(newMap);
        }
        setMappings(newMappings);
    };

    const getMapping = (portIdx: number) => {
        return mappings.find(m => m.meterId === selectedMeterId && m.portIdx === portIdx) || { targetPanel: 'A1', targetSlot: '' };
    };

    const addQDF = () => {
        const newQdf: QDFConfig = {
            id: `qdf-${Date.now()}`,
            name: `QDF-NEW-${qdfs.length + 1}`,
            room: 'Main Hall',
            site: 'Alpha DC',
            row: '01',
            col: '01',
            capacity: 1600,
            feeds: 'A+B'
        };
        setQdfs([...qdfs, newQdf]);
    };

    const addMeter = () => {
        const newMeter: MeterDeviceConfig = {
            id: `meter-${Date.now()}`,
            serial: '251107...',
            qdfId: qdfs[0]?.id || '',
            panel: 'A1'
        };
        setMeters([...meters, newMeter]);
    };

    return (
        <div className="h-screen w-screen bg-[#020305] text-slate-500 font-sans p-6 overflow-hidden flex flex-col gap-6">
            
            {/* CONFIG HEADER */}
            <header className="flex justify-between items-center bg-[#0a0c12]/60 backdrop-blur-xl border border-white/5 p-5 rounded-3xl shrink-0">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => router.push('/')} 
                        className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
                    >
                        <ArrowLeft className="w-5 h-5 text-white group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">
                                Core Engine <span className="text-cyan-500">Registry</span>
                            </h1>
                            <Settings className="w-4 h-4 text-cyan-500/50 animate-spin-slow" />
                        </div>
                        <span className="text-[9px] font-bold text-slate-700 uppercase tracking-[0.4em] mt-1 block italic">DCIM Infrastructure Management</span>
                    </div>
                </div>

                <div className="flex gap-4">
                    <AnimatePresence>
                        {saved && (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 text-[10px] font-black uppercase"
                            >
                                <CheckCircle2 className="w-3 h-3" /> Data Preserved
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button 
                        onClick={saveToLocal}
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-400/50 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_#06b6d433]"
                    >
                        <Save className="w-4 h-4" /> Save Configuration
                    </button>
                </div>
            </header>

            {/* TAB SELECTOR */}
            <nav className="flex gap-2">
                {[
                    { id: 'QDF', label: 'QDF Registry', icon: Building2 },
                    { id: 'METERS', label: 'Metering Devices', icon: Cpu },
                    { id: 'MAPPING', label: 'Port Mapping', icon: Zap }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'QDF' | 'METERS' | 'MAPPING')}
                        className={`px-8 py-3 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all border ${
                            activeTab === tab.id 
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-white' 
                            : 'bg-[#0a0c12]/40 border-white/5 hover:border-white/10'
                        }`}
                    >
                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-cyan-500' : 'text-slate-700'}`} />
                        {tab.label}
                    </button>
                ))}
            </nav>

            {/* CONFIG CONTENT */}
            <main className="flex-1 overflow-y-auto custom-scroll pr-2">
                
                {/* 1. QDF REGISTRY */}
                {activeTab === 'QDF' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                <Building2 className="w-4 h-4 text-slate-700" /> Site Inventory
                            </h2>
                            <button onClick={addQDF} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all">
                                <Plus className="w-3 h-3 text-cyan-500" /> New QDF Unit
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {qdfs.map((qdf, idx) => (
                                <motion.div 
                                    key={qdf.id} 
                                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                    className="p-6 bg-[#0a0c12]/80 border border-white/5 rounded-3xl hover:border-cyan-500/20 transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-3 bg-cyan-600/10 rounded-2xl border border-cyan-500/20">
                                            <Building2 className="text-cyan-400 w-5 h-5" />
                                        </div>
                                        <button onClick={() => setQdfs(qdfs.filter(q => q.id !== qdf.id))} className="p-2 hover:bg-rose-500/10 text-slate-800 hover:text-rose-500 rounded-xl transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        <input 
                                            value={qdf.name}
                                            onChange={(e) => {
                                                const n = [...qdfs];
                                                n[idx].name = e.target.value;
                                                setQdfs(n);
                                            }}
                                            className="w-full bg-transparent border-b border-white/5 py-2 text-white font-black uppercase tracking-widest focus:border-cyan-500 outline-none transition-all placeholder:text-slate-800"
                                            placeholder="QDF NAME"
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[7px] font-black text-slate-700 uppercase tracking-widest block mb-1">Site</label>
                                                <input value={qdf.site} className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-[10px] text-slate-400 outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-[7px] font-black text-slate-700 uppercase tracking-widest block mb-1">Room</label>
                                                <input value={qdf.room} className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-[10px] text-slate-400 outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. METER DEVICES */}
                {activeTab === 'METERS' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                <Cpu className="w-4 h-4 text-slate-700" /> Digital Metering Hardware
                            </h2>
                            <button onClick={addMeter} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all">
                                <Plus className="w-3 h-3 text-cyan-500" /> Register Meter
                            </button>
                        </div>

                        <div className="bg-[#0a0c12]/80 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-[#0a0c12] border-b border-white/5">
                                    <tr className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">
                                        <th className="px-6 py-4">Hardware SN</th>
                                        <th className="px-6 py-4">Linked QDF</th>
                                        <th className="px-6 py-4">Physical Panel</th>
                                        <th className="px-6 py-4 text-right">Ops</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {meters.map((meter, idx) => (
                                        <tr key={meter.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-all group">
                                            <td className="px-6 py-4">
                                                <input 
                                                    value={meter.serial} 
                                                    onChange={(e) => {
                                                        const m = [...meters];
                                                        m[idx].serial = e.target.value;
                                                        setMeters(m);
                                                    }}
                                                    className="bg-transparent border-b border-transparent group-hover:border-cyan-500 text-xs font-mono text-white outline-none w-full transition-all"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <select 
                                                    value={meter.qdfId}
                                                    onChange={(e) => {
                                                        const m = [...meters];
                                                        m[idx].qdfId = e.target.value;
                                                        setMeters(m);
                                                    }}
                                                    className="bg-transparent border border-white/5 rounded-lg text-[10px] text-slate-400 outline-none p-1"
                                                >
                                                    <option value="">Select QDF...</option>
                                                    {qdfs.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select 
                                                    value={meter.panel}
                                                    className="bg-transparent border border-white/5 rounded-lg text-[10px] text-slate-400 outline-none p-1"
                                                >
                                                    {['A1', 'A2', 'B1', 'B2'].map(p => <option key={p} value={p}>{p}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => setMeters(meters.filter(m => m.id !== meter.id))} className="p-2 hover:bg-rose-500/10 text-slate-800 hover:text-rose-500 rounded-xl transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. PORT MAPPING - INTERACTIVE MAPPER */}
                {activeTab === 'MAPPING' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                <Zap className="w-4 h-4 text-cyan-500" /> Smart Port Resolver
                            </h2>
                            <div className="flex gap-3">
                                <select 
                                    value={selectedMeterId}
                                    onChange={(e) => setSelectedMeterId(e.target.value)}
                                    className="bg-[#0a0c12] border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white outline-none"
                                >
                                    <option value="">Select Meter Instance...</option>
                                    {meters.map(m => <option key={m.id} value={m.id}>{m.serial} ({m.panel})</option>)}
                                </select>
                            </div>
                        </div>

                        {!selectedMeterId ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white/[0.01] border border-dashed border-white/5 rounded-3xl">
                                <Cpu className="w-10 h-10 text-slate-800 mb-4" />
                                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Select a meter hardware above to begin mapping</p>
                            </div>
                        ) : (
                            <div className="bg-[#0a0c12]/80 border border-white/5 rounded-3xl p-6 overflow-hidden">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {Array.from({ length: 24 }, (_, i) => {
                                        const map = getMapping(i);
                                        return (
                                            <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-3 group hover:border-cyan-500/20 transition-all">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-slate-600 uppercase font-mono tracking-widest leading-none truncate">PORT_{ (i + 1).toString().padStart(2, '0') }</span>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800 group-hover:bg-cyan-500 transition-all" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[7px] font-black text-slate-800 uppercase block">Maps to Physical Slot</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <select 
                                                            value={map.targetPanel}
                                                            onChange={(e) => updateMapping(i, 'targetPanel', e.target.value)}
                                                            className="bg-[#020305] border border-white/5 rounded-lg px-2 py-1.5 text-[9px] text-slate-400 outline-none"
                                                        >
                                                            <option>A1</option><option>A2</option><option>B1</option><option>B2</option>
                                                        </select>
                                                        <input 
                                                            value={map.targetSlot}
                                                            onChange={(e) => updateMapping(i, 'targetSlot', e.target.value)}
                                                            placeholder="Idx (01-24)" 
                                                            className="w-full bg-[#020305] border border-white/5 rounded-lg px-2 py-1.5 text-[9px] text-white placeholder:text-slate-900 outline-none" 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </main>

            <style jsx global>{`
                .custom-scroll::-webkit-scrollbar { width: 3px; }
                .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-scroll::-webkit-scrollbar-thumb { background: #111827; border-radius: 10px; }
                .custom-scroll::-webkit-scrollbar-thumb:hover { background: #1f2937; }
                .animate-spin-slow { animation: spin 8s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
