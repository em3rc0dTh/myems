"use client"
import BDFBSummary from "@/components/BDFBSummary";
import { BDFBData, PanelData, BreakerData } from "@/lib/types";

import { BDFB_MOCK_DATA } from "@/lib/mockData";
import React, { useState } from "react";
import { Settings, ChevronRight, ChevronDown, Edit, Trash2, Plus } from "lucide-react";

export default function Home() {
    const [showConfig, setShowConfig] = useState(false);
    return (
        <main className="h-screen w-screen overflow-hidden p-4 lg:p-6 flex flex-col">
            <div className="max-w-[1700px] mx-auto w-full h-full flex flex-col lg:flex-row gap-4">

                {/* Sidebar */}
                <aside className="w-full lg:w-[340px] shrink-0 flex flex-col h-full">
                    <div className="glass-panel p-5 rounded-2xl h-full flex flex-col">
                        <h1 className="text-3xl font-extrabold mb-1 tracking-tight shrink-0">
                            <span className="text-gradient">AppM Energy EMS</span>
                        </h1>
                        <p className="text-slate-400 mb-4 text-sm leading-relaxed shrink-0">
                            Sistema de monitoreo energético y planificación física de infraestructura.
                        </p>

                        <div className="flex-1 overflow-auto pr-1 space-y-3">
                            <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Resumen de Capacidad</h5>
                                <div className="space-y-2">
                                    <ProgressBar label="Total Instalado" value={95} color="bg-accent-primary" />
                                    <ProgressBar label="Total Consumido" value={65} color="bg-success" />
                                    <ProgressBar label="Reservado" value={15} color="bg-warning" />
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 space-y-3 shrink-0">
                            <div className="p-3 bg-accent-primary/10 rounded-xl border border-accent-primary/20">
                                <h4 className="text-accent-primary font-bold mb-0.5 flex items-center gap-2 text-xs">
                                    <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-pulse" />
                                    Estado del Sistema
                                </h4>
                                <p className="text-xs text-slate-300">Latencia promedio: 45ms.</p>
                            </div>
                            <button
                                onClick={() => setShowConfig(true)}
                                className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                                <Settings className="w-3.5 h-3.5" />
                                Config
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col gap-4 h-full min-w-0">

                    {/* BDFB Section */}
                    <section className="flex flex-col h-2/3 ">
                        <div className="flex items-center justify-between mb-3 shrink-0 px-1">
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Resumen de BDFBs</h2>
                            <span className="px-2.5 py-1 bg-white/5 rounded-full text-[10px] font-mono text-slate-500 uppercase tracking-widest border border-white/5">
                                3 Activos / 5 Capacidad
                            </span>
                        </div>
                        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
                            <div className="flex gap-4 h-full min-w-max px-1">
                                {BDFB_MOCK_DATA.map((bdfb: BDFBData) => (
                                    <div key={bdfb.id} className="flex justify-center items-center w-[300px] h-auto">
                                        <BDFBSummary bdfb={bdfb} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Notifications Section */}
                    <section className="flex flex-col h-1/3 flex-1 min-h-0">
                        <div className="flex items-center gap-3 mb-3 shrink-0 px-1">
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Notificaciones Críticas</h2>
                            <span className="flex h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
                        </div>
                        <div className="glass-panel flex-1 rounded-2xl overflow-hidden border-white/5 flex flex-col min-h-0">
                            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                <NotificationItem type="alert" title="Alerta de Capacidad - BDFB-3" time="Hace 5 min" description="Panel A1 ha superado el 90% de la capacidad asignada." />
                                <NotificationItem type="info" title="Nuevo Breaker Instalado - BDFB-2" time="Hace 1 hora" description="Se ha registrado un nuevo breaker en el Panel B1 (Port 12)." />
                                <NotificationItem type="warning" title="Fallo de Telemetría - BDFB-1" time="Hace 3 horas" description="Conexión intermitente detectada en el sensor del Panel A2." />
                                <NotificationItem type="info" title="Mantenimiento Programado" time="Hace 5 horas" description="Actualización de firmware para sensores el 05/04." />
                            </div>
                            <button className="w-full py-2.5 bg-white/5 hover:bg-white/10 transition-colors text-xs font-bold text-slate-500 uppercase tracking-widest border-t border-white/5 shrink-0">
                                Ver historial completo
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            {/* Configuration Modal */}
            {showConfig && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowConfig(false)} />
                    <div className="relative w-full max-w-4xl h-[80vh] glass-panel rounded-3xl border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                                    <Settings className="w-6 h-6 text-accent-primary" />
                                    Configuración de Infraestructura
                                </h2>
                                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em] mt-1">Gestión jerárquica de activos • Telxius EMS</p>
                            </div>
                            <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                <Plus className="w-6 h-6 rotate-45 text-slate-500" />
                            </button>
                        </div>

                        {/* Modal Body: Cascaded List */}
                        <div className="flex-1 overflow-auto p-6 space-y-4 custom-scrollbar">
                            {BDFB_MOCK_DATA.map((bdfb) => (
                                <ConfigBDFBItem key={bdfb.id} bdfb={bdfb} />
                            ))}

                            <button className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-slate-600 hover:border-accent-primary/30 hover:text-accent-primary transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                                <Plus className="w-4 h-4" />
                                Añadir Nuevo BDFB
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

function ConfigBDFBItem({ bdfb }: { bdfb: BDFBData }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="border border-white/5 rounded-2xl bg-black/20 overflow-hidden">
            <div className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-accent-primary" /> : <ChevronRight className="w-5 h-5 text-accent-primary" />}
                    </div>
                    <div>
                        <h4 className="font-black text-white text-lg tracking-tight uppercase italic">{bdfb.name}</h4>
                        <p className="text-[10px] text-slate-500 uppercase font-mono">{bdfb.location} • SN: {bdfb.sn || 'S/N'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"><Edit className="w-4 h-4" /></button>
                    <button className="p-2 hover:bg-danger/10 rounded-lg text-slate-500 hover:text-danger transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
            </div>

            {isExpanded && (
                <div className="p-4 pt-0 border-t border-white/5 space-y-3 animate-in slide-in-from-top-2 duration-300">
                    <div className="pl-14 pt-4 space-y-4">
                        {bdfb.panels.map((panel: PanelData) => (
                            <ConfigPanelItem key={panel.id} panel={panel} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function ConfigPanelItem({ panel }: { panel: PanelData }) {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div className="border border-white/5 rounded-xl bg-white/[0.01]">
            <div className="p-3 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3">
                    <div className="p-1 rounded bg-white/5">
                        {isExpanded ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                    </div>
                    <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Panel {panel.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded font-mono">{panel.installedCapacity}A</span>
                </div>
                <button className="p-1.5 hover:bg-white/5 rounded text-slate-600 hover:text-white transition-all"><Edit className="w-3.5 h-3.5" /></button>
            </div>

            {isExpanded && (
                <div className="p-3 pt-2 border-t border-white/5 pl-8 space-y-1">
                    <div className="grid grid-cols-2 gap-2">
                        {panel.breakers?.map((breaker: BreakerData) => (
                            <div key={breaker.id} className="p-2 bg-white/5 rounded-lg border border-white/5 flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-slate-500">Pos {breaker.position}</span>
                                    <span className="text-[10px] text-slate-300 font-mono truncate max-w-[120px]">{breaker.label || 'Occupied'}</span>
                                </div>
                                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-1 text-slate-600 hover:text-accent-primary"><Edit className="w-3 h-3" /></button>
                                </div>
                            </div>
                        ))}
                        <button className="p-2 border border-dashed border-white/5 rounded-lg text-[9px] text-slate-600 uppercase font-black hover:border-accent-primary/20 hover:text-accent-primary">+ Añadir</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div>
            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
                <span>{label}</span>
                <span>{value}%</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${value}%` }} />
            </div>
        </div>
    );
}

function NotificationItem({ type, title, time, description }: { type: 'alert' | 'warning' | 'info'; title: string; time: string; description: string }) {
    const colors = {
        alert: 'bg-danger/20 text-danger border-danger/20',
        warning: 'bg-warning/20 text-warning border-warning/20',
        info: 'bg-accent-primary/20 text-accent-primary border-accent-primary/20'
    };

    return (
        <div className="flex gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${colors[type]}`}>
                {type === 'alert' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                )}
                {type === 'warning' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
                {type === 'info' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
            </div>
            <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-bold text-white text-sm leading-none truncate">{title}</h4>
                    <span className="text-[10px] text-slate-500 uppercase font-mono shrink-0">{time}</span>
                </div>
                <p className="text-xs text-slate-400">{description}</p>
            </div>
        </div>
    );
}