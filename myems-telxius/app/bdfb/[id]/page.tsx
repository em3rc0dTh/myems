"use client"
import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import BDFBRackDetail from '@/components/BDFBRackDetail';
import ConnectionMap from '@/components/ConnectionMap';
import { Plus } from 'lucide-react';
import { BDFB_MOCK_DATA, RAW_MQTT_MOCK } from '@/lib/mockData';
import { BDFBData, HistoryPoint, PanelData, BreakerData } from '@/lib/types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const BDFBDetailPage: React.FC = () => {
  const { id } = useParams();
  const [showConnectionMap, setShowConnectionMap] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [selectedBreaker, setSelectedBreaker] = useState<{ panel: string, data: BreakerData } | null>(null);

  // Retrieve the selected BDFB from dummy data based on ID
  const bdfbData = BDFB_MOCK_DATA.find((b: BDFBData) => b.id === id) || BDFB_MOCK_DATA[0];

  // Logic to 'Apply' MQTT RAW DATA to our visual model
  const lastMqttPayload = RAW_MQTT_MOCK.find(p => p.sn === bdfbData.sn);

  const getPanelBreakers = (panelName: string) => {
    const staticBreakers = bdfbData.panels.find((p: PanelData) => p.name === panelName)?.breakers || [];

    // Enrich with MQTT data if available (mapping 0_1_X to position X)
    return staticBreakers.map(breaker => {
      if (!lastMqttPayload) return breaker;

      const mqttKey = `0_1_${breaker.position}`;
      const mqttReport = lastMqttPayload.reported[mqttKey];

      if (mqttReport) {
        return {
          ...breaker,
          voltage: mqttReport.U1,
          current: mqttReport.I1,
          power: mqttReport.P1,
          energy: mqttReport.EP1,
          online: mqttReport.state === 'ONLINE'
        };
      }
      return breaker;
    });
  };

  return (
    <main className="h-screen w-screen overflow-hidden p-6 lg:p-10 flex flex-col gap-6">

      {/* Navigation & Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <Link href="/" className="p-3 bg-white/5 hover:bg-accent-primary/20 rounded-2xl border border-white/10 transition-all text-slate-400 hover:text-accent-primary group">
            <svg className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3">
              <span className="text-gradient">Detalle {id?.toString().toUpperCase()}</span>
              <span className="text-[10px] px-2 py-0.5 bg-success/20 text-success rounded-full font-mono border border-success/20 tracking-tighter">SISTEMA ONLINE</span>
            </h1>
            <p className="text-slate-500 text-xs mt-0.5 uppercase tracking-widest font-bold">Sala 1 • Rack A-01-01</p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setShowStatistics(!showStatistics)}
            className="px-6 py-3 bg-accent-secondary rounded-xl border border-accent-secondary/50 font-bold text-[10px] tracking-widest shadow-xl shadow-accent-secondary/20 hover:scale-105 transition-all active:scale-95"
          >
            {showStatistics ? 'CERRAR TELEMETRÍA' : 'VER TELEMETRÍA'}
          </button>
          <button
            onClick={() => setShowConnectionMap(!showConnectionMap)}
            className="px-6 py-3 bg-accent-secondary rounded-xl border border-accent-secondary/50 font-bold text-[10px] tracking-widest shadow-xl shadow-accent-secondary/20 hover:scale-105 transition-all active:scale-95"
          >
            {showConnectionMap ? 'CERRAR DIAGRAMA' : 'VER DIAGRAMA DE CONEXIÓN'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 relative">

        {/* Connection Map Overlay */}
        {showConnectionMap && (
          <div className="absolute inset-0 z-50 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-full h-full glass-panel rounded-3xl overflow-hidden flex flex-col p-8">
              <ConnectionMap />
            </div>
          </div>
        )}
        {/* Statistics Section */}
        {showStatistics && (
          <div className="absolute inset-0 z-50 animate-in fade-in zoom-in-95 duration-300 glass-panel p-6 rounded-3xl border-white/5 flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 shrink-0 px-2">
              <h3 className="text-xl font-bold text-white tracking-tight">Evolución Energética</h3>
              <div className="flex gap-2">
                <TimeFilter label="24H" active />
                <TimeFilter label="7D" />
                <TimeFilter label="30D" />
              </div>
            </div>
            <div className="flex-1 border-t border-dashed border-white/5 flex flex-col gap-6 p-4 relative bg-black/20 rounded-2xl overflow-y-auto custom-scrollbar">

              <div className="h-[200px] w-full">
                <p className="text-[10px] text-accent-primary font-bold uppercase mb-2 tracking-[0.2em]">Evolución Voltaje (V)</p>
                <ResponsiveContainer width="100%" height="80%">
                  <AreaChart data={bdfbData.telemetryHistory}>
                    <defs>
                      <linearGradient id="colorVoltage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                      itemStyle={{ color: '#3b82f6', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="voltage" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVoltage)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="h-[200px] w-full">
                <p className="text-[10px] text-accent-secondary font-bold uppercase mb-2 tracking-[0.2em]">Consumo Corriente (A)</p>
                <ResponsiveContainer width="100%" height="80%">
                  <AreaChart data={bdfbData.telemetryHistory}>
                    <defs>
                      <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                      itemStyle={{ color: '#ec4899', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="current" stroke="#ec4899" fillOpacity={1} fill="url(#colorCurrent)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full">

          {/* Left Column: Physical View and History */}
          <div className="xl:col-span-8 flex flex-col gap-6 h-full min-h-0">
            <div className="grid grid-cols-2 gap-3 shrink-0 h-full overflow-y-auto">
              <BDFBRackDetail panelName="A2" breakers={getPanelBreakers('A2')} onPositionClick={(panel, b) => setSelectedBreaker({ panel, data: b })} />
              <BDFBRackDetail panelName="B2" breakers={getPanelBreakers('B2')} onPositionClick={(panel, b) => setSelectedBreaker({ panel, data: b })} />
              <BDFBRackDetail panelName="A1" breakers={getPanelBreakers('A1')} onPositionClick={(panel, b) => setSelectedBreaker({ panel, data: b })} />
              <BDFBRackDetail panelName="B1" breakers={getPanelBreakers('B1')} onPositionClick={(panel, b) => setSelectedBreaker({ panel, data: b })} />
            </div>


          </div>

          {/* Right Column: Measuring and Metrics */}
          <div className="xl:col-span-4 flex flex-col gap-6 h-full min-h-0">

            {/* Real Time Measurements */}
            <div className="glass-panel p-6 rounded-3xl border-white/5 shadow-2xl relative overflow-hidden group flex flex-col h-auto min-h-0">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                <svg className="w-24 h-24 text-accent-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14H11V21L20 10H13Z" />
                </svg>
              </div>

              <h2 className="text-xl font-black text-white mb-6 tracking-tighter uppercase italic flex items-center gap-3 shrink-0">
                <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-pulse" />
                Live Data
              </h2>

              <div className="grid grid-cols-2 gap-4 overflow-auto pr-1 custom-scrollbar">
                <MetricCard label="Voltaje" value={bdfbData.telemetry?.voltage?.toString() || "0"} unit="V" color="text-accent-primary" size="small" history={bdfbData.telemetry?.voltageHistory} />
                <MetricCard label="Corriente" value={bdfbData.telemetry?.current?.toString() || "0"} unit="A" color="text-accent-secondary" size="small" history={bdfbData.telemetry?.currentHistory} />
                <MetricCard label="Potencia" value={bdfbData.telemetry?.power?.toString() || "0"} unit="kW" color="text-success" size="small" history={bdfbData.telemetry?.powerHistory} />
                <MetricCard label="Energía" value={bdfbData.telemetry?.energy?.toString() || "0"} unit="MWh" color="text-warning" size="small" history={bdfbData.telemetry?.energyHistory} />
              </div>

              {/* <button className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all font-bold text-[10px] uppercase tracking-widest text-slate-500 shrink-0">
                Data Stream
              </button> */}
            </div>

            {/* Ports and Relationship Table */}
            <div className="glass-panel p-6 rounded-3xl border-white/5 flex-1 min-h-0 flex flex-col">
              <h3 className="text-base font-bold text-white mb-4 tracking-tight shrink-0">Mapeo de Puertos</h3>
              <div className="flex-1 overflow-auto space-y-2 pr-1 custom-scrollbar">
                {bdfbData.connections?.map((conn) => (
                  <RelationshipRow
                    key={conn.id}
                    port={conn.port}
                    position={`${conn.panelName}-Pos ${conn.position}`}
                    status={conn.status}
                  />
                ))}
                {(!bdfbData.connections || bdfbData.connections.length === 0) && (
                  <p className="text-xs text-slate-500 uppercase">Sin mapeos detectados</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Position Detail Modal */}
      {selectedBreaker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedBreaker(null)} />
           <div className="relative w-full max-w-lg glass-panel p-8 rounded-3xl border-white/10 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-white">Detalle de Posición</h3>
                  <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">{selectedBreaker.panel} • Posición {selectedBreaker.data.position}</p>
                </div>
                <button onClick={() => setSelectedBreaker(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-slate-500" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="p-5 bg-black/40 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block mb-4">Información de Operación</span>
                  <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                    <ModalMetric label="Etiqueta" value={selectedBreaker.data.label || 'S/E'} color="text-white" />
                    <ModalMetric label="Estado" value={selectedBreaker.data.online !== false ? 'ONLINE' : 'OFFLINE'} color={selectedBreaker.data.online !== false ? 'text-success' : 'text-danger'} />
                    <ModalMetric label="Voltaje" value={selectedBreaker.data.voltage || '0'} unit="V" color="text-accent-primary" />
                    <ModalMetric label="Corriente" value={selectedBreaker.data.current || '0'} unit="A" color="text-accent-secondary" />
                    <ModalMetric label="Potencia" value={selectedBreaker.data.power || '0'} unit="kW" color="text-success" />
                    <ModalMetric label="Energía" value={selectedBreaker.data.energy || '0'} unit="MWh" color="text-warning" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button className="py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 font-bold text-[10px] uppercase tracking-widest transition-all">Ver PDF Reporte</button>
                  <button className="py-4 bg-accent-primary text-white rounded-2xl shadow-xl shadow-accent-primary/20 font-bold text-[10px] uppercase tracking-widest transition-all hover:scale-[1.02]">Editar Etiqueta</button>
                </div>
              </div>
           </div>
        </div>
      )}
    </main>
  );
};

const ModalMetric = ({ label, value, unit, color }: { label: string, value: string, unit?: string, color: string }) => (
  <div className="flex flex-col">
    <span className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter mb-1">{label}</span>
    <div className="flex items-baseline gap-1">
      <span className={`text-xl font-mono font-black ${color} tracking-tighter`}>{value}</span>
      {unit && <span className="text-[10px] text-slate-600 font-bold">{unit}</span>}
    </div>
  </div>
);

const TimeFilter = ({ label, active }: { label: string, active?: boolean }) => (
  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${active ? 'bg-accent-primary/20 text-accent-primary border-accent-primary/30' : 'bg-white/5 text-slate-500 border-white/5 hover:text-slate-300'}`}>
    {label}
  </span>
);

const MetricCard = ({ label, value, unit, color, size, history }: { label: string, value: string, unit: string, color: string, size?: 'small', history?: HistoryPoint }) => {
  const [showHistory, setShowHistory] = React.useState(false);

  return (
    <div className={`bg-black/20 p-4 rounded-2xl border border-white/5 group-hover:border-white/10 transition-all ${showHistory ? 'row-span-2' : ''}`}>
      <div className="flex justify-between items-start mb-1">
        <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest block">{label}</span>
        {history && (
          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${history.trend === 'up' ? 'bg-danger/10 text-danger' : history.trend === 'down' ? 'bg-success/10 text-success' : 'bg-slate-800 text-slate-400'}`}>
            {history.trend === 'up' ? '▲ Alta' : history.trend === 'down' ? '▼ Baja' : '● Est'}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`${size === 'small' ? 'text-3xl' : 'text-5xl'} font-mono font-black ${color} tracking-tighter`}>{value}</span>
        <span className="text-sm text-slate-600 font-bold">{unit}</span>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`ml-auto p-1 rounded-lg border border-white/5 hover:border-white/20 transition-all ${showHistory ? 'bg-accent-primary text-white' : 'bg-black/30 text-slate-600 hover:text-white'}`}
        >
          {showHistory ? <div className="w-5 h-5 flex items-center justify-center font-bold">−</div> : <Plus className="w-5 h-5" />}
        </button>
      </div>

      {showHistory && history && (
        <div className="mt-4 pt-4 border-t border-dashed border-white/10 space-y-3 animate-in slide-in-from-top-2 duration-300">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter mb-2">Estadísticas (24h)</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 p-2 rounded-xl">
              <span className="text-[8px] text-slate-500 uppercase block">Promedio</span>
              <span className="text-sm font-mono font-bold text-white">{history.avg}<span className="text-[10px] ml-1">{unit}</span></span>
            </div>
            <div className="bg-white/5 p-2 rounded-xl">
              <span className="text-[8px] text-slate-500 uppercase block">Máximo</span>
              <span className="text-sm font-mono font-bold text-danger">{history.max}<span className="text-[10px] ml-1">{unit}</span></span>
            </div>
            <div className="bg-white/5 p-2 rounded-xl">
              <span className="text-[8px] text-slate-500 uppercase block">Mínimo</span>
              <span className="text-sm font-mono font-bold text-success">{history.min}<span className="text-[10px] ml-1">{unit}</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RelationshipRow = ({ port, position, status }: { port: string, position: string, status: string }) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-sm">
    <span className="font-mono text-slate-400">{port}</span>
    <span className="font-bold text-white">→</span>
    <span className="font-mono text-slate-400">{position}</span>
    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${status === 'Activo' ? 'bg-success/10 text-success' : status === 'Reservado' ? 'bg-warning/10 text-warning' : 'bg-slate-800 text-slate-500'}`}>
      {status}
    </span>
  </div>
);

export default BDFBDetailPage;
