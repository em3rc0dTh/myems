'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import mqtt from 'mqtt';

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
    const [latestData, setLatestData] = useState<Record<string, Record<string, unknown>>>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('telxius_latest_data');
                return saved ? JSON.parse(saved) : {};
            } catch { return {}; }
        }
        return {};
    });

    const [rawLogs, setRawLogs] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('telxius_raw_logs');
                return saved ? JSON.parse(saved) : [];
            } catch { return []; }
        }
        return [];
    });

    const [isConnected, setIsConnected] = useState(false);

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
        let client: mqtt.MqttClient | null = null;

        async function initMqtt() {
            try {
                // Obtenemos los candados de seguridad
                const configRes = await fetch('/telxius/api/config/mqtt/');
                const config = await configRes.json();
                
                const url = config.url || (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/mqtt/';
                client = mqtt.connect(url, {
                    username: config.username,
                    password: config.password,
                    clientId: 'telxius_global_' + Math.random().toString(16).substring(2, 6),
                    clean: true,
                    reconnectPeriod: 2000,
                });

                client.on('connect', () => {
                    setIsConnected(true);
                    client?.subscribe('data/dev/#');
                    console.log('--- MQTT Persistent Tunnel Established ---');
                });

                client.on('message', (topic, msg) => {
                    try {
                        const data = JSON.parse(msg.toString());
                        if (data.sn) {
                            setLatestData(prev => ({ ...prev, [data.sn]: data }));
                            setRawLogs(prev => [`[${topic}] ${msg.toString()}`, ...prev].slice(0, 25));
                        }
                    } catch { /* silent parse err */ }
                });

                client.on('close', () => setIsConnected(false));
            } catch (err) {
                console.error("MQTT Context Lock Error", err);
            }
        }

        initMqtt();
        return () => { if (client) client.end(); };
    }, []);

    return (
        <MqttContext.Provider value={{ latestData, rawLogs, setRawLogs, isConnected }}>
            {children}
        </MqttContext.Provider>
    );
};
