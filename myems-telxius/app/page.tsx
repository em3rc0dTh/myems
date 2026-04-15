"use client"
import BDFBSummary from "../components/BDFBSummary";
import { BDFBData, PanelData, BreakerData } from "@/lib/types";
import { BDFB_MOCK_DATA } from "@/lib/mockData";
import React, { useState, useEffect } from "react";
import { Settings, ChevronRight, ChevronDown, Edit, Trash2, LayoutGrid, Activity, Plus, Server, FolderTree, AlertTriangle, CheckCircle2, FileDown, Inbox, Pin, PinOff, Sliders } from "lucide-react";
import Link from 'next/link';
import EquipmentEditorModal from "../components/EquipmentEditorModal";
import InfrastructureExplorer from "../components/InfrastructureExplorer";

export default function Home() {
    const isProd = process.env.NEXT_PUBLIC_APP_MODE === 'prod';
    const [showConfig, setShowConfig] = useState(false);
    const [activeBDFBs, setActiveBDFBs] = useState<BDFBData[]>([]);
    const [isLoading, setIsLoading] = useState(isProd);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [editingDevice, setEditingDevice] = useState<any>(null);

    useEffect(() => {
        if (!isProd) {
            setActiveBDFBs(BDFB_MOCK_DATA);
            setIsLoading(false);
            return;
        }

        const fetchBDFBs = async () => {
            try {
                const res = await fetch('/telxius/api/bdfb-dashboard');
                if (res.ok) {
                    const data = await res.json();
                    setActiveBDFBs(data);
                    // Initialize selection from DB pinned state
                    const pinnedIds = data.filter((b: any) => b.isPinned).map((b: any) => b.id);
                    setSelectedIds(pinnedIds);
                }
            } catch (error) {
                console.error("Failed to load DB BDFBs", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBDFBs();
    }, [isProd]);

    const toggleSelection = async (id: string) => {
        const isCurrentlyPinned = selectedIds.includes(id);
        const newState = !isCurrentlyPinned;

        // Optimistic UI update
        setSelectedIds(prev =>
            newState ? [...prev, id] : prev.filter(i => i !== id)
        );

        if (isProd) {
            try {
                await fetch(`/telxius/api/devices/?id=${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isPinned: newState })
                });
            } catch (e) {
                console.error("Failed to persist pin state", e);
                // Rollback on error if needed
                setSelectedIds(prev =>
                    isCurrentlyPinned ? [...prev, id] : prev.filter(i => i !== id)
                );
            }
        }
    };

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const isSystemEmpty = !isLoading && activeBDFBs.length === 0;

    const filteredBDFBs = activeBDFBs.filter(b => selectedIds.includes(b.id));
    const hasActivePins = selectedIds.length > 0;

    return (
        <main className="h-screen w-full overflow-hidden p-4 lg:p-6 flex flex-col pt-12 relative bg-[#020617]">
            {/* GLOBAL ENVIRONMENT BANNER FOR CONSISTENCY */}
            <div className={`absolute top-0 left-0 w-full py-1 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-center z-[100] flex items-center justify-center gap-2 ${isProd ? 'bg-success/20 text-[#a7f3d0] border-b border-success/30' : 'bg-[#1e293b] text-[#94a3b8] border-b border-white/5'}`}>
                {isProd ? <><CheckCircle2 className="w-3 h-3" /> ENTORNO DE PRODUCCIÓN</> : <><AlertTriangle className="w-3 h-3" /> MODO DE DESARROLLO (MOCK) - CARGANDO DATA ESTÁTICA PARA UX</>}
            </div>

            <div className="flex-1 w-full max-w-[1700px] mx-auto flex gap-6 relative z-10 min-h-0">

                {/* Sidebar (Collapsible & Transitioning to Dock) */}
                <aside
                    className={`fixed lg:relative z-[60] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden ${isSidebarOpen ? 'w-[320px] opacity-100 translate-x-0 h-[calc(100vh-100px)] lg:h-full lg:mr-6' : 'w-0 opacity-0 pointer-events-none -translate-x-full lg:translate-x-[-100%] h-0'}`}
                >
                    {isSidebarOpen && (
                        <div className="glass-panel p-6 rounded-[2.5rem] h-full flex flex-col border border-white/5 shadow-2xl bg-slate-900/40 backdrop-blur-3xl min-w-[320px]">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex flex-col">
                                    <h1 className="text-2xl font-black tracking-tighter shrink-0 text-white italic">
                                        <span className="text-sky-400 not-italic">AppM</span> EMS
                                    </h1>
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Telemetry Control Unit</span>
                                </div>
                                <button
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all border border-white/5"
                                    title="Acoplar en Dock"
                                >
                                    <ChevronRight className="w-5 h-5 rotate-180" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto custom-scrollbar pr-1 space-y-5 mb-6">
                                <div className="p-5 bg-gradient-to-br from-white/[0.03] to-transparent rounded-[2rem] border border-white/5">
                                    <h5 className="text-[9px] font-black text-sky-500/50 uppercase tracking-[0.2em] mb-4">Capacity Fleet Status</h5>
                                    <div className="space-y-4">
                                        {(() => {
                                            const totalCap = activeBDFBs.reduce((sum, b) => sum + (b.panels?.reduce((ps, p) => ps + p.installedCapacity, 0) || 0), 0);
                                            const totalCons = activeBDFBs.reduce((sum, b) => sum + (b.panels?.reduce((ps, p) => ps + p.consumedCapacity, 0) || 0), 0);
                                            const totalRes = activeBDFBs.reduce((sum, b) => sum + (b.panels?.reduce((ps, p) => ps + p.reservedCapacity, 0) || 0), 0);

                                            const installPerc = totalCap > 0 ? 100 : 0;
                                            const consPerc = totalCap > 0 ? Math.round((totalCons / totalCap) * 100) : 0;
                                            const resPerc = totalCap > 0 ? Math.round((totalRes / totalCap) * 100) : 0;

                                            return (
                                                <>
                                                    <ProgressBar label="Installed" value={installPerc} color="bg-sky-500" />
                                                    <ProgressBar label="Load Out" value={consPerc} color="bg-emerald-500" />
                                                    <ProgressBar label="Reserve" value={resPerc} color="bg-amber-500" />
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <Link href="/topology/dashboard" className="block p-5 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:bg-white/5 transition-all group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-sky-500/10 rounded-xl border border-sky-500/20"><Server className="w-4 h-4 text-sky-400" /></div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Topology Maps</span>
                                                <span className="text-[8px] font-medium text-slate-500 uppercase tracking-widest">Sites & Rooms</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-white transition-colors" />
                                    </div>
                                </Link>

                                <div className="p-1 bg-white/[0.02] border border-white/5 rounded-[2rem] flex-1 min-h-0 flex flex-col overflow-hidden">
                                     <div className="p-4 pb-2 border-b border-white/5 flex items-center gap-3">
                                         <div className="p-1.5 bg-fuchsia-500/10 rounded-lg"><FolderTree className="w-3.5 h-3.5 text-fuchsia-400" /></div>
                                         <span className="text-[9px] font-black text-white uppercase tracking-widest">Auditoría Estructural</span>
                                     </div>
                                     <div className="flex-1 overflow-auto custom-scrollbar p-2">
                                         <InfrastructureExplorer />
                                     </div>
                                </div>
                            </div>

                            <div className="mt-auto space-y-3 shrink-0">
                                <div className="p-4 bg-emerald-500/5 rounded-[1.5rem] border border-emerald-500/10 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${isSystemEmpty ? 'bg-slate-700' : 'bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]'}`} />
                                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Core Status Ready</span>
                                    </div>
                                    <Activity className="w-3.5 h-3.5 text-emerald-500/50" />
                                </div>
                                <button
                                    onClick={() => setShowConfig(true)}
                                    className="w-full px-4 py-4 bg-sky-600 hover:bg-sky-500 rounded-2xl border border-sky-400/30 transition-all font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 text-white shadow-lg shadow-sky-900/20"
                                >
                                    <Sliders className="w-4 h-4" />
                                    System Configuration
                                </button>
                            </div>
                        </div>
                    )}
                </aside>

                {/* BOTTOM FLOATING DOCK (When Sidebar is Closed) */}
                {!isSidebarOpen && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 p-2 bg-[#0a0c12]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-10 duration-500 px-6 h-16">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-3 bg-sky-500 hover:bg-sky-400 text-white rounded-2xl shadow-xl transition-all group relative"
                            title="Expandir EMS Sidebar"
                        >
                            <LayoutGrid className="w-5 h-5" />
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0a0c12] rounded-full" />
                        </button>

                        <div className="h-6 w-px bg-white/10 mx-2" />

                        {/* Quick Metrics in Dock */}
                        <div className="flex gap-6 px-2">
                            {(() => {
                                const totalCap = activeBDFBs.reduce((sum, b) => sum + (b.panels?.reduce((ps, p) => ps + p.installedCapacity, 0) || 0), 0);
                                const totalCons = activeBDFBs.reduce((sum, b) => sum + (b.panels?.reduce((ps, p) => ps + p.consumedCapacity, 0) || 0), 0);
                                const load = totalCap > 0 ? Math.round((totalCons / totalCap) * 100) : 0;
                                return (
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col text-right">
                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Avg Load</span>
                                            <span className="text-xs font-mono font-black text-white">{load}%</span>
                                        </div>
                                        <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-sky-500" style={{ width: `${load}%` }} />
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="flex items-center gap-3 border-l border-white/5 pl-6">
                                <button onClick={() => setShowConfig(true)} className="flex items-center gap-2 hover:bg-white/5 p-2 rounded-xl transition-all group">
                                    <Settings className="w-4 h-4 text-slate-500 group-hover:text-white" />
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-white">Settings</span>
                                </button>
                            </div>
                        </div>

                        {!isSystemEmpty && (
                            <div className="ml-4 flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Sync Alive</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Main Content (Now expansive) */}
                <div className="flex-1 flex flex-col gap-4 min-h-0 min-w-0 transition-all duration-500">

                    {/* BDFB Section */}
                    <section className="flex flex-col flex-[1.6] min-h-0 relative">
                        <div className="flex items-center justify-between mb-3 shrink-0 px-1">
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Consola de BDFBs Activas</h2>
                            <span className="px-2.5 py-1 bg-white/5 rounded-full text-[9px] font-mono text-slate-600 uppercase tracking-widest border border-white/5">
                                {selectedIds.length} Pinned Units
                            </span>
                        </div>

                        <div className="flex-1 glass-panel rounded-3xl overflow-hidden relative border border-white/5 bg-black/20">
                            <div className="p-6 h-full overflow-x-auto overflow-y-hidden custom-scrollbar">
                                {isLoading ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mb-4" />
                                        <h3 className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Syncing Telemetry...</h3>
                                    </div>
                                ) : isSystemEmpty ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                        <Inbox className="w-12 h-12 mb-4" />
                                        <h3 className="text-white font-black uppercase tracking-widest mb-1">Inventario Vacío</h3>
                                        <p className="text-[10px] uppercase font-bold tracking-widest">Accede a Gestión para realizar la ingesta.</p>
                                    </div>
                                ) : !hasActivePins ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center px-10">
                                        <Pin className="w-10 h-10 text-sky-500 mb-4 animate-bounce" />
                                        <h3 className="text-white font-black uppercase tracking-widest mb-2">Workspace No Personalizado</h3>
                                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest leading-loose">USA EL PIN EN GESTIÓN OPERATIVA PARA MOSTRAR LAS BDFBS EN ESTA VISTA.</p>
                                    </div>
                                ) : (
                                    <div className="flex gap-6 h-full min-w-max items-center">
                                        {filteredBDFBs.map((bdfb: BDFBData) => (
                                            <div key={bdfb.id} className="h-full py-2 flex items-center justify-center min-w-[320px]">
                                                <BDFBSummary bdfb={bdfb} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Notifications Section */}
                    <section className="flex flex-col flex-1 min-h-0">
                        <div className="flex items-center gap-3 mb-3 shrink-0 px-1">
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Notificaciones de Ingeniería</h2>
                            {!isSystemEmpty && <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        </div>
                        <div className="glass-panel flex-1 rounded-3xl overflow-hidden border border-white/5 flex flex-col min-h-0 bg-black/20">
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {isSystemEmpty ? (
                                    <div className="h-full flex items-center justify-center opacity-30 text-center">
                                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.4em]">Listening for telemetry streams...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] flex items-center gap-5 group hover:bg-emerald-500/10 transition-all">
                                            <div className="p-3 bg-emerald-500/20 text-emerald-500 rounded-2xl"><CheckCircle2 className="w-5 h-5 shadow-[0_0_15px_rgba(16,185,129,0.3)]" /></div>
                                            <div>
                                                <h4 className="text-white font-black text-xs uppercase tracking-widest">Infraestructura Estable</h4>
                                                <p className="text-slate-500 text-[10px] mt-1 font-bold uppercase tracking-tighter">Sin anomalías detectadas en los últimos 45 reportes de carga.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button className="w-full py-3 bg-white/[0.02] hover:bg-white/5 transition-colors text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] border-t border-white/5 shrink-0" disabled={isSystemEmpty}>
                                Ver Eventos de Red Completo
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            {/* Configuration Modal */}
            {showConfig && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowConfig(false)} />
                    <div className="relative w-full max-w-5xl h-[85vh] glass-panel rounded-3xl border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                    <Settings className="w-7 h-7 text-accent-primary" />
                                    Ajustes Globales del Sistema
                                </h2>
                                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em] mt-1">
                                    Central de Configuración Telxius EMS {isProd && <span className="text-success ml-2 px-1 bg-success/10 border border-success/20 rounded">MODO PROD ACTIVO</span>}
                                </p>
                            </div>
                            <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                <Plus className="w-8 h-8 rotate-45 text-slate-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">

                                {/* LADO IZQUIERDO: Ingesta Masiva (Recomendado) */}
                                <div className="flex flex-col h-full bg-accent-primary/5 rounded-3xl border-2 border-accent-primary/20 p-6 relative overflow-hidden group">
                                    <div className="absolute -top-10 -right-10 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                                        <FolderTree className="w-64 h-64" />
                                    </div>
                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className="mb-auto">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-xl bg-accent-primary/20 flex items-center justify-center border border-accent-primary/30">
                                                    <FileDown className="w-5 h-5 text-accent-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-white uppercase italic tracking-widest">Ingesta de Topología</h3>
                                                    <span className="text-[9px] px-2 py-0.5 bg-success/20 text-success rounded uppercase font-bold tracking-widest border border-success/20">Modo Recomendado</span>
                                                </div>
                                            </div>

                                            <p className="text-sm text-slate-300 leading-relaxed mb-6 font-medium">
                                                No agregues racks ni conexiones manualmente. Utiliza módulos de plantillas (CSV/JSON) para poblar y renderizar ramas enteras de la infraestructura (Ej: Edificio -{'>'} Salas -{'>'} Filas -{'>'} Racks -{'>'} Puertos -{'>'} Conexión MQTT).
                                            </p>

                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3 text-xs text-slate-400 font-bold p-3 bg-black/20 rounded-xl border border-white/5">
                                                    <CheckCircle2 className="w-4 h-4 text-success" /> Infraestructura As Code
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-400 font-bold p-3 bg-black/20 rounded-xl border border-white/5">
                                                    <CheckCircle2 className="w-4 h-4 text-success" /> Pre-validación local de colisiones
                                                </div>
                                            </div>
                                        </div>

                                        <Link
                                            href="/topology"
                                            className="w-full mt-8 py-5 bg-accent-primary hover:bg-sky-400 text-white font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all transform hover:-translate-y-1"
                                        >
                                            <FolderTree className="w-6 h-6" />
                                            Abrir Asistente de Ingesta
                                        </Link>
                                    </div>
                                </div>

                                {/* LADO DERECHO: Ajustes Manuales Arcaicos */}
                                <div className="flex flex-col h-full border border-white/5 rounded-3xl p-6 bg-black/20">
                                    <div className="mb-6">
                                        <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                                            <Server className="w-5 h-5 text-slate-400" /> Explorador de Nodos (Manual)
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-2 font-medium">Edición granular de los activos existentes en la base de datos local.</p>
                                    </div>

                                    <div className="flex-1 overflow-auto space-y-3 custom-scrollbar pr-2 pb-4">
                                        {isSystemEmpty ? (
                                            <div className="h-full flex flex-col items-center justify-center opacity-40 py-10 text-center">
                                                <Inbox className="w-10 h-10 text-slate-500 mb-2" />
                                                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Sin nodos creados</p>
                                            </div>
                                        ) : (
                                            activeBDFBs.map((bdfb) => (
                                                <ConfigBDFBItem
                                                    key={bdfb.id}
                                                    bdfb={bdfb}
                                                    isSelected={selectedIds.includes(bdfb.id)}
                                                    onToggleSelect={() => toggleSelection(bdfb.id)}
                                                    onEdit={() => setEditingDevice({
                                                        id: bdfb.id,
                                                        name: bdfb.name,
                                                        equipments: bdfb.panels ? bdfb.panels.map(p => ({
                                                            id: p.id,
                                                            name: p.name,
                                                            category: 'SUBRACK'
                                                        })) : []
                                                    })}
                                                />
                                            ))
                                        )}

                                        <button className="w-full mt-4 py-4 border-2 border-dashed border-white/5 rounded-2xl text-slate-600 hover:border-slate-400 hover:text-white transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2" disabled={isProd}>
                                            <Plus className="w-4 h-4" />
                                            {isProd ? 'CREACIÓN MANUAL BLOQUEADA EN PROD' : 'Añadir BDFB Suelto'}
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Equipment Editor Modal */}
            {editingDevice && (
                <EquipmentEditorModal
                    device={editingDevice}
                    onClose={() => setEditingDevice(null)}
                    onUpdate={() => {
                        // Refresh data
                        if (isProd) {
                            fetch('/telxius/api/bdfb-dashboard')
                                .then(res => res.json())
                                .then(data => setActiveBDFBs(data));
                        }
                    }}
                />
            )}
        </main>
    );
}

function ConfigBDFBItem({ bdfb, isSelected, onToggleSelect, onEdit }: { bdfb: BDFBData, isSelected?: boolean, onToggleSelect?: () => void, onEdit?: () => void }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className={`border rounded-2xl transition-all ${isSelected ? 'border-sky-500 bg-sky-500/5' : 'border-white/5 bg-white/[0.01]'}`}>
            <div className="p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
                        className={`p-2 rounded-lg transition-all ${isSelected ? 'bg-sky-500 text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                    >
                        {isSelected ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                    </button>
                    <div>
                        <h4 className="font-black text-slate-200 text-base tracking-tight uppercase">{bdfb.name}</h4>
                        <p className="text-[10px] text-slate-500 uppercase font-mono">{bdfb.location} • SN: {bdfb.sn || 'S/N'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                        className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-sky-400 transition-all"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isExpanded ? 'bg-slate-700/50 text-white' : 'text-slate-500'}`}>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
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

function ConfigPanelItem({ panel }: { panel: any }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPinned, setIsPinned] = useState(panel.isPinned);

    const togglePin = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const newState = !isPinned;
        setIsPinned(newState);
        try {
            await fetch(`/telxius/api/equipments?id=${panel.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPinned: newState })
            });
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className={`border rounded-xl transition-all ${isPinned ? 'border-sky-500/50 bg-sky-500/[0.03]' : 'border-white/5 bg-black/40'}`}>
            <div className="p-3 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={togglePin}
                        className={`p-1.5 rounded transition-all ${isPinned ? 'text-sky-400 bg-sky-500/10' : 'text-slate-600 hover:text-slate-400'}`}
                    >
                        {isPinned ? <Pin className="w-3 h-3" /> : <PinOff className="w-3 h-3" />}
                    </button>
                    <div className="p-1 rounded bg-white/5">
                        {isExpanded ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                    </div>
                    <span className="text-xs font-black text-slate-300 uppercase tracking-widest">{panel.name}</span>
                </div>
                <button className="p-1.5 hover:bg-white/5 rounded text-slate-600 hover:text-white transition-all"><Edit className="w-3.5 h-3.5" /></button>
            </div>

            {isExpanded && (
                <div className="p-3 pt-2 border-t border-white/5 pl-8 space-y-1">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        {panel.breakers?.map((breaker: any) => (
                            <div key={breaker.id} className="p-2 bg-white/5 rounded-lg border border-white/5 flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-slate-500 w-10">Pos {breaker.position}</span>
                                    <span className="text-[10px] text-slate-300 font-mono truncate max-w-[120px]">{breaker.label || 'Ocupado'}</span>
                                </div>
                            </div>
                        ))}
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