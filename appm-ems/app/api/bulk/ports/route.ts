import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json(); // Array of ports CSV
        const createdCount = [];

        for (const item of body) {
            // Ubicamos al Equipment físico (Breaker o Tarjeta) al que se conecta
            const eq = await prisma.equipment.findFirst({ where: { name: item.equipmentName } });
            if (!eq) continue;

            let existing = await prisma.port.findFirst({ where: { name: item.name, equipmentId: eq.id } });
            if (!existing) {
                existing = await prisma.port.create({
                    data: {
                        name: item.name,
                        equipmentId: eq.id,
                        deviceId: eq.deviceId, // Heredar Lógica del Device principal
                        type: item.type || "POWER_DIST",
                        sensorKey: item.sensorKey || item.sensorTopic || null
                    }
                });
            } else if ((item.sensorKey || item.sensorTopic) && existing.sensorKey !== (item.sensorKey || item.sensorTopic)) {
                existing = await prisma.port.update({
                    where: { id: existing.id },
                    data: { sensorKey: item.sensorKey || item.sensorTopic }
                });
            }
            
            createdCount.push(existing.id);
        }
        return NextResponse.json({ success: true, count: createdCount.length });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
