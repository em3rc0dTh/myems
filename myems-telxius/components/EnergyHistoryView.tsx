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

    const voltageData = useMemo(() => history.map(d => d.voltage), [history]);
    const currentData = useMemo(() => history.map(d => d.current), [history]);

    const vPaths = generatePath(voltageData, 180, 800);
    const iPaths = generatePath(currentData, 180, 800);

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

            {/* Main Content Area */}
            <div className="flex-1 relative flex flex-col min-h-0">
                {loading && (
                    <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                        <Activity className="w-8 h-8 text-sky-500 animate-spin mb-4" />
                        <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] animate-pulse">Sincronizando con InfluxDB...</p>
                    </div>
                )}

                <div className="flex-1 p-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar relative z-10">
                    {/* Voltage Chart */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-accent-primary" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Evolución Voltaje (V)</span>
                            </div>
                            <div className="flex gap-4">
                                <ChartStat label="AVG" value="48.25V" />
                                <ChartStat label="MAX" value="48.55V" color="text-accent-primary" />
                            </div>
                        </div>
                        <div className="h-[200px] w-full relative bg-black/40 rounded-2xl border border-white/5 p-4 overflow-hidden group">
                            <svg className="w-full h-full" viewBox="0 0 800 180" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path d={vPaths.areaPath} fill="url(#vGrad)" className="transition-all duration-1000" />
                                <path d={vPaths.linePath} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" className="transition-all duration-1000" />
                            </svg>
                        </div>
                    </div>

                    {/* Current Chart */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-danger" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Consumo Corriente (A)</span>
                            </div>
                            <div className="flex gap-4">
                                <ChartStat label="AVG" value="295.4A" />
                                <ChartStat label="MAX" value="312.8A" color="text-danger" />
                            </div>
                        </div>
                        <div className="h-[200px] w-full relative bg-black/40 rounded-2xl border border-white/5 p-4 overflow-hidden group">
                            <svg className="w-full h-full" viewBox="0 0 800 180" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="iGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
                                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path d={iPaths.areaPath} fill="url(#iGrad)" className="transition-all duration-1000" />
                                <path d={iPaths.linePath} fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" className="transition-all duration-1000" />
                            </svg>
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
