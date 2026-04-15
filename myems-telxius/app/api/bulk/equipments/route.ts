import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json(); // Array of equipments CSV
        const createdCount = [];

        for (const item of body) {
            // Buscamos a quien pertenece (Device / Ej. ROUTER-CORE o BDFB)
            let device = null;
            if (item.deviceName) {
                device = await prisma.device.findFirst({ where: { name: item.deviceName } });
            }

            let existing = await prisma.equipment.findFirst({ 
                where: { 
                    name: item.name, 
                    ...(device ? { deviceId: device.id } : {})
                }
            });

            if (!existing && device) {
                existing = await prisma.equipment.create({
                    data: {
                        name: item.name,
                        sn: item.sn || null, // AQUI ESTÁ EL SERIAL NUMBER
                        category: item.category || "SUBRACK",
                        deviceId: device.id,
                        unitPosition: item.unitPosition ? parseInt(item.unitPosition) : null,
                        unitHeight: item.unitHeight ? parseInt(item.unitHeight) : null,
                        slotLabel: item.slotLabel || null
                    }
                });
            }
            if (existing) createdCount.push(existing.id);
        }
        return NextResponse.json({ success: true, count: createdCount.length });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
