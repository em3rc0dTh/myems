import { NextResponse } from 'next/server';

export async function GET() {
    // Estas variables ahora son SEGURAS porque solo existen en el servidor.
    // Aunque se devuelven al cliente para la conexión MQTT, no están hardcodeadas
    // en el bundle de JavaScript, lo que permite rotarlas sin recompilar.
    return NextResponse.json({
        url: process.env.MQTT_URL || 'ws://localhost:1884/mqtt',
        username: process.env.MQTT_USER || '',
        password: process.env.MQTT_PASS || '',
    });
}
