import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const devices = await prisma.device.findMany({
            where: { category: "BDFB" },
            include: {
                equipments: {
                    include: { ports: true }
                },
                positions: {
                    include: { substructure: true }
                }
            }
        });

        const activeBDFBs = devices.map(d => {
            return {
                id: d.id,
                sn: d.sn || d.id,
                name: d.name,
                isPinned: (d as any).isPinned || false,
                location: d.positions[0]?.substructure?.name || 'Sala Desconocida',
                panels: d.equipments.map(eq => ({
                    id: eq.id,
                    name: eq.name,
                    isPinned: (eq as any).isPinned || false, 
                    installedCapacity: 800, 
                    assignedCapacity: 0,
                    consumedCapacity: 0,
                    reservedCapacity: 0,
                    breakers: eq.ports.map(p => ({
                        id: p.id,
                        position: parseInt(p.name.replace(/[^0-9]/g, '')) || 0,
                        status: p.sensorTopic ? 'occupied' : 'empty',
                        label: p.sensorTopic,
                        online: true
                    })).sort((a,b) => a.position - b.position)
                }))
            };
        });

        return NextResponse.json(activeBDFBs);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
