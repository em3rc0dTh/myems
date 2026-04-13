import { NextRequest } from "next/server";
import mqtt from "mqtt";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    let isClosed = false;
    const push = (data: string) => {
        if (isClosed) return;
        try {
            writer.write(encoder.encode(`data: ${data}\n\n`)).catch(() => {
                isClosed = true;
            });
        } catch (e) {
            isClosed = true;
        }
    };

    // Usamos las credenciales especificadas por el usuario, respaldadas por el .env global
    const brokerUrl = 'mqtt://165.1.124.248:1883';
    const brokerUser = process.env.MQTT_USER || 'th-testing-2w';
    const brokerPass = process.env.MQTT_PASS || 'Aa12345678@@';

    const client = mqtt.connect(brokerUrl, {
        username: brokerUser,
        password: brokerPass,
        clientId: 'telemetry_bridge_' + Math.random().toString(16).substring(2, 8),
        keepalive: 60,
        reconnectPeriod: 2000
    });

    client.on('connect', () => {
        client.subscribe('data/dev/#'); 
        client.subscribe('#'); 
        push(JSON.stringify({ type: 'system', topic: 'system', msg: '{"status": "connected"}' }));
    });

    client.on('message', (topic, message) => {
        if (!isClosed) push(JSON.stringify({ type: 'message', topic, msg: message.toString() }));
    });

    client.on('error', (err) => {
        if (!isClosed) push(JSON.stringify({ type: 'system', topic: 'system', msg: `{"status": "error", "error": "${err.message}"}` }));
    });

    req.signal.addEventListener('abort', () => {
        isClosed = true;
        client.end();
        writer.close().catch(() => {});
    });

    return new Response(responseStream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        },
    });
}
