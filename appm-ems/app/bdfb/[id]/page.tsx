"use client"
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import RoomView from '../../../components/RoomView';
import BDFBFrontView from '../../../components/BDFBFrontView';
import BDFBRackDetail from '../../../components/BDFBRackDetail';
import MeteringDiagram from '../../../components/MeteringDiagram';
import EnergyHistoryView from '../../../components/EnergyHistoryView';
import RackElevationManager from '../../../components/RackElevationManager';
import { Plus, LayoutGrid, Cpu, CheckCircle2, AlertTriangle, Activity, Inbox, MapPin, ChevronRight, GripVertical, Flame } from 'lucide-react';
import { BDFB_MOCK_DATA } from '@/lib/mockData';
import { BDFBData, BreakerData, HistoryPoint } from '@/lib/types';
import { useMqtt } from '@/lib/MqttContext';
import InfrastructureExplorer from '@/components/InfrastructureExplorer';

const BDFBDetailPage: React.FC = () => {
    const { id } = useParams();
    const router = useRouter();

    const [sidebarWidth, setSidebarWidth] = useState(320);
    const [rightPanelWidth, setRightPanelWidth] = useState(450);
    const [isResizing, setIsResizing] = useState(false);
    const [isResizingRight, setIsResizingRight] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizing) {
                const newWidth = e.clientX;
                if (newWidth >= 240 && newWidth <= 600) setSidebarWidth(newWidth);
            }
            if (isResizingRight) {
                const newWidth = window.innerWidth - e.clientX;
                if (newWidth >= 300 && newWidth <= 800) setRightPanelWidth(newWidth);
            }
        };
        const handleMouseUp = () => {
            setIsResizing(false);
            setIsResizingRight(false);
        };

        if (isResizing || isResizingRight) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, isResizingRight]);

    // Environment Context
    const isProd = process.env.NEXT_PUBLIC_APP_MODE === 'prod';
    const { isConnected, latestData } = useMqtt();

    // State for Navigation between Room and Device views
    const [viewMode, setViewMode] = useState<'room' | 'device'>('room');
    const [leftSidebarMode, setLeftSidebarMode] = useState<'visual' | 'tree'>('visual');

    // Real state for production
    const [bdfbData, setBdfbData] = useState<BDFBData | null>(null);
    const [isLoading, setIsLoading] = useState(isProd);
    const [error, setError] = useState<string | null>(null);

    // Load Data Effect
    useEffect(() => {
        if (!isProd) {
            const mock = BDFB_MOCK_DATA.find((b: BDFBData) => b.id === id) || BDFB_MOCK_DATA[0];
            setBdfbData(mock);
            setIsLoading(false);
            return;
        }

        const fetchDetail = async () => {
            try {
                const res = await fetch(`/appm-ems/api/bdfb/${id}/`);
                if (res.ok) {
                    const data = await res.json();
                    setBdfbData(data);
                } else {
                    setError("No se pudo encontrar el BDFB en la base de datos de producción.");
                }
            } catch (e) {
                setError("Error de conexión con el servidor de producción.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetail();
    }, [id, isProd]);

    // State for selections in Device View
    const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
    const [selectedBreaker, setSelectedBreaker] = useState<{ panelId: string, data: BreakerData } | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedContainer, setSelectedContainer] = useState<any | null>(null);

    const [focusedView, setFocusedView] = useState<'none' | 'history' | 'diagram'>('none');
    const [historyRange, setHistoryRange] = useState<'24h' | '7d' | '30d'>('24h');
    const [historyLoading, setHistoryLoading] = useState(false);

    // Initialize selected panel on load
    useEffect(() => {
        if (bdfbData && bdfbData.panels.length > 0 && !selectedPanelId) {
            // Prefer A1, then A2, then the first one with breakers, then just the first one
            const panelA1 = bdfbData.panels.find(p => p.name === 'A1');
            const panelWithBreakers = bdfbData.panels.find(p => p.breakers && p.breakers.length > 0);
            
            setSelectedPanelId(panelA1?.id || panelWithBreakers?.id || bdfbData.panels[0].id);
        }
    }, [bdfbData, selectedPanelId]);

    // Derived data for the selected segment/slot
    const selectedPanel = bdfbData?.panels.find(p => p.id === selectedPanelId);

    // REAL HISTORY FETCHING
    const [realHistory, setRealHistory] = useState<any[]>([]);

    const targetChannelKey = useMemo(() => {
        if (!bdfbData || !selectedPanel) return "0_1_1";
        if (!selectedBreaker) return "0_1_1";
        return (selectedBreaker.data as any).sensorKey || `0_${bdfbData.panels.findIndex(p => p.id === selectedPanel.id) + 1}_${selectedBreaker.data.position}`;
    }, [bdfbData, selectedPanel, selectedBreaker]);

    useEffect(() => {
        if (focusedView === 'history' && bdfbData?.sn) {
            setHistoryLoading(true);
            const fetchHistory = async () => {
                try {
                    // Fetch Voltage (U1) and Current (I1) history
                    const [vRes, iRes] = await Promise.all([
                        fetch(`/appm-ems/api/history/?sn=${bdfbData.sn}&field=U1&range=${historyRange}`),
                        fetch(`/appm-ems/api/history/?sn=${bdfbData.sn}&field=I1&range=${historyRange}`)
                    ]);

                    if (vRes.ok && iRes.ok) {
                        const vData = await vRes.json();
                        const iData = await iRes.json();

                        // Robust Time-Matching Merge & Filter by Target Port
                        const timeMap: Record<string, any> = {};

                        // Only use data matching our target port! (e.g. "0_1_1_U1")
                        const targetVField = `${targetChannelKey}_U1`;
                        const targetIField = `${targetChannelKey}_I1`;

                        vData.forEach((v: any) => {
                            if (v.field === targetVField) {
                                timeMap[v.time] = { ...timeMap[v.time], time: v.time, voltage: v.value };
                            }
                        });

                        iData.forEach((i: any) => {
                            if (i.field === targetIField) {
                                timeMap[i.time] = { ...timeMap[i.time], time: i.time, current: i.value };
                            }
                        });

                        const combined = Object.values(timeMap).sort((a, b) =>
                            new Date(a.time).getTime() - new Date(b.time).getTime()
                        );

                        setRealHistory(combined);
                    }
                } catch (e) {
                    console.error("History fetch failed", e);
                } finally {
                    setHistoryLoading(false);
                }
            };
            fetchHistory();
        }
    }, [focusedView, bdfbData?.sn, historyRange, targetChannelKey]);

    // Breakers for the middle rack detail column
    const activePanelBreakers = useMemo(() => {
        if (!selectedPanel) return [];
        return selectedPanel.breakers || [];
    }, [selectedPanel]);

    // Connections for the right mapping list
    const activeConnections = useMemo(() => {
        if (!selectedPanel) return bdfbData?.connections || [];
        return bdfbData?.connections?.filter(c => c.panelName === selectedPanel.name) || [];
    }, [selectedPanel, bdfbData]);

    const selectedConnection = bdfbData?.connections?.find(c =>
        c.panelName === selectedPanel?.name &&
        c.position === selectedBreaker?.data.position
    );

    const displayTelemetry = useMemo(() => {
        if (isProd && latestData && bdfbData?.sn && latestData[bdfbData.sn]) {
            const livePayload = latestData[bdfbData.sn].reported as any;
            if (selectedBreaker && selectedPanel) {
                // Prioridad a sensorKey si la API la provee, sino fallback a heurística 0_idx_pos
                const channelKey = (selectedBreaker.data as any).sensorKey ||
                    `0_${bdfbData.panels.findIndex(p => p.id === selectedPanel.id) + 1}_${selectedBreaker.data.position}`;
                const channelData = livePayload[channelKey];

                if (channelData) {
                    const current = parseFloat(channelData.I1 || "0");
                    const capacity = (selectedBreaker.data as any).maxAmperage || 63;
                    const loadFactor = (current / capacity) * 100;

                    let statusColor = "text-success";
                    if (loadFactor >= 80 && loadFactor < 95) statusColor = "text-warning";
                    if (loadFactor >= 95) statusColor = "text-danger";

                    return {
                        voltage: channelData.U1 || "0.00",
                        voltageHistory: { avg: 48.0, max: 48.5, min: 47.8, trend: 'stable' } as HistoryPoint,
                        current: current.toFixed(2),
                        currentHistory: { avg: current * 0.9, max: current * 1.1, min: current * 0.8, trend: 'stable' } as HistoryPoint,
                        power: channelData.P1 || "0.00",
                        powerHistory: { avg: 50.0, max: 150.0, min: 0.0, trend: 'stable' } as HistoryPoint,
                        energy: channelData.EP1 || "0.00",
                        energyHistory: { avg: 2.0, max: 6.0, min: 0.0, trend: 'up' } as HistoryPoint,
                        label: `Canal: ${channelKey} | Capacidad: ${capacity}A`,
                        loadFactor,
                        statusColor,
                        cableGauge: (selectedBreaker.data as any).cableGauge || 'Desconocido',
                        isLive: true
                    };
                }
            }
            return {
                voltage: "PROD", voltageHistory: { avg: 0, max: 0, min: 0, trend: 'stable' } as HistoryPoint,
                current: "LIVE", currentHistory: { avg: 0, max: 0, min: 0, trend: 'stable' } as HistoryPoint,
                power: "LIVE", powerHistory: { avg: 0, max: 0, min: 0, trend: 'stable' } as HistoryPoint,
                energy: "MQTT", energyHistory: { avg: 0, max: 0, min: 0, trend: 'stable' } as HistoryPoint,
                label: `General SN: ${bdfbData.sn} (PRODUCCIÓN)`,
                isLive: true
            };
        }
        
        // Fallback para cuando el BDFB está cargado pero no hay datos MQTT aún
        if (bdfbData && isProd) {
            return {
                voltage: "SYNC", voltageHistory: { avg: 0, max: 0, min: 0, trend: 'stable' } as HistoryPoint,
                current: "SYNC", currentHistory: { avg: 0, max: 0, min: 0, trend: 'stable' } as HistoryPoint,
                power: "SYNC", powerHistory: { avg: 0, max: 0, min: 0, trend: 'stable' } as HistoryPoint,
                energy: "SYNC", energyHistory: { avg: 0, max: 0, min: 0, trend: 'stable' } as HistoryPoint,
                label: `Esperando Telemetría: ${bdfbData.sn}`,
                isLive: false
            };
        }

        if (!bdfbData) return { voltage: "0", current: "0", power: "0", energy: "0", label: "Cargando...", isLive: false };
        if (selectedBreaker?.data.voltage) {
            const v = parseFloat(selectedBreaker.data.voltage || "0");
            const i = parseFloat(selectedBreaker.data.current || "0");
            const mockHistory: HistoryPoint = { avg: v * 0.98, max: v * 1.02, min: v * 0.95, trend: 'stable' };
            return {
                voltage: selectedBreaker.data.voltage || "0",
                voltageHistory: mockHistory,
                current: selectedBreaker.data.current || "0",
                currentHistory: { avg: i * 0.98, max: i * 1.05, min: i * 0.9, trend: 'stable' } as HistoryPoint,
                power: (v * i / 1000).toFixed(2),
                powerHistory: { avg: (v * i / 1000) * 0.95, max: (v * i / 1000) * 1.1, min: (v * i / 1000) * 0.8, trend: 'stable' } as HistoryPoint,
                energy: selectedBreaker.data.energy || "0",
                energyHistory: { avg: 72, max: 75.2, min: 68.4, trend: 'up' } as HistoryPoint,
                label: `Slot ${selectedBreaker.data.position} (${selectedPanel?.name || ''}) - SIMULADO`,
                isLive: false
            };
        }
        if (selectedPanel) {
            return {
                voltage: bdfbData.telemetry?.voltage?.toString() || "48.0",
                voltageHistory: bdfbData.telemetry?.voltageHistory,
                current: selectedPanel.consumedCapacity.toString(),
                currentHistory: { avg: selectedPanel.consumedCapacity * 0.9, max: selectedPanel.consumedCapacity * 1.1, min: selectedPanel.consumedCapacity * 0.8, trend: 'stable' } as HistoryPoint,
                power: ((bdfbData.telemetry?.voltage || 48) * selectedPanel.consumedCapacity / 1000).toFixed(2),
                powerHistory: { avg: (bdfbData.telemetry?.power || 0) / 4, max: (bdfbData.telemetry?.power || 0) / 3, min: (bdfbData.telemetry?.power || 0) / 5, trend: 'stable' } as HistoryPoint,
                energy: ((bdfbData.telemetry?.energy || 0) / 4).toFixed(2),
                energyHistory: { avg: 15, max: 18.8, min: 12.4, trend: 'stable' } as HistoryPoint,
                label: `Panel ${selectedPanel.name} - SIMULADO`,
                isLive: false
            };
        }
        return {
            voltage: bdfbData.telemetry?.voltage.toString() || "48.0",
            voltageHistory: bdfbData.telemetry?.voltageHistory,
            current: bdfbData.telemetry?.current.toString() || "0",
            currentHistory: bdfbData.telemetry?.currentHistory,
            power: bdfbData.telemetry?.power.toString() || "0",
            powerHistory: bdfbData.telemetry?.powerHistory,
            energy: bdfbData.telemetry?.energy.toString() || "0",
            energyHistory: bdfbData.telemetry?.energyHistory,
            label: "Total BDFB - SIMULADO",
            isLive: false
        };
    }, [selectedBreaker, selectedPanel, bdfbData, isProd, latestData]);

    const handleSaveEngineering = async (formData: any) => {
        if (!selectedBreaker?.data.id) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/appm-ems/api/ports/?id=${selectedBreaker.data.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                const refreshRes = await fetch(`/appm-ems/api/bdfb/${id}/`);
                if (refreshRes.ok) {
                    const newData = await refreshRes.json();
                    setBdfbData(newData);
                }
                setIsEditModalOpen(false);
            }
        } catch (e) {
            console.error("Save failed", e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            {isEditModalOpen && selectedBreaker && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 text-left">
                    <div className="w-full max-w-md glass-panel rounded-[32px] border border-white/10 p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-accent-primary" />
                        <h2 className="text-xl font-black text-white uppercase italic tracking-[0.15em] mb-2 flex items-center gap-3">
                            <Cpu className="w-6 h-6 text-accent-primary" /> Mapeo de Ingeniería
                        </h2>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-8 text-left">Panel: {selectedPanel?.name} | Posición: {selectedBreaker.data.position}</p>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            handleSaveEngineering({
                                maxAmperage: parseFloat(fd.get('maxAmperage') as string),
                                cableGauge: fd.get('cableGauge'),
                                clientName: fd.get('clientName'),
                                sensorKey: fd.get('sensorKey')
                            });
                        }} className="space-y-6 text-left">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Equipo Final (NE)</label>
                                <input name="clientName" defaultValue={(selectedBreaker.data as any).clientName || ''} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono text-sm focus:border-accent-primary outline-none transition-all placeholder:text-slate-600 uppercase" placeholder="Ej: GRTLuren3 PSU0 A0" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 text-left">Capacidad (Amp)</label>
                                    <input name="maxAmperage" defaultValue={(selectedBreaker.data as any).maxAmperage || 63} type="number" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono text-sm focus:border-accent-primary outline-none transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Calibre Cable</label>
                                    <select name="cableGauge" defaultValue={(selectedBreaker.data as any).cableGauge || '4AWG'} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono text-sm focus:border-accent-primary outline-none transition-all appearance-none cursor-pointer">
                                        <option value="2AWG">2 AWG</option>
                                        <option value="4AWG">4 AWG</option>
                                        <option value="8AWG">8 AWG</option>
                                        <option value="16mm2">16 mm²</option>
                                        <option value="35mm2">35 mm²</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">ID Sensor (MQTT)</label>
                                <input name="sensorKey" defaultValue={(selectedBreaker.data as any).sensorKey || ''} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono text-xs focus:border-accent-primary outline-none transition-all uppercase" placeholder="0_1_X" />
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/10 transition-all">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="flex-[2] py-4 bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-accent-primary/20">
                                    {isSaving ? 'Guardando...' : 'Guardar Ingeniería'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {focusedView === 'history' && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-[90vw] h-[90vh] max-w-7xl glass-panel rounded-[32px] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col">
                        <EnergyHistoryView
                            history={realHistory}
                            onClose={() => setFocusedView('none')}
                            title="Análisis Histórico de Carga"
                            range={historyRange}
                            onRangeChange={setHistoryRange}
                            loading={historyLoading}
                        />
                    </div>
                </div>
            )}

            {focusedView === 'diagram' && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-[90vw] h-[90vh] max-w-7xl glass-panel rounded-[32px] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20 shrink-0">
                            <h2 className="text-xl font-black text-white uppercase italic tracking-widest">Wiring Diagram</h2>
                            <button onClick={() => setFocusedView('none')} className="px-8 py-3 bg-accent-primary text-white font-black uppercase tracking-widest rounded-xl text-xs hover:bg-accent-primary/80 transition-all shadow-lg shadow-accent-primary/20">Cerrar</button>
                        </div>
                        <div className="flex-1 p-6 flex items-center justify-center overflow-auto custom-scrollbar">
                            {selectedConnection ? <MeteringDiagram connection={selectedConnection} bdfbName={bdfbData?.name || ''} /> : <div className="text-center opacity-30"><Plus className="w-16 h-16 mx-auto mb-4" /><p className="text-sm font-black uppercase">Select mapped breaker</p></div>}
                        </div>
                    </div>
                </div>
            )}
            <main className="h-screen w-screen overflow-hidden flex flex-col bg-[#050508] relative text-white">
                <div className={`shrink-0 w-full py-1 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-center z-[100] flex items-center justify-center gap-2 ${isProd ? isConnected ? 'bg-success/20 text-[#a7f3d0] border-b border-success/30' : 'bg-warning/20 text-[#fde68a] border-b border-warning/30' : 'bg-[#1e293b] text-[#94a3b8] border-b border-white/5'}`}>
                    {isProd ? isConnected ? <><CheckCircle2 className="w-3 h-3" /> ENTORNO DE PRODUCCIÓN - CONECTADO</> : <><Activity className="w-3 h-3 animate-pulse" /> ENTORNO DE PRODUCCIÓN - ESPERANDO MQTT...</> : <><AlertTriangle className="w-3 h-3" /> MODO DE DESARROLLO (MOCK)</>}
                </div>

                <div className="flex-1 min-h-0 relative flex">
                    {isLoading ? (
                        <div className="w-full h-full flex flex-col items-center justify-center animate-pulse">
                            <div className="w-12 h-12 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin mb-4" />
                            <h3 className="text-white font-black uppercase tracking-widest text-sm italic">Synchronizing Node Assets...</h3>
                        </div>
                    ) : !bdfbData ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-700">
                            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border border-rose-500/20">
                                <Activity className="w-10 h-10 text-rose-500" />
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">Error de Sincronización</h2>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] max-w-md mb-8 leading-relaxed">
                                No se han podido recuperar los activos para el nodo seleccionado ({id}). 
                                Verifique que el dispositivo esté correctamente aprovisionado.
                            </p>
                            <Link href="/topology/dashboard" className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 font-black uppercase tracking-widest text-[11px] transition-all shadow-2xl">
                                Volver al Dashboard
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* LEFT SIDEBAR: NAVEGACIÓN */}
                            <div style={{ width: sidebarWidth }} className="h-full shrink-0 relative bg-[#0a0a0f] border-r border-white/5 flex flex-col pt-4">
                                <div className="px-4 mb-4 flex gap-2">
                                    <Link href="/topology/dashboard" className="p-3 bg-white/5 hover:bg-accent-primary/20 rounded-xl border border-white/10 transition-all text-slate-400 hover:text-accent-primary">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                    </Link>
                                    <div className="flex-1 flex bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
                                        <button onClick={() => setLeftSidebarMode('visual')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${leftSidebarMode === 'visual' ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/20' : 'text-slate-500 hover:bg-white/5'}`}>Frontal</button>
                                        <button onClick={() => setLeftSidebarMode('tree')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${leftSidebarMode === 'tree' ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/20' : 'text-slate-500 hover:bg-white/5'}`}>Estructura</button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto px-2 pb-4">
                                    {leftSidebarMode === 'visual' ? (
                                        <BDFBFrontView panels={bdfbData?.panels || []} selectedPanelId={selectedPanelId} onPanelClick={(pid) => { setSelectedPanelId(pid); setSelectedBreaker(null); }} />
                                    ) : (
                                        <InfrastructureExplorer
                                            equipment={bdfbData?.equipments || []}
                                            siteName={bdfbData?.location || "Site"}
                                            roomName={bdfbData?.roomName || bdfbData?.name || "Sala"}
                                            bays={bdfbData?.bays || []}
                                            onSelect={(item) => {
                                                if (item.category === 'SUBSHELF') setSelectedPanelId(item.id);
                                                if (item.category === 'BREAKER') {
                                                    const panel = bdfbData?.panels.find(p => p.breakers?.some(b => b.id === item.id));
                                                    if (panel) {
                                                        setSelectedPanelId(panel.id);
                                                        const breakerData = panel.breakers?.find(b => b.id === item.id);
                                                        if (breakerData) setSelectedBreaker({ panelId: panel.id, data: breakerData });
                                                    }
                                                }
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Resizer Handle Left */}
                                <div
                                    className="absolute top-0 -right-2 bottom-0 w-4 cursor-col-resize flex items-center justify-center group z-50"
                                    onMouseDown={() => setIsResizing(true)}
                                >
                                    <div className={`w-1 h-12 rounded-full transition-all ${isResizing ? 'bg-accent-primary shadow-[0_0_10px_#0ea5e9]' : 'bg-white/10 group-hover:bg-accent-primary/50'}`}>
                                        <GripVertical className="w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-white transition-opacity pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* CENTER CANVAS: VISUALIZACIÓN */}
                            <div className="flex-1 h-full relative overflow-hidden bg-[#01040a]">



                                {/* CONTROLES DE VISTA */}
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] flex gap-2 p-1.5 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl pointer-events-auto">
                                    <button onClick={() => setViewMode('room')} className={`flex items-center gap-2 px-8 py-2.5 rounded-xl transition-all font-black text-[11px] tracking-widest uppercase ${viewMode === 'room' ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/20 scale-105' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
                                        <LayoutGrid className="w-4 h-4" /> Sala
                                    </button>
                                    <button onClick={() => setViewMode('device')} className={`flex items-center gap-2 px-8 py-2.5 rounded-xl transition-all font-black text-[11px] tracking-widest uppercase ${viewMode === 'device' ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/20 scale-105' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
                                        <Cpu className="w-4 h-4" /> Dispositivo
                                    </button>
                                </div>

                                {/* CONTROLES GLOBALES (Top Right Empty For Future Extensions) */}
                                <div className="absolute top-6 right-6 z-[100] pointer-events-auto">
                                    {/* The previous duplicate Thermal View was removed. Thermal View functionality lives inside RoomView. */}
                                </div>

                                {/* CANVAS CONTENT */}
                                <div className="w-full h-full pt-20 pb-4 px-4">
                                    {viewMode === 'room' && bdfbData?.substructureId ? (
                                        <div className="w-full h-full glass-panel rounded-3xl overflow-hidden border border-white/5 animate-in fade-in duration-500">
                                            <RoomView
                                                substructureId={bdfbData.substructureId}
                                                onContainerSelect={(c) => { setSelectedContainer(c); }}
                                                onSelectBDFB={(id) => {
                                                    if (id) {
                                                        router.push(`/bdfb/${id}`);
                                                        setViewMode('device');
                                                    }
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full h-full glass-panel rounded-3xl overflow-hidden border border-white/5 flex flex-col relative animate-in fade-in duration-500">
                                            <BDFBRackDetail panelName={selectedPanel?.name || ''} breakers={activePanelBreakers} mappedPositions={activeConnections.map(c => c.position)} onPositionClick={(pname, b) => setSelectedBreaker({ panelId: selectedPanelId!, data: b })} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT PANEL: DETALLE */}
                            <div style={{ width: rightPanelWidth }} className="h-full shrink-0 relative bg-[#0a0a0f] border-l border-white/5 flex flex-col p-4">
                                {/* Resizer Handle Right */}
                                <div
                                    className="absolute top-0 -left-2 bottom-0 w-4 cursor-col-resize flex items-center justify-center group z-50"
                                    onMouseDown={() => setIsResizingRight(true)}
                                >
                                    <div className={`w-1 h-12 rounded-full transition-all ${isResizingRight ? 'bg-accent-primary shadow-[0_0_10px_#0ea5e9]' : 'bg-white/10 group-hover:bg-accent-primary/50'}`}>
                                        <GripVertical className="w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-white transition-opacity pointer-events-none" />
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
                                    {selectedContainer ? (
                                        <RackElevationManager
                                            container={selectedContainer}
                                            siteId={bdfbData?.substructureId}
                                            onClose={() => setSelectedContainer(null)}
                                            onUpdate={() => { }}
                                        />
                                    ) : (
                                        <>
                                            <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 shrink-0">
                                                <button onClick={() => setFocusedView('history')} className="flex-1 py-3 text-[10px] font-black tracking-widest uppercase text-slate-500 hover:text-white transition-all rounded-lg hover:bg-white/5">History</button>
                                                <button onClick={() => setFocusedView('diagram')} className="flex-1 py-3 text-[10px] font-black tracking-widest uppercase text-slate-500 hover:text-white transition-all rounded-lg hover:bg-white/5">Diagram</button>
                                            </div>

                                            {/* Serial Number and Device Meta Details */}
                                            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-2">
                                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <Activity className="w-3 h-3 text-accent-primary" /> Detalles Técnicos
                                                </h3>
                                                <div className="grid grid-cols-2 gap-4 mt-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Serial Number (S/N)</span>
                                                        <span className="text-xs font-mono text-white mt-0.5">{bdfbData?.sn || 'UNKNOWN_SN'}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Identificador (ID)</span>
                                                        <span className="text-xs font-mono text-white mt-0.5">{bdfbData?.id?.substring(0, 8) || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={`glass-panel p-6 rounded-3xl border transition-all shrink-0 ${displayTelemetry.isLive ? 'border-accent-primary/40 bg-accent-primary/5' : 'border-white/5'}`}>
                                                <div className="flex items-center justify-between mb-6">
                                                    <h2 className="text-[10px] font-black tracking-widest uppercase text-slate-400 italic flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${displayTelemetry.isLive ? 'bg-accent-primary animate-pulse' : 'bg-slate-700'}`} />
                                                        {displayTelemetry.label}
                                                    </h2>
                                                    <div className="flex gap-2">
                                                        {selectedBreaker && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }}
                                                                className="text-[8px] font-black text-accent-primary hover:text-white uppercase tracking-widest transition-all px-2 py-1 bg-accent-primary/10 rounded border border-accent-primary/20"
                                                            >
                                                                Ingeniería
                                                            </button>
                                                        )}
                                                        {selectedBreaker && <button onClick={() => setSelectedBreaker(null)} className="text-[8px] font-black text-slate-600 hover:text-white uppercase tracking-widest transition-colors">Reset Selection</button>}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <MetricCard label="Voltage" value={displayTelemetry.voltage} unit="V" color="text-accent-primary" stats={displayTelemetry.voltageHistory} isLive={displayTelemetry.isLive} />
                                                    <MetricCard label="Current" value={displayTelemetry.current} unit="A" color={(displayTelemetry as any).statusColor || "text-accent-secondary"} stats={displayTelemetry.currentHistory} isLive={displayTelemetry.isLive} />
                                                    <MetricCard label="Power" value={displayTelemetry.power} unit={parseFloat(displayTelemetry.power) > 100 ? "W" : "kW"} color="text-success" stats={displayTelemetry.powerHistory} isLive={displayTelemetry.isLive} />
                                                    <MetricCard label="Energy" value={displayTelemetry.energy} unit="kWh" color="text-warning" stats={displayTelemetry.energyHistory} isLive={displayTelemetry.isLive} />
                                                </div>

                                                {(displayTelemetry as any).loadFactor !== undefined && (
                                                    <div className="mt-8 pt-6 border-t border-white/5">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Utilización de Capacidad</span>
                                                            <span className={`text-[10px] font-black ${(displayTelemetry as any).statusColor}`}>{(displayTelemetry as any).loadFactor.toFixed(1)}%</span>
                                                        </div>
                                                        <div className="h-4 bg-white/5 rounded-full overflow-hidden p-1 border border-white/10">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-1000 ${(displayTelemetry as any).statusColor?.replace('text-', 'bg-')}`}
                                                                style={{ width: `${Math.min((displayTelemetry as any).loadFactor, 100)}%` }}
                                                            />
                                                        </div>
                                                        <div className="mt-4 flex justify-between items-center">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Cable Adjunto:</span>
                                                                <span className="text-[10px] font-mono font-black text-white">{(displayTelemetry as any).cableGauge}</span>
                                                            </div>
                                                            {(displayTelemetry as any).loadFactor >= 80 && (
                                                                <div className="flex items-center gap-1.5 animate-pulse">
                                                                    <AlertTriangle className="w-3 h-3 text-warning" />
                                                                    <span className="text-[8px] font-black text-warning uppercase">Carga Elevada</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 flex flex-col min-h-0 bg-black/40 rounded-3xl border border-white/5 overflow-hidden">
                                                <div className="p-5 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Port Mapping</h3>
                                                    <span className="text-[9px] font-black text-accent-primary bg-accent-primary/10 px-3 py-1 rounded-lg">Panel {selectedPanel?.name || 'A2'}</span>
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                                    {activeConnections.map((c) => (
                                                        <div key={c.id} onClick={() => { const b = activePanelBreakers.find(pb => pb.position === c.position); if (b) setSelectedBreaker({ panelId: selectedPanelId!, data: b }); }} className={`grid grid-cols-[40px_1fr_60px] items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${selectedConnection?.id === c.id ? 'bg-accent-primary/10 border-accent-primary/40' : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'}`}>
                                                            <span className="font-mono text-[10px] text-slate-500">{c.position}</span>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[10px] font-black text-white truncate uppercase tracking-tight">{c.clientName || 'Standalone BDFB'}</span>
                                                                <span className="text-[8px] font-mono text-slate-500 mt-0.5">Physical Port: {c.port}</span>
                                                            </div>
                                                            <span className={`text-[8px] font-black uppercase text-center px-2 py-1 rounded-full ${c.status === 'Activo' ? 'text-success bg-success/10 border border-success/20' : 'text-slate-500 bg-white/5 border border-white/10'}`}>{c.status}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </>
    );
};

const MetricCard = ({ label, value, unit, color, stats, isLive }: { label: string, value: string, unit: string, color: string, stats?: HistoryPoint, isLive?: boolean }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div className={`bg-white/[0.03] p-4 rounded-2xl border transition-all flex flex-col relative overflow-hidden ${isExpanded ? 'col-span-2' : ''} ${isLive ? 'border-accent-primary/20 bg-accent-primary/10' : 'border-white/5'}`}>
            <button onClick={() => setIsExpanded(!isExpanded)} className="absolute top-3 right-3 w-5 h-5 rounded-lg bg-white/5 flex items-center justify-center transition-colors">
                <Plus className={`w-3 h-3 text-slate-500 transition-transform ${isExpanded ? 'rotate-45' : ''}`} />
            </button>
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest block mb-2">{label}</span>
            <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-mono font-black ${color} tracking-tighter ${isExpanded ? 'text-4xl' : ''}`}>{value}</span>
                <span className="text-[10px] text-slate-600 font-bold">{unit}</span>
            </div>
            {isExpanded && stats && (
                <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/5 animate-in slide-in-from-top-4">
                    <div className="flex flex-col gap-1"><span className="text-[7px] text-slate-500 uppercase tracking-widest font-black">Average</span><span className="text-[11px] font-mono font-bold text-white">{stats.avg.toFixed(1)}</span></div>
                    <div className="flex flex-col gap-1"><span className="text-[7px] text-slate-500 uppercase tracking-widest font-black">Max Peak</span><span className="text-[11px] font-mono font-bold text-white">{stats.max.toFixed(1)}</span></div>
                    <div className="flex flex-col gap-1"><span className="text-[7px] text-slate-500 uppercase tracking-widest font-black">Min Peak</span><span className="text-[11px] font-mono font-bold text-white">{stats.min.toFixed(1)}</span></div>
                </div>
            )}
        </div>
    );
};

export default BDFBDetailPage;
