import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
            try {
                const location = d.positions?.[0]?.substructure?.name || 'Sala Desconocida';
                
                // Filtrar paneles soportando tanto el nuevo estándar como el anterior
                const panels = d.equipments
                    .filter(eq => {
                        const cat = eq.category as any;
                        return cat === 'SUBSHELF' || 
                               cat === 'SUBRACK' || 
                               cat === 'CIRCUIT_BREAKER_PANEL' || 
                               (eq.ports && eq.ports.length > 0);
                    })
                    .map(eq => ({
                        id: eq.id,
                        name: eq.name,
                        isPinned: (eq as any).isPinned || false, 
                        installedCapacity: 800, 
                        assignedCapacity: 0,
                        consumedCapacity: 0,
                        reservedCapacity: 0,
                        breakers: (eq.ports || []).map(p => {
                            const pos = p.sensorKey ? parseInt(p.sensorKey.split('_').pop() || '0') : (parseInt(p.name.replace(/[^0-9]/g, '')) || 0);
                            return {
                                id: p.id,
                                position: pos,
                                status: p.sensorKey ? 'occupied' : 'empty',
                                label: p.sensorKey || 'P-' + pos,
                                online: true
                            };
                        }).sort((a,b) => a.position - b.position)
                    }));

                return {
                    id: d.id,
                    sn: d.sn || d.id,
                    name: d.name,
                    isPinned: (d as any).isPinned || false,
                    location,
                    panels
                };
            } catch (err) {
                console.error(`Error mapping device ${d.id}:`, err);
                return null;
            }
        }).filter(Boolean);

        return NextResponse.json(activeBDFBs);
    } catch (e: any) {
        console.error("Dashboard API Critical Error:", e);
        return NextResponse.json({ 
            error: e.message,
            stack: process.env.NODE_ENV === 'development' ? e.stack : undefined 
        }, { status: 500 });
    }
}
