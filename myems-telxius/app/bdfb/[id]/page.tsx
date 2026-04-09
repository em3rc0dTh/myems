"use client"
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import RoomView from '@/components/RoomView';
import BDFBFrontView from '@/components/BDFBFrontView';
import BDFBRackDetail from '@/components/BDFBRackDetail';
import MeteringDiagram from '@/components/MeteringDiagram';
import EnergyHistoryView from '@/components/EnergyHistoryView';
import { Plus, LayoutGrid, Cpu } from 'lucide-react';
import { BDFB_MOCK_DATA, getRoomData } from '@/lib/mockData';
import { BDFBData, BreakerData, HistoryPoint } from '@/lib/types';

const BDFBDetailPage: React.FC = () => {
  const { id } = useParams();
  const router = useRouter();
  
  // State for Navigation between Room and Device views
  const [viewMode, setViewMode] = useState<'room' | 'device'>('room');
  
  // Retrieve current BDFB data
  const bdfbData = useMemo(() => 
    BDFB_MOCK_DATA.find((b: BDFBData) => b.id === id) || BDFB_MOCK_DATA[0]
  , [id]);

  // Retrieve correct room data based on this BDFB's location
  const roomData = useMemo(() => 
    getRoomData(bdfbData.substructureId || 'sala-tx-01')
  , [bdfbData.substructureId]);

  // State for selections in Device View
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [selectedBreaker, setSelectedBreaker] = useState<{ panelId: string, data: BreakerData } | null>(null);
  const [focusedView, setFocusedView] = useState<'none' | 'history' | 'diagram'>('none');

  // Initialize selected panel on load
  useEffect(() => {
    if (bdfbData.panels.length > 0 && !selectedPanelId) {
      const panelA2 = bdfbData.panels.find(p => p.name === 'A2');
      setSelectedPanelId(panelA2?.id || bdfbData.panels[0].id);
    }
  }, [bdfbData, selectedPanelId]);

  // Derived data for the selected segment/slot
  const selectedPanel = bdfbData.panels.find(p => p.id === selectedPanelId);
  
  // Breakers for the middle rack detail column
  const activePanelBreakers = useMemo(() => {
    if (!selectedPanel) return [];
    return selectedPanel.breakers || [];
  }, [selectedPanel]);

  // Connections for the right mapping list
  const activeConnections = useMemo(() => {
    if (!selectedPanel) return bdfbData.connections || [];
    return bdfbData.connections?.filter(c => c.panelName === selectedPanel.name) || [];
  }, [selectedPanel, bdfbData]);

  const selectedConnection = bdfbData.connections?.find(c => 
    c.panelName === selectedPanel?.name && 
    c.position === selectedBreaker?.data.position
  );

  const displayTelemetry = useMemo(() => {
    // If a specific breaker is selected, show its telemetry
    if (selectedBreaker?.data.voltage) {
      const v = parseFloat(selectedBreaker.data.voltage || "0");
      const i = parseFloat(selectedBreaker.data.current || "0");
      // Use mock history for selected slots
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
        label: `Slot ${selectedBreaker.data.position} (${selectedPanel?.name || ''})`
      };
    }
    // If a panel is selected, show panel averages/totals (mocked)
    if (selectedPanel) {
      return {
        voltage: bdfbData.telemetry?.voltage.toString() || "0",
        voltageHistory: bdfbData.telemetry?.voltageHistory,
        current: selectedPanel.consumedCapacity.toString(),
        currentHistory: { avg: selectedPanel.consumedCapacity * 0.9, max: selectedPanel.consumedCapacity * 1.1, min: selectedPanel.consumedCapacity * 0.8, trend: 'stable' } as HistoryPoint,
        power: ((bdfbData.telemetry?.voltage || 0) * selectedPanel.consumedCapacity / 1000).toFixed(2),
        powerHistory: { avg: (bdfbData.telemetry?.power || 0) / 4, max: (bdfbData.telemetry?.power || 0) / 3, min: (bdfbData.telemetry?.power || 0) / 5, trend: 'stable' } as HistoryPoint,
        energy: ((bdfbData.telemetry?.energy || 0) / 4).toFixed(2),
        energyHistory: { avg: 15, max: 18.8, min: 12.4, trend: 'stable' } as HistoryPoint,
        label: `Panel ${selectedPanel.name}`
      };
    }
    // Default: Total BDFB Telemetry
    return {
      voltage: bdfbData.telemetry?.voltage.toString() || "0",
      voltageHistory: bdfbData.telemetry?.voltageHistory,
      current: bdfbData.telemetry?.current.toString() || "0",
      currentHistory: bdfbData.telemetry?.currentHistory,
      power: bdfbData.telemetry?.power.toString() || "0",
      powerHistory: bdfbData.telemetry?.powerHistory,
      energy: bdfbData.telemetry?.energy.toString() || "0",
      energyHistory: bdfbData.telemetry?.energyHistory,
      label: "Total BDFB"
    };
  }, [selectedBreaker, selectedPanel, bdfbData]);

  return (
    <main className="h-screen w-screen overflow-hidden p-6 lg:p-8 flex flex-col gap-6 bg-[#050508]">

      {/* Navigation & Header */}
      <div className="flex items-center justify-between shrink-0 relative z-50">
        <div className="flex items-center gap-6">
          <Link href="/" className="p-3 bg-white/5 hover:bg-accent-primary/20 rounded-2xl border border-white/10 transition-all text-slate-400 hover:text-accent-primary group">
            <svg className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-black flex items-center gap-3">
              <span className="text-gradient leading-tight">{bdfbData.name} • {viewMode === 'room' ? 'Vista de Sala' : 'Detalle Físico'}</span>
              <div className="flex gap-1.5 ml-2">
                <span className="w-1.5 h-1.5 bg-success rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="w-1.5 h-1.5 bg-success/20 rounded-full" />
              </div>
            </h1>
            <p className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-[0.2em] font-bold">{bdfbData.location} • POSICIÓN B-12</p>
          </div>
        </div>

        {/* View Toggles */}
        <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => setViewMode('room')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-[10px] tracking-widest uppercase ${viewMode === 'room' ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <LayoutGrid className="w-4 h-4" />
            Sala TX
          </button>
          <button
            onClick={() => setViewMode('device')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-[10px] tracking-widest uppercase ${viewMode === 'device' ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Cpu className="w-4 h-4" />
            Equipo
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0 transition-all duration-500 ease-in-out">
            
            {viewMode === 'room' ? (
                <div className="w-full h-full glass-panel rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <RoomView 
                        substructure={roomData.substructure} 
                        positions={roomData.positions} 
                        onSelectBDFB={(id) => {
                           if (id) {
                             router.push(`/bdfb/${id}`);
                             setViewMode('device');
                           }
                        }}
                    />
                </div>
            ) : (
                <div className="flex gap-6 h-full animate-in fade-in slide-in-from-right-4 duration-500 relative">
                    
                    {/* Column 1: BDFB Compact Selector (Always visible unless focused on history/diagram) */}
                    {focusedView === 'none' && (
                        <div className="w-[200px] flex flex-col h-full min-h-0">
                            <BDFBFrontView 
                                panels={bdfbData.panels}
                                selectedPanelId={selectedPanelId}
                                onPanelClick={(pid: string) => {
                                    setSelectedPanelId(pid);
                                    setSelectedBreaker(null);
                                }}
                            />
                        </div>
                    )}

                    {/* FOCUSED VIEW OVERLAY (Large Scale) */}
                    {focusedView !== 'none' ? (
                        <div className="flex-1 min-h-0 relative h-full">
                            {focusedView === 'history' ? (
                                <EnergyHistoryView 
                                    history={bdfbData.telemetryHistory || []} 
                                    onClose={() => setFocusedView('none')} 
                                    title="Evolución Energética" 
                                />
                            ) : (
                                <div className="w-full h-full glass-panel rounded-3xl border-white/5 relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
                                    <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-black/20 relative z-20">
                                        <h2 className="text-xl font-black text-white uppercase italic tracking-widest">Diagrama de Conexiones</h2>
                                        <button 
                                            onClick={() => setFocusedView('none')}
                                            className="px-6 py-2.5 bg-accent-primary text-white font-black uppercase tracking-widest rounded-xl text-[10px]"
                                        >
                                            Cerrar Diagrama
                                        </button>
                                    </div>
                                    <div className="flex-1 p-8 relative z-10 flex items-center justify-center">
                                        {selectedConnection ? (
                                            <div className="w-full max-w-4xl h-[400px]">
                                                <MeteringDiagram connection={selectedConnection} bdfbName={bdfbData.name || 'Unknown BDFB'} />
                                            </div>
                                        ) : (
                                            <div className="text-center opacity-50">
                                                <Plus className="w-16 h-16 text-slate-500 mx-auto mb-4 animate-pulse" />
                                                <p className="text-sm font-black uppercase tracking-widest text-slate-400">Seleccione un breaker con mapeo</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex gap-6 min-w-0 h-full">
                            {/* Column 2: Detailed Rack List */}
                            <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
                                <BDFBRackDetail 
                                  panelName={selectedPanel?.name || ''} 
                                  breakers={activePanelBreakers} 
                                  mappedPositions={activeConnections.map(c => c.position)}
                                  onPositionClick={(panelName: string, b: BreakerData) => {
                                    setSelectedBreaker({ panelId: selectedPanelId || '', data: b });
                                  }}
                                />
                            </div>

                            {/* Column 3: Data & Mapping (Right Column) */}
                            <div className="w-[400px] flex flex-col gap-6 h-full min-h-0 overflow-hidden">
                                <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 shrink-0">
                                    <button 
                                        onClick={() => setFocusedView('history')}
                                        className="flex-1 py-2 px-3 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all text-slate-500 hover:text-white"
                                    >
                                        Ver Telemetría
                                    </button>
                                    <button 
                                        onClick={() => setFocusedView('diagram')}
                                        className="flex-1 py-2 px-3 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all text-slate-500 hover:text-white"
                                    >
                                        Ver Diagrama
                                    </button>
                                    <Link 
                                        href="/architecture"
                                        className="flex-1 py-2 px-3 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all text-accent-primary hover:text-white bg-accent-primary/10 hover:bg-accent-primary/20 text-center flex items-center justify-center border border-accent-primary/20"
                                    >
                                        Arquitectura
                                    </Link>
                                </div>

                                {/* LIVE MEASUREMENTS */}
                                <div className="glass-panel p-5 rounded-3xl border-white/5 bg-gradient-to-br from-slate-900/80 to-black shrink-0 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                                        <Cpu className="w-12 h-12" />
                                    </div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-[10px] font-black text-white tracking-[0.2em] uppercase italic flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-pulse shadow-[0_0_8px_#38bdf8]" />
                                            Live Data: {displayTelemetry.label}
                                        </h2>
                                        <button 
                                            onClick={() => { setSelectedBreaker(null); }}
                                            className="text-[8px] text-slate-500 hover:text-white transition-colors uppercase tracking-widest font-black"
                                        >
                                            Reset
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <MetricCard label="Voltaje" value={displayTelemetry.voltage} unit="V" color="text-accent-primary" stats={displayTelemetry.voltageHistory} />
                                        <MetricCard label="Corriente" value={displayTelemetry.current} unit="A" color="text-accent-secondary" stats={displayTelemetry.currentHistory} />
                                        <MetricCard label="Potencia" value={displayTelemetry.power} unit="kW" color="text-success" stats={displayTelemetry.powerHistory} />
                                        <MetricCard label="Energía" value={displayTelemetry.energy} unit="MWh" color="text-warning" stats={displayTelemetry.energyHistory} />
                                    </div>
                                </div>

                                {/* MAPEO DE PUERTOS */}
                                <div className="flex-1 flex flex-col min-h-0 bg-black/40 rounded-3xl border border-white/5 overflow-hidden shadow-inner">
                                    <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Mapeo de Puertos</h3>
                                        <span className="text-[8px] font-mono text-slate-600 bg-white/5 px-2 py-0.5 rounded uppercase font-bold tracking-widest">Panel {selectedPanel?.name || 'A2'}</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto px-1 py-1 space-y-1 custom-scrollbar">
                                        {activeConnections.length > 0 ? (
                                            activeConnections.map((c) => (
                                                <div 
                                                    key={c.id} 
                                                    className={`
                                                        grid grid-cols-[30px_1fr_60px] items-center gap-3 p-3 rounded-xl border transition-all cursor-default
                                                        ${selectedConnection?.id === c.id 
                                                            ? 'bg-accent-primary/10 border-accent-primary/30 shadow-[0_0_15px_rgba(14,165,233,0.1)]' 
                                                            : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'}
                                                    `}
                                                    onClick={() => {
                                                        const b = activePanelBreakers.find(pb => pb.position === c.position);
                                                        if (b) setSelectedBreaker({ panelId: selectedPanelId!, data: b });
                                                    }}
                                                >
                                                    <span className="text-[10px] font-mono text-slate-500">{c.port}</span>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[10px] font-black text-white truncate leading-tight uppercase">{c.clientName || 'N/A'}</span>
                                                        <span className="text-[8px] font-mono text-slate-500 tracking-tighter">POS: {c.panelName}-{c.position}</span>
                                                    </div>
                                                    <div className="flex justify-end">
                                                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border ${c.status === 'Activo' ? 'text-success border-success/20 bg-success/5' : 'text-warning border-warning/20 bg-warning/5'}`}>
                                                            {c.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center opacity-30 p-8 text-center grayscale">
                                                <Cpu className="w-10 h-10 text-slate-600 mb-3" />
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Sin conexiones mapeadas</p>
                                            </div>
                                        )}
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

const MetricCard = ({ label, value, unit, color, stats }: { label: string, value: string, unit: string, color: string, stats?: HistoryPoint }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className={`bg-white/[0.03] p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all flex flex-col relative overflow-hidden ${isExpanded ? 'col-span-2' : ''}`}>
            {/* Toggle Button */}
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors z-10"
            >
                {isExpanded ? (
                    <span className="text-[10px] text-slate-500 font-black leading-none">-</span>
                ) : (
                    <Plus className="w-3 h-3 text-slate-600" />
                )}
            </button>

            <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest block mb-1">{label}</span>
            <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-mono font-black ${color} tracking-tighter transition-all ${isExpanded ? 'text-3xl' : ''}`}>{value}</span>
                <span className="text-[10px] text-slate-600 font-bold">{unit}</span>
            </div>

            {isExpanded && stats && (
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="bg-black/20 p-2 rounded-lg">
                        <span className="text-[7px] text-slate-500 uppercase tracking-widest block mb-1">Promedio</span>
                        <span className="text-xs font-mono font-bold text-white tracking-widest">{stats.avg.toFixed(2)}<span className="text-[8px] ml-0.5 opacity-50">{unit}</span></span>
                    </div>
                    <div className="bg-black/20 p-2 rounded-lg">
                        <span className="text-[7px] text-slate-500 uppercase tracking-widest block mb-1">Máximo</span>
                        <span className="text-xs font-mono font-bold text-white tracking-widest">{stats.max.toFixed(2)}<span className="text-[8px] ml-0.5 opacity-50">{unit}</span></span>
                    </div>
                    <div className="bg-black/20 p-2 rounded-lg">
                        <span className="text-[7px] text-slate-500 uppercase tracking-widest block mb-1">Mínimo</span>
                        <span className="text-xs font-mono font-bold text-white tracking-widest">{stats.min.toFixed(2)}<span className="text-[8px] ml-0.5 opacity-50">{unit}</span></span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BDFBDetailPage;
