"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMqtt } from '@/lib/MqttContext';

export default function DiagnosticTerminal() {
    const [isOpen, setIsOpen] = useState(false);
    const { rawLogs, setRawLogs } = useMqtt();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Capturamos Alt+D o Alt+Q globalmente
            if (e.altKey && (e.key.toLowerCase() === 'd' || e.key.toLowerCase() === 'q')) {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, []);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: 500, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 500, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-y-0 right-0 w-[450px] bg-black/95 backdrop-blur-3xl border-l border-white/10 z-[9999] p-8 shadow-[-50px_0_100px_rgba(0,0,0,0.8)] flex flex-col font-mono"
                >
                    {/* Header de la Terminal */}
                    <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4 shrink-0">
                        <div className="flex flex-col">
                            <span className="text-cyan-400 font-black text-xs uppercase tracking-[0.2em] animate-pulse">Diagnostic Terminal</span>
                            <span className="text-[8px] text-slate-500 uppercase tracking-widest mt-1">AppM Global Network Telemetry Analyzer v5.0</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Lista de Paquetes */}
                    <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                        {rawLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-20 text-center">
                                <div className="text-4xl mb-4">📡</div>
                                <p className="text-[10px] uppercase tracking-widest">Waiting for MQTT Link...</p>
                            </div>
                        ) : (
                            rawLogs.map((log, i) => (
                                <div key={i} className="p-4 bg-white/[0.03] border border-white/5 rounded-xl group hover:border-cyan-500/30 transition-all">
                                    <div className="flex justify-between mb-3">
                                        <span className="text-cyan-500/50 text-[8px] font-black tracking-widest uppercase">Packet_MTU_{rawLogs.length - i}</span>
                                        <span className="text-slate-700 text-[8px]">{new Date().toLocaleTimeString()}</span>
                                    </div>
                                    <div className="break-all text-slate-300 text-[9px] leading-relaxed font-mono opacity-80 group-hover:opacity-100 selection:bg-cyan-500/30">
                                        {log}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer con Controles */}
                    <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] text-slate-500 uppercase tracking-widest">Relay Active</span>
                        </div>
                        <button
                            onClick={() => setRawLogs([])}
                            className="text-[9px] font-black text-rose-500/60 hover:text-rose-400 uppercase tracking-widest transition-colors"
                        >
                            Wipe Buffer
                        </button>
                    </div>

                    {/* Scanline Effect específico de la terminal */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
