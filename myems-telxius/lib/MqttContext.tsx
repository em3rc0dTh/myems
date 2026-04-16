'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface MqttContextType {
    latestData: Record<string, Record<string, unknown>>;
    rawLogs: string[];
    setRawLogs: React.Dispatch<React.SetStateAction<string[]>>;
    isConnected: boolean;
}

const MqttContext = createContext<MqttContextType>({
    latestData: {},
    rawLogs: [],
    setRawLogs: () => {},
    isConnected: false,
});

export const useMqtt = () => useContext(MqttContext);

export const MqttProvider = ({ children }: { children: React.ReactNode }) => {
    const [latestData, setLatestData] = useState<Record<string, Record<string, unknown>>>({});
    const [rawLogs, setRawLogs] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    // Initial Load from LocalStorage
    useEffect(() => {
        try {
            const savedData = localStorage.getItem('telxius_latest_data');
            if (savedData) setLatestData(JSON.parse(savedData));
            
            const savedLogs = localStorage.getItem('telxius_raw_logs');
            if (savedLogs) setRawLogs(JSON.parse(savedLogs));
        } catch (e) {
            console.warn("Failed to load from localStorage", e);
        }
    }, []);

    // Backup to LocalStorage whenever data changes
    useEffect(() => {
        if (Object.keys(latestData).length > 0) {
            localStorage.setItem('telxius_latest_data', JSON.stringify(latestData));
        }
        if (rawLogs.length > 0) {
            localStorage.setItem('telxius_raw_logs', JSON.stringify(rawLogs));
        }
    }, [latestData, rawLogs]);

    useEffect(() => {
        let evtSource: EventSource | null = null;

        async function initMqtt() {
            try {
                // Iniciar la conexión usando Server-Sent Events (SSE) hacia nuestro túnel API en Next.js
                // Esto bypassa las bloqueos del navegador hacia servidores MQTT TCP puros (puerto 1883)
                evtSource = new EventSource('/telxius/api/telemetry/stream/');
                
                evtSource.onopen = () => {
                    setIsConnected(true);
                    console.log('--- SSE Telemetry Tunnel Established ---');
                };

                evtSource.onmessage = (e) => {
                    try {
                        const parsed = JSON.parse(e.data);
                        if (parsed.type === 'message') {
                            const data = JSON.parse(parsed.msg);
                            if (data.sn) {
                                setLatestData(prev => {
                                    const existing = prev[data.sn] || {};
                                    const existingReported = (existing.reported as Record<string, unknown>) || {};
                                    const newReported = (data.reported as Record<string, unknown>) || {};
                                    
                                    return {
                                        ...prev,
                                        [data.sn]: {
                                            ...existing,
                                            ...data,
                                            reported: {
                                                ...existingReported,
                                                ...newReported
                                            }
                                        }
                                    };
                                });
                                setRawLogs(prev => [`[${parsed.topic}] ${parsed.msg}`, ...prev].slice(0, 25));
                            }
                        } else if (parsed.type === 'system') {
                            const data = JSON.parse(parsed.msg);
                            if (data.status === 'connected') {
                                setIsConnected(true);
                            } else if (data.status === 'error') {
                                console.error("SSE Tunnel MQTT Error:", data.error);
                            }
                        }
                    } catch { /* silent parse err */ }
                };

                evtSource.onerror = () => {
                    setIsConnected(false);
                    evtSource?.close();
                    
                    // Simple reconexión exponencial o timeout fijo
                    setTimeout(initMqtt, 5000); 
                };

            } catch (err) {
                console.error("MQTT Context Lock Error", err);
            }
        }

        initMqtt();
        return () => { if (evtSource) evtSource.close(); };
    }, []);

    return (
        <MqttContext.Provider value={{ latestData, rawLogs, setRawLogs, isConnected }}>
            {children}
        </MqttContext.Provider>
    );
};
