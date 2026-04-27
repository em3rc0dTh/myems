"use client"
import React, { useMemo } from 'react';
import { HistoryDataPoint } from '@/lib/types';
import { Activity, Zap, TrendingUp, Clock } from 'lucide-react';

interface EnergyHistoryViewProps {
    history: HistoryDataPoint[];
    onClose: () => void;
    title: string;
    range: '24h' | '7d' | '30d';
    onRangeChange: (range: '24h' | '7d' | '30d') => void;
    loading?: boolean;
}

const EnergyHistoryView: React.FC<EnergyHistoryViewProps> = ({ 
    history, onClose, title, range, onRangeChange, loading 
}) => {
    // Generate SVG path for a simple area chart
    const generatePath = (data: number[], height: number, width: number) => {
        if (data.length <= 1) return { linePath: "", areaPath: "" };
        const max = Math.max(...data) * 1.05;
        const min = Math.min(...data) * 0.95;
        const valRange = max - min || 1;

        const points = data.map((val, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((val - min) / valRange) * height;
            return `${x},${y}`;
        });

        const linePath = `M ${points.join(' L ')}`;
        const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

        return { linePath, areaPath };
    };

    const voltageData = useMemo(() => history.map(d => d.voltage || 0), [history]);
    const currentData = useMemo(() => history.map(d => d.current || 0), [history]);

    const vPaths = generatePath(voltageData, 180, 800);
    const iPaths = generatePath(currentData, 180, 800);

    const xLabels = useMemo(() => {
        if (range === '24h') return ['-24 HRS', '-16 HRS', '-8 HRS', 'AHORA'];
        if (range === '7d') return ['-7 DÍAS', '-5 DÍAS', '-2 DÍAS', 'HOY'];
        if (range === '30d') return ['-30 DÍAS', '-20 DÍAS', '-10 DÍAS', 'HOY'];
        return ['00:00', '08:00', '16:00', '23:59'];
    }, [range]);

    // --- CÁLCULOS SEGUROS (Evitar Infinity/NaN) ---
    const hasData = history.length > 0;
    
    const minV = hasData ? Math.min(...voltageData.filter(v => v > 0)) : 0;
    const maxV = hasData ? Math.max(...voltageData) : 0;
    const maxA = hasData ? Math.max(...currentData) : 0;
    const avgA = hasData ? (currentData.reduce((a, b) => a + b, 0) / currentData.length) : 0;
    const avgV = hasData ? (voltageData.reduce((a, b) => a + b, 0) / voltageData.length) : 48;
    
    const maxKW = (maxA * maxV) / 1000;
    const totalKWh = (avgA * avgV * (range === '24h' ? 24 : range === '7d' ? 168 : 720)) / 1000;
    const vFluctuation = hasData && minV > 0 ? ((maxV - minV) / minV * 100) : 0;

    return (
        <div className="w-full h-full glass-panel rounded-3xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-500 bg-slate-950/40 backdrop-blur-3xl border-white/10 shadow-2xl relative">

            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            {/* Header */}
            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center relative z-[110] bg-black/40 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent-primary/10 rounded-2xl border border-accent-primary/20">
                        <Activity className="w-6 h-6 text-accent-primary animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">{title}</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold mt-0.5">Evolución Energética y Análisis de Carga</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
                        {[
                            { id: '24h', label: '24H' },
                            { id: '7d', label: '7D' },
                            { id: '30d', label: '30D' }
                        ].map((t) => {
                            const isActive = range === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => onRangeChange(t.id as any)}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all duration-300 ${isActive ? 'bg-sky-500 text-black shadow-[0_0_20px_rgba(14,165,233,0.4)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                >
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all shadow-lg hover:shadow-white/5"
                    >
                        Cerrar Telemetría
                    </button>
                </div>
            </div>

            {/* Main Content + Sidebar Wrapper */}
            <div className="flex-1 flex min-h-0 relative">
                {/* Charts Area */}
          <div className="flex-1 p-8 flex flex-col gap-12 overflow-y-auto custom-scrollbar relative z-10 group/ekg-container">
                {/* CRT SCANLINE OVERLAY */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[100]" 
                     style={{ backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 4px, 3px 100%' }} />

                {/* EKG STYLE DEFS */}
                <svg className="hidden">
                    <defs>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="1.5" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                </svg>

                {loading && (
                    <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                        <div className="relative">
                            <Activity className="w-12 h-12 text-emerald-500 animate-pulse" />
                            <div className="absolute inset-0 w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                        </div>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mt-6 animate-pulse font-mono">DIAGNOSING VITAL PULSE...</p>
                    </div>
                )}

                {/* Voltage EKG */}
                <div className="flex flex-col gap-4 relative">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic font-mono flex items-center gap-2">
                                <span className="opacity-40">[0x44]</span> V-PULSE LOGIC
                            </span>
                        </div>
                        <div className="text-[8px] font-mono text-emerald-500/40 uppercase tracking-widest">Buffer Status: 100%</div>
                    </div>
                    <div className="h-[220px] w-full relative bg-black/60 rounded-xl border border-emerald-900/30 overflow-hidden group/chart cursor-crosshair transition-all hover:border-emerald-500/40 hover:bg-black/80">
                        {/* EKG Grid Background */}
                        <div className="absolute inset-0 opacity-20" 
                             style={{ backgroundImage: 'linear-gradient(#059669 1px, transparent 1px), linear-gradient(90deg, #059669 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                        <div className="absolute inset-0 opacity-10" 
                             style={{ backgroundImage: 'linear-gradient(#059669 1px, transparent 1px), linear-gradient(90deg, #059669 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
                        
                        {/* THE SCAN LINE */}
                        <div className="absolute top-0 bottom-0 w-1 bg-emerald-500/50 shadow-[0_0_15px_#10b981] z-20 animate-scan pointer-events-none" />

                        {/* MOUSE CROSSHAIR */}
                        <div className="absolute top-0 bottom-0 w-px bg-white/20 z-30 opacity-0 group-hover/chart:opacity-100 pointer-events-none" 
                             style={{ left: 'var(--mouse-x, 0%)' }} />

                        <svg className="w-full h-full relative z-10 p-4" viewBox="0 0 800 180" preserveAspectRatio="none"
                             onMouseMove={(e) => {
                                 const rect = e.currentTarget.getBoundingClientRect();
                                 const x = ((e.clientX - rect.left) / rect.width) * 100;
                                 (e.currentTarget.parentElement as HTMLElement).style.setProperty('--mouse-x', `${x}%`);
                             }}>
                            <path d={vPaths.linePath} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" filter="url(#glow)" className="transition-all duration-1000" />
                        </svg>

                        {/* Corner Decorations */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-500/20" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-500/20" />

                        <div className="absolute bottom-2 left-4 right-4 flex justify-between opacity-40">
                             {xLabels.map(t => <span key={t} className="text-[7px] font-mono font-black text-emerald-500">{t}</span>)}
                        </div>
                    </div>
                </div>

                {/* Current EKG */}
                <div className="flex flex-col gap-4 relative">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest italic font-mono flex items-center gap-2">
                                <span className="opacity-40">[0xA2]</span> A-FLOW ANALYSIS
                            </span>
                        </div>
                        <div className="text-[8px] font-mono text-cyan-500/40 uppercase tracking-widest animate-pulse">Telemetry Live</div>
                    </div>
                    <div className="h-[220px] w-full relative bg-black/60 rounded-xl border border-cyan-900/30 overflow-hidden group/chart cursor-crosshair transition-all hover:border-cyan-500/40 hover:bg-black/80">
                        <div className="absolute inset-0 opacity-20" 
                             style={{ backgroundImage: 'linear-gradient(#0891b2 1px, transparent 1px), linear-gradient(90deg, #0891b2 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                        
                         {/* THE SCAN LINE */}
                         <div className="absolute top-0 bottom-0 w-1 bg-cyan-500/50 shadow-[0_0_15px_#06b6d4] z-20 animate-scan pointer-events-none" />

                         {/* MOUSE CROSSHAIR */}
                        <div className="absolute top-0 bottom-0 w-px bg-white/20 z-30 opacity-0 group-hover/chart:opacity-100 pointer-events-none" 
                             style={{ left: 'var(--mouse-x, 0%)' }} />

                        <svg className="w-full h-full relative z-10 p-4" viewBox="0 0 800 180" preserveAspectRatio="none"
                             onMouseMove={(e) => {
                                 const rect = e.currentTarget.getBoundingClientRect();
                                 const x = ((e.clientX - rect.left) / rect.width) * 100;
                                 (e.currentTarget.parentElement as HTMLElement).style.setProperty('--mouse-x', `${x}%`);
                             }}>
                            <path d={iPaths.linePath} fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" filter="url(#glow)" className="transition-all duration-1000" />
                        </svg>

                        <div className="absolute bottom-2 left-4 right-4 flex justify-between opacity-40">
                             {xLabels.map(t => <span key={t} className="text-[7px] font-mono font-black text-cyan-500">{t}</span>)}
                        </div>
                    </div>
                </div>
            </div>

                {/* ELECTRICAL OPERATIONAL EXTREMES - GRID 2 COLS */}
                <div className="w-[480px] border-l border-white/5 bg-black/40 p-8 flex flex-col gap-6 shrink-0 relative z-20 overflow-hidden">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] italic font-mono">Operational Data Matrix</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* VOLTAGE RANGE */}
                        <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 relative group">
                             <div className="absolute top-2 right-2 text-[6px] font-mono text-emerald-500/20">REG_V_EXT</div>
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Voltage Profile (V)</span>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                <div>
                                    <span className="text-[6px] font-black text-rose-500 uppercase block">Min Drop</span>
                                    <div className="text-lg font-black text-white italic">{hasData ? minV.toFixed(2) : '--'}V</div>
                                </div>
                                <div>
                                    <span className="text-[6px] font-black text-sky-500 uppercase block">Max Peak</span>
                                    <div className="text-lg font-black text-white italic">{hasData ? maxV.toFixed(2) : '--'}V</div>
                                </div>
                            </div>
                        </div>

                        {/* CURRENT PEAK */}
                        <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 relative">
                             <div className="absolute top-2 right-2 text-[6px] font-mono text-cyan-500/20">REG_I_CUR</div>
                             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Current (A)</span>
                             <div className="mt-1">
                                <div className="text-2xl font-black text-white italic tracking-tighter">
                                    {hasData ? maxA.toFixed(2) : '--'}<span className="text-xs ml-1 text-rose-500">A</span>
                                </div>
                                <span className="text-[6px] font-black text-slate-500 uppercase">PEAK RECORDED</span>
                             </div>
                        </div>

                        {/* AVG LOAD */}
                        <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Load Average</span>
                             <div className="mt-1">
                                <div className="text-2xl font-black text-white italic tracking-tighter">
                                    {hasData ? avgA.toFixed(2) : '--'}<span className="text-xs ml-1 text-sky-500">A</span>
                                </div>
                                <span className="text-[6px] font-black text-slate-500 uppercase">PERIOD STABILITY</span>
                             </div>
                        </div>

                        {/* POWER DEMAND */}
                        <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Power Demand</span>
                            <div className="mt-1">
                                <div className="text-2xl font-black text-white italic tracking-tighter">
                                    {hasData ? maxKW.toFixed(2) : '--'}<span className="text-xs ml-1 text-emerald-500">kW</span>
                                </div>
                                <span className="text-[6px] font-black text-slate-500 uppercase">MAX CONSUMPTION</span>
                            </div>
                        </div>

                        {/* ENERGY TOTAL - SPAN 2 */}
                        <div className="col-span-2 flex flex-col gap-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 relative overflow-hidden group">
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Zap className="w-24 h-24 text-emerald-500" />
                            </div>
                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Total Energy Accumulated (kWh)</span>
                            <div className="flex items-baseline gap-4 mt-1">
                                <div className="text-4xl font-black text-white italic tracking-tighter">
                                    {hasData ? totalKWh.toFixed(1) : '--'}
                                </div>
                                <span className="text-sm font-black text-emerald-500 uppercase tracking-widest">kilowatts-hour</span>
                            </div>
                        </div>
                    </div>

                    {/* Engineering Summary */}
                    <div className="mt-auto pt-6 border-t border-white/5">
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 relative">
                             <div className="absolute top-0 right-0 p-2 opacity-20">
                                 <Activity className="w-4 h-4 text-emerald-500" />
                             </div>
                            <div className="flex items-center gap-2 mb-2 text-slate-500">
                                <span className="text-[8px] font-black uppercase tracking-widest font-mono">Status Analysis</span>
                                <div className="h-px flex-1 bg-white/5" />
                            </div>
                            <p className="text-[10px] text-slate-300 leading-relaxed font-bold italic font-mono">
                                {hasData ? (
                                    `SYSTEM_DIAGNOSTIC: Voltage variance at ${vFluctuation.toFixed(2)}%. Critical demand is ${maxA < 320 ? 'OPTIMAL' : 'CRITICAL'}.`
                                ) : 'WAITING_FOR_DATA_PACKETS...'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-white/5 bg-black/40 flex justify-between items-center opacity-60 relative z-10 shrink-0">
                <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className="text-[9px] font-mono font-medium text-slate-400 uppercase tracking-widest">Update Rate: 1s • Last Sync: Now</span>
                    </div>
                </div>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em] italic">Data Precision Phase: High • System Status: Stable</span>
            </div>
        </div>
    );
};

const ChartStat = ({ label, value, color = "text-white" }: { label: string, value: string, color?: string }) => (
    <div className="flex items-baseline gap-2 bg-white/5 px-3 py-1 rounded-lg border border-white/5">
        <span className="text-[8px] font-black text-slate-500 tracking-widest">{label}</span>
        <span className={`text-[10px] font-mono font-bold ${color}`}>{value}</span>
    </div>
);

export default EnergyHistoryView;
