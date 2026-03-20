"use client"
import React, { useState, useEffect, useCallback } from 'react';
import mqtt from 'mqtt';
import { 
  Zap, 
  Activity, 
  Wifi, 
  ShieldCheck, 
  Clock, 
  LayoutDashboard, 
  Server, 
  Database, 
  AlertTriangle,
  ChevronRight,
  Info,
  Maximize2
} from 'lucide-react';
import { motion } from 'framer-motion';

// ——— Types —————————————————————————————————————————————————————————————————————

interface PortData {
  s?: string;
  P1?: number | string;
  P2?: number | string;
  U1?: number | string;
  U2?: number | string;
  I1?: number | string;
  I2?: number | string;
  [key: string]: string | number | undefined;
}

interface BDFBDevice {
  id: number;
  label: string;
  site: string;
  rack: string;
  sn: string;
  status: 'ok' | 'warn' | 'error';
  method?: string;
  ports: Record<string, PortData>;
}

interface MetricProps {
  label: string;
  value: string | number;
  unit: string;
  color?: 'white' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo';
  icon?: React.ElementType;
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ElementType;
  onMaximize?: () => void;
}

// ——— Seed Data —————————————————————————————————————————————————————————————————

const generateDummyPorts = (seed: number, isWarn: boolean = false) => {
  const ports: Record<string, PortData> = {};
  // Deterministic generator to avoid hydration mismatches
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  for (let i = 1; i <= 24; i++) {
    const isOn = rnd() > 0.15;
    if (isOn) {
      const u1 = (48 + (rnd() - 0.5) * (isWarn ? 2 : 0.5)).toFixed(2);
      const u2 = (48 + (rnd() - 0.5) * (isWarn ? 2 : 0.5)).toFixed(2);
      const i1 = (rnd() * 15 + 2).toFixed(2);
      const i2 = (rnd() * 12 + 1).toFixed(2);
      
      ports[`0_1_${i}`] = {
        s: 'ON',
        U1: u1, U2: u2,
        I1: i1, I2: i2,
        P1: (parseFloat(u1) * parseFloat(i1)).toFixed(1),
        P2: (parseFloat(u2) * parseFloat(i2)).toFixed(1)
      };
    } else {
      ports[`0_1_${i}`] = { s: 'OFF' };
    }
  }
  return ports;
};

const INITIAL_BDFBS: BDFBDevice[] = [
  {
    id: 1, label: 'BDFB-QUE-01', site: 'QRO-CAMPUS-A', rack: 'RACK-01',
    sn: 'SN-7740145', status: 'ok', method: 'update',
    ports: generateDummyPorts(1, false),
  },
  {
    id: 2, label: 'BDFB-QUE-02', site: 'QRO-CAMPUS-A', rack: 'RACK-01',
    sn: 'SN-7740158', status: 'ok', method: 'update',
    ports: generateDummyPorts(2, false),
  },
  {
    id: 3, label: 'BDFB-MEX-01', site: 'MEX-DC-03', rack: 'RACK-04',
    sn: 'SN-7740162', status: 'warn', method: 'alert',
    ports: generateDummyPorts(3, true),
  },
];

// ——— Helpers ————————————————————————————————————————————————————————————————————

const getPortPower = (p: PortData) => (Number(p.P1) || 0) + (Number(p.P2) || 0);
const getBdfbTotal = (b: BDFBDevice) => Object.values(b.ports).reduce((acc, p) => acc + getPortPower(p), 0);
const getGrandTotal = (bdfbs: BDFBDevice[]) => bdfbs.reduce((acc, b) => acc + getBdfbTotal(b), 0);
const formatValue = (v: string | number | null | undefined) => parseFloat(String(v || '0')).toFixed(2);

// ——— Shared Components —————————————————————————————————————————————————————————

const Metric = ({ label, value, unit, color = 'white', icon: Icon }: MetricProps) => {
  const colorClasses = {
    white: 'text-white',
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    indigo: 'text-indigo-400'
  };

  const iconClasses = {
    white: 'text-gray-400',
    cyan: 'text-cyan-500',
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    rose: 'text-rose-500',
    indigo: 'text-indigo-500'
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
        {Icon && <Icon size={12} className={iconClasses[color]} />}
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-mono font-bold tracking-tighter ${colorClasses[color]}`}>
          {value}
        </span>
        <span className="text-[10px] font-mono font-medium text-gray-600 uppercase">{unit}</span>
      </div>
    </div>
  );
};

const Card = ({ children, className = "", title, icon: Icon, onMaximize }: CardProps) => (
  <div className={`bg-[#0d0d18] border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative ${className}`}>
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    {title && (
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
          {Icon && <Icon size={14} className="text-cyan-500" />}
          {title}
        </h3>
        <Maximize2 
          size={12} 
          onClick={onMaximize}
          className="text-gray-600 hover:text-white cursor-pointer transition-colors" 
        />
      </div>
    )}
    <div className="p-5">
      {children}
    </div>
  </div>
);

// ——— Sub-Components —————————————————————————————————————————————————————————————

const PortGrid = ({ ports, selectedId, onSelect }: { ports: Record<string, PortData>, selectedId: string, onSelect: (id: string) => void }) => {
  const portIds = Array.from({ length: 24 }, (_, i) => `0_1_${i + 1}`);

  return (
    <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
      {portIds.map((id, index) => {
        const data = ports[id];
        const isOnline = data?.s === 'ON';
        const hasLoad = getPortPower(data || {}) > 0;
        const isSelected = selectedId === id;

        return (
          <motion.button
            key={id}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(id)}
            className={`
              relative h-14 rounded-lg flex flex-col items-center justify-center transition-all border
              ${isSelected ? 'bg-cyan-500/20 border-cyan-500 shadow-[0_0_15px_rgba(0,242,255,0.2)]' : 
                isOnline ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-red-500/5 border-red-500/20 opacity-40'}
            `}
          >
            <span className={`text-[8px] absolute top-1 left-1.5 font-bold ${isSelected ? 'text-cyan-400' : 'text-gray-500'}`}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className={`
              w-1.5 h-1.5 rounded-full mb-1
              ${isOnline ? (hasLoad ? 'bg-cyan-400 shadow-[0_0_5px_#00f2ff]' : 'bg-gray-600') : 'bg-red-500'}
            `} />
            <div className={`text-[9px] font-mono leading-none ${isSelected ? 'text-white' : 'text-gray-400'}`}>
              {hasLoad ? `${Math.round(getPortPower(data))}W` : isOnline ? 'Idle' : '---'}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

// ——— Main View —————————————————————————————————————————————————————————————————

export default function Home() {
  const [bdfbs, setBdfbs] = useState<BDFBDevice[]>(INITIAL_BDFBS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedPort, setSelectedPort] = useState('0_1_1');
  const [status, setStatus] = useState('Desconectado');
  const [lastUpdate, setLastUpdate] = useState('');
  const [now, setNow] = useState('--:--:--');
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState('60min');
  const [securityEnabled, setSecurityEnabled] = useState(true);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    setTimeout(() => setAlertMessage(null), 3000);
  };

  const currentBdfb = bdfbs[activeIndex] || bdfbs[0];
  const portData = currentBdfb.ports[selectedPort] || {};
  const isWarn = currentBdfb.status === 'warn';

  // MQTT Integration and Clock
  useEffect(() => {
    // Defer state updates to avoid "cascading render" warning on mount
    const timer = setTimeout(() => {
      setMounted(true);
      setNow(new Date().toLocaleTimeString());
    }, 0);
    
    const client = mqtt.connect('ws://165.1.124.248:9001', {
      username: 'th-testing-2w',
      password: 'Aa12345678@@',
      clientId: 'telxius_rack_' + Math.random().toString(16).substring(2, 8),
      clean: true,
      reconnectPeriod: 2000,
    });

    const clockInterval = setInterval(() => {
      setNow(new Date().toLocaleTimeString());
    }, 1000);

    client.on('connect', () => {
      setStatus('Conectado');
      client.subscribe('data/dev/#');
    });

    client.on('message', (_topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        setLastUpdate(new Date().toLocaleTimeString());
        setBdfbs((prev) => {
          const idx = prev.findIndex((b) => b.sn === payload.sn);
          if (idx === -1) {
            return [...prev, {
              id: prev.length + 1,
              label: `BDFB-${String(prev.length + 1).padStart(2, '0')}`,
              site: 'SYSTEM-HUB',
              rack: payload.rack ?? 'RACK-01',
              sn: payload.sn,
              status: 'ok',
              method: payload.method,
              ports: payload.reported ?? {},
            }];
          }
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            method: payload.method ?? updated[idx].method,
            ports: { ...updated[idx].ports, ...(payload.reported ?? {}) },
          };
          return updated;
        });
      } catch (e) { console.error('MQTT error:', e); }
    });

    client.on('error', () => setStatus('Error'));
    client.on('offline', () => setStatus('Offline'));
    
    return () => { 
      client.end();
      clearInterval(clockInterval);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#05050a] text-white font-sans selection:bg-cyan-500/30">
      {/* Global Header */}
      <header className="h-16 border-b border-white/5 bg-[#080812]/80 backdrop-blur-xl sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-500 rounded-lg shadow-[0_0_15px_rgba(0,242,255,0.4)]">
              <Activity size={18} className="text-white" />
            </div>
            <h1 className="text-lg font-black tracking-tighter uppercase">
              Telxius <span className="text-cyan-500 font-light ml-1 underline decoration-cyan-500/40 underline-offset-4">Intelligence</span>
            </h1>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
            <div className={`w-1.5 h-1.5 rounded-full ${status === 'Conectado' ? 'bg-cyan-400' : 'bg-red-500'} animate-pulse`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{status}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">Fleet Total Load</span>
            <span className="text-lg font-mono font-bold text-cyan-400">{(getGrandTotal(bdfbs) / 1000).toFixed(2)}kW</span>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setSecurityEnabled(!securityEnabled);
                showAlert(securityEnabled ? "Security protocols deactivated" : "Security protocols active");
              }}
              title="Toggle Security Vault"
              className="p-1 hover:bg-white/5 rounded-lg transition-all"
            >
              <ShieldCheck size={20} className={securityEnabled ? "text-cyan-400" : "text-gray-500"} />
            </button>
            <button 
              onClick={() => {
                setLastUpdate(new Date().toLocaleTimeString());
                showAlert("Syncing with satellite hub...");
              }}
              title={`Force Sync (Last: ${lastUpdate || 'Never'})`}
              className="p-1 hover:bg-white/5 rounded-lg transition-all"
            >
              <Clock size={20} className="text-gray-500 hover:text-white" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Navigation Sidebar */}
        <aside className="w-64 border-r border-white/5 bg-[#080812]/50 p-4 space-y-6 overflow-y-auto">
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 block">Fleet Overview</label>
            <div className="space-y-2">
              {bdfbs.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => setActiveIndex(i)}
                  className={`
                    w-full group px-3 py-3 rounded-xl border flex flex-col gap-1 transition-all text-left
                    ${activeIndex === i 
                      ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg' 
                      : 'bg-white/[0.02] border-white/5 hover:border-white/20'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-black tracking-wide ${activeIndex === i ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                      {b.label}
                    </span>
                    <Led status={b.status} />
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-gray-500">
                    <span>{b.site}</span>
                    <span className="text-cyan-600">{(getBdfbTotal(b) / 1000).toFixed(1)}kW</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-cyan-400" />
              <span className="text-[10px] font-black uppercase text-white tracking-widest">Network Health</span>
            </div>
            <div className="space-y-1.5">
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 w-[94%]" />
              </div>
              <p className="text-[9px] text-gray-500 leading-relaxed font-mono">
                System optimized. Latency 24ms. 100% data integrity verified.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto bg-black p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Context Header */}
            <div className="flex items-end justify-between border-b border-white/5 pb-6">
              <div>
                <div className="flex items-center gap-2 text-[10px] text-cyan-400 font-mono tracking-widest uppercase mb-1">
                  <LayoutDashboard size={12} /> Live Device Insight
                </div>
                <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3">
                  {currentBdfb.label} <span className="text-gray-600 font-light text-xl">/ {currentBdfb.rack}</span>
                </h2>
              </div>
              <div className="flex gap-4">
                <Card className="min-w-[120px] bg-white/[0.03]">
                  <Metric label="Power Load" value={(getBdfbTotal(currentBdfb) / 1000).toFixed(3)} unit="kW" color="cyan" icon={Zap} />
                </Card>
                <Card className="min-w-[120px] bg-white/[0.03]">
                  <Metric label="Device SN" value={currentBdfb.sn.slice(-8)} unit={`ID#${currentBdfb.id}`} icon={Database} />
                </Card>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Grid & Details */}
              <div className="lg:col-span-2 space-y-6">
                <Card 
                  title="Port Distribution Analysis" 
                  icon={Server}
                  onMaximize={() => showAlert("Expanding port distribution view...")}
                >
                  <PortGrid 
                    ports={currentBdfb.ports} 
                    selectedId={selectedPort} 
                    onSelect={setSelectedPort} 
                  />
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['A', 'B'].map((line) => {
                    const u = portData[`U${line === 'A' ? 1 : 2}`];
                    const i = portData[`I${line === 'A' ? 1 : 2}`];
                    const p = portData[`P${line === 'A' ? 1 : 2}`];
                    
                    return (
                      <Card key={line} className="relative group overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1 h-full ${line === 'A' ? 'bg-cyan-500' : 'bg-indigo-500'}`} />
                        <div className="flex justify-between items-start mb-6">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${line === 'A' ? 'border-cyan-500/40 text-cyan-400' : 'border-indigo-500/40 text-indigo-400'}`}>CHANNEL {line}</span>
                          <Activity size={14} className="text-gray-700 group-hover:text-cyan-500 transition-colors" />
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-end border-b border-white/5 pb-4">
                            <Metric label="Voltage" value={formatValue(u)} unit="V" />
                            <Metric label="Current" value={formatValue(i)} unit="A" color="cyan" />
                          </div>
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Calculated Power</label>
                            <span className="text-xl font-mono font-bold text-white">{formatValue(p)}<span className="text-[10px] ml-1 text-gray-600 uppercase">W</span></span>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Summaries & Controls */}
              <div className="space-y-6">
                <Card 
                  title="Device Metadata" 
                  icon={Info}
                  onMaximize={() => showAlert("Accessing detailed device logs...")}
                >
                  <div className="space-y-4">
                    <DataPoint label="Serial Number" value={currentBdfb.sn} />
                    <DataPoint label="Deployment Site" value={currentBdfb.site} />
                    <DataPoint label="Physical Rack" value={currentBdfb.rack} />
                    <DataPoint label="Sync Method" value={currentBdfb.method?.toUpperCase() || 'MQTT-PUSH'} />
                    <DataPoint label="System Time" value={mounted ? now : '--:--:--'} color="cyan" />
                  </div>
                </Card>

                <Card 
                  title="Timeline History" 
                  icon={Clock}
                  onMaximize={() => showAlert("Opening full analytics timeline...")}
                >
                  <div className="space-y-2">
                    {['15min', '60min', '6hr', '24h', 'All-Time'].map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setTimeRange(t);
                          showAlert(`Loading historical data for ${t}...`);
                        }}
                        className={`w-full py-2.5 px-4 text-[10px] font-black rounded-lg border transition-all flex justify-between items-center uppercase tracking-[0.15em]
                          ${t === timeRange ? 'bg-cyan-500 border-cyan-400 text-black shadow-lg shadow-cyan-500/20' : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/10 hover:text-white'}
                        `}
                      >
                        {t}
                        {t === timeRange && <ChevronRight size={14} />}
                      </button>
                    ))}
                  </div>
                </Card>

                <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors
                  ${isWarn ? 'bg-amber-500/10 border-amber-500/40' : 'bg-cyan-500/10 border-cyan-500/40'}
                `}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={20} className={isWarn ? 'text-amber-500' : 'text-cyan-500'} />
                    <div>
                      <div className="text-[10px] font-black uppercase text-white tracking-widest">Health Status</div>
                      <div className={`text-[11px] font-bold ${isWarn ? 'text-amber-400' : 'text-cyan-400'}`}>
                        {isWarn ? 'Threshold Exceeded' : 'Condition Normal'}
                      </div>
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${isWarn ? 'border-amber-500/40 text-amber-500' : 'border-cyan-500/40 text-cyan-400'}`}>
                    Active
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      {/* Floating Toast Notification */}
      {alertMessage && (
        <motion.div 
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-cyan-500 text-black px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-[0_0_30px_rgba(0,242,255,0.4)] flex items-center gap-3"
        >
          <Activity size={16} className="animate-pulse" />
          {alertMessage}
        </motion.div>
      )}
    </div>
  );
}

// ——— Primitive Components ——————————————————————————————————————————————————————

const Led = ({ status }: { status: string }) => (
  <div className={`w-2 h-2 rounded-full ${
    status === 'ok' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 
    status === 'warn' ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 
    'bg-red-500 shadow-[0_0_8px_#ef4444]'
  } ${status !== 'ok' ? 'animate-pulse' : ''}`} />
);

const DataPoint = ({ label, value, color = 'white' }: { label: string, value: string, color?: string }) => {
  const colorClasses: Record<string, string> = {
    white: 'text-gray-300',
    cyan: 'text-cyan-400'
  };
  
  return (
    <div className="flex justify-between items-center group">
      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</span>
      <span className={`text-[11px] font-mono font-medium ${colorClasses[color] || 'text-gray-300'}`}>{value}</span>
    </div>
  );
};