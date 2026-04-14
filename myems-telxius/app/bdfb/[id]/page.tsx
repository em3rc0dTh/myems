"use client"
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import RoomView from '@/components/RoomView';
import BDFBFrontView from '@/components/BDFBFrontView';
import BDFBRackDetail from '@/components/BDFBRackDetail';
import MeteringDiagram from '@/components/MeteringDiagram';
import EnergyHistoryView from '@/components/EnergyHistoryView';
import { Plus, LayoutGrid, Cpu, CheckCircle2, AlertTriangle, Activity, Inbox, MapPin } from 'lucide-react';
import { BDFB_MOCK_DATA } from '@/lib/mockData';
import { BDFBData, BreakerData, HistoryPoint } from '@/lib/types';
import { useMqtt } from '@/lib/MqttContext';

const BDFBDetailPage: React.FC = () => {
    const { id } = useParams();
    const router = useRouter();

    // Environment Context
    const isProd = process.env.NEXT_PUBLIC_APP_MODE === 'prod';
    const { isConnected, latestData } = useMqtt();

    // State for Navigation between Room and Device views
    const [viewMode, setViewMode] = useState<'room' | 'device'>('room');

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
                const res = await fetch(`/telxius/api/bdfb/${id}`);
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
    const [focusedView, setFocusedView] = useState<'none' | 'history' | 'diagram'>('none');

    // Initialize selected panel on load
    useEffect(() => {
        if (bdfbData && bdfbData.panels.length > 0 && !selectedPanelId) {
            const panelA2 = bdfbData.panels.find(p => p.name === 'A2');
            setSelectedPanelId(panelA2?.id || bdfbData.panels[0].id);
        }
    }, [bdfbData, selectedPanelId]);

    // Derived data for the selected segment/slot
    const selectedPanel = bdfbData?.panels.find(p => p.id === selectedPanelId);

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
                const idx = bdfbData.panels.findIndex(p => p.id === selectedPanel.id) + 1;
                const channelKey = `0_${idx}_${selectedBreaker.data.position}`;
                const channelData = livePayload[channelKey];
                if (channelData) {
                    return {
                        voltage: channelData.U1 || "0.00",
                        voltageHistory: { avg: 12.0, max: 15.0, min: 10.0, trend: 'stable' } as HistoryPoint,
                        current: channelData.I1 || "0.00",
                        currentHistory: { avg: 4.5, max: 12.0, min: 0.0, trend: 'stable' } as HistoryPoint,
                        power: channelData.P1 || "0.00",
                        powerHistory: { avg: 50.0, max: 150.0, min: 0.0, trend: 'stable' } as HistoryPoint,
                        energy: channelData.EP1 || "0.00",
                        energyHistory: { avg: 2.0, max: 6.0, min: 0.0, trend: 'up' } as HistoryPoint,
                        label: `Canal Físico: ${channelKey} (PRODUCCIÓN)`,
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

    return (
        <main className="h-screen w-screen overflow-hidden p-6 lg:p-8 pt-10 lg:pt-12 flex flex-col gap-6 bg-[#050508] relative">
            <div className={`absolute top-0 left-0 w-full py-1 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-center z-[100] flex items-center justify-center gap-2 ${isProd ? isConnected ? 'bg-success/20 text-[#a7f3d0] border-b border-success/30' : 'bg-warning/20 text-[#fde68a] border-b border-warning/30' : 'bg-[#1e293b] text-[#94a3b8] border-b border-white/5'}`}>
                {isProd ? isConnected ? <><CheckCircle2 className="w-3 h-3" /> ENTORNO DE PRODUCCIÓN - CONECTADO</> : <><Activity className="w-3 h-3 animate-pulse" /> ENTORNO DE PRODUCCIÓN - ESPERANDO MQTT...</> : <><AlertTriangle className="w-3 h-3" /> MODO DE DESARROLLO (MOCK)</>}
            </div>

            <div className="flex items-center justify-between shrink-0 relative z-50">
                <div className="flex items-center gap-6">
                    <Link href="/topology/dashboard" className="p-3 bg-white/5 hover:bg-accent-primary/20 rounded-2xl border border-white/10 transition-all text-slate-400 hover:text-accent-primary transform hover:-translate-x-1">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-3">
                            <span className="text-gradient leading-tight">{bdfbData?.name || 'BDFB Node'}</span>
                            <span className="text-slate-600 font-medium tracking-normal text-xs uppercase px-3 py-1 bg-white/5 rounded-lg">{viewMode === 'room' ? 'Digital Twin' : 'Physical Detail'}</span>
                        </h1>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none flex items-center gap-1.5">
                                <MapPin className="w-2.5 h-2.5" />
                                {bdfbData?.location || 'Site Emplacement'}
                            </span>
                            <span className="text-sky-400 text-[9px] font-black uppercase tracking-[0.2em]">
                                {isProd && bdfbData?.sn ? `SN: ${bdfbData.sn}` : 'ID-SYSTEM'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                    <button onClick={() => setViewMode('room')} className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all font-black text-[10px] tracking-widest uppercase ${viewMode === 'room' ? 'bg-accent-primary text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                        <LayoutGrid className="w-4 h-4" /> Sala
                    </button>
                    <button onClick={() => setViewMode('device')} className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all font-black text-[10px] tracking-widest uppercase ${viewMode === 'device' ? 'bg-accent-primary text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Cpu className="w-4 h-4" /> Dispositivo
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 relative">
                <div className="absolute inset-0 transition-all duration-500 overflow-hidden">
                    {isLoading ? (
                         <div className="w-full h-full glass-panel rounded-3xl flex flex-col items-center justify-center animate-pulse border border-white/5">
                            <div className="w-12 h-12 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin mb-4" />
                            <h3 className="text-white font-black uppercase tracking-widest text-sm italic">Synchronizing Node Assets...</h3>
                        </div>
                    ) : viewMode === 'room' && bdfbData?.substructureId ? (
                         <div className="w-full h-full glass-panel rounded-3xl overflow-hidden border border-white/5 animate-in fade-in duration-500">
                             <RoomView 
                                substructureId={bdfbData.substructureId} 
                                onSelectBDFB={(id) => {
                                    if (id) {
                                        router.push(`/bdfb/${id}`);
                                        setViewMode('device');
                                    }
                                }}
                             />
                         </div>
                    ) : (
                         <div className="flex gap-6 h-full animate-in slide-in-from-right-4 duration-500 relative">
                            {focusedView === 'none' && (
                                <div className="w-[200px] flex flex-col h-full shrink-0">
                                    <BDFBFrontView panels={bdfbData?.panels || []} selectedPanelId={selectedPanelId} onPanelClick={(pid) => { setSelectedPanelId(pid); setSelectedBreaker(null); }} />
                                </div>
                            )}

                            {focusedView !== 'none' ? (
                                 <div className="flex-1 min-h-0 h-full">
                                    {focusedView === 'history' ? (
                                        <EnergyHistoryView history={bdfbData?.telemetryHistory || []} onClose={() => setFocusedView('none')} title="Telemetry History" />
                                    ) : (
                                        <div className="w-full h-full glass-panel rounded-3xl border border-white/5 flex flex-col animate-in zoom-in-95">
                                            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
                                                <h2 className="text-xl font-black text-white uppercase italic tracking-widest">Wiring Diagram</h2>
                                                <button onClick={() => setFocusedView('none')} className="px-6 py-2.5 bg-accent-primary text-white font-black uppercase tracking-widest rounded-xl text-[10px]">Close Diagram</button>
                                            </div>
                                            <div className="flex-1 p-8 flex items-center justify-center">
                                                {selectedConnection ? <MeteringDiagram connection={selectedConnection} bdfbName={bdfbData?.name || ''} /> : <div className="text-center opacity-30"><Plus className="w-16 h-16 mx-auto mb-4" /><p className="text-xs font-black uppercase">Select mapped breaker</p></div>}
                                            </div>
                                        </div>
                                    )}
                                 </div>
                            ) : (
                                <div className="flex-1 flex gap-6 min-w-0 h-full">
                                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                                        <BDFBRackDetail panelName={selectedPanel?.name || ''} breakers={activePanelBreakers} mappedPositions={activeConnections.map(c => c.position)} onPositionClick={(pname, b) => setSelectedBreaker({ panelId: selectedPanelId!, data: b })} />
                                    </div>
                                    <div className="w-[400px] flex flex-col gap-6 h-full overflow-hidden">
                                        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 shrink-0">
                                            <button onClick={() => setFocusedView('history')} className="flex-1 py-3 text-[9px] font-black tracking-widest uppercase text-slate-500 hover:text-white transition-all">History</button>
                                            <button onClick={() => setFocusedView('diagram')} className="flex-1 py-3 text-[9px] font-black tracking-widest uppercase text-slate-500 hover:text-white transition-all">Diagram</button>
                                            <Link href="/topology/dashboard" className="flex-1 py-3 text-[9px] font-black tracking-widest uppercase bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-white transition-all text-center rounded-lg border border-accent-primary/20">Dashboard</Link>
                                        </div>

                                        <div className={`glass-panel p-6 rounded-3xl border transition-all shrink-0 ${displayTelemetry.isLive ? 'border-accent-primary/40 bg-accent-primary/5' : 'border-white/5'}`}>
                                            <div className="flex items-center justify-between mb-6">
                                                <h2 className="text-[10px] font-black tracking-widest uppercase text-slate-400 italic flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${displayTelemetry.isLive ? 'bg-accent-primary animate-pulse' : 'bg-slate-700'}`} />
                                                    {displayTelemetry.label}
                                                </h2>
                                                {selectedBreaker && <button onClick={() => setSelectedBreaker(null)} className="text-[8px] font-black text-slate-600 hover:text-white uppercase tracking-widest transition-colors">Reset Selection</button>}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <MetricCard label="Voltage" value={displayTelemetry.voltage} unit="V" color="text-accent-primary" stats={displayTelemetry.voltageHistory} isLive={displayTelemetry.isLive} />
                                                <MetricCard label="Current" value={displayTelemetry.current} unit="A" color="text-accent-secondary" stats={displayTelemetry.currentHistory} isLive={displayTelemetry.isLive} />
                                                <MetricCard label="Power" value={displayTelemetry.power} unit="kW" color="text-success" stats={displayTelemetry.powerHistory} isLive={displayTelemetry.isLive} />
                                                <MetricCard label="Energy" value={displayTelemetry.energy} unit="kWh" color="text-warning" stats={displayTelemetry.energyHistory} isLive={displayTelemetry.isLive} />
                                            </div>
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
                                    </div>
                                </div>
                            )}
                         </div>
                    )}
                </div>
            </div>
        </main>
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
