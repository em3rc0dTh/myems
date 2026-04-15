import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        site: true,
        equipments: {
          include: { 
             ports: true,
             children: { include: { ports: true } }
          }
        },
        container: {
          include: { substructure: true }
        },
        positions: {
          include: { substructure: true }
        }
      }
    });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    const findPanels = (equips: any[]): any[] => {
      let panels: any[] = [];
      equips.forEach(eq => {
        if (eq.ports && eq.ports.length > 0) {
          const prefix = eq.logicalPrefix || "0_1"; // Fallback si no está configurado
          panels.push({
            id: eq.id,
            name: eq.name,
            logicalPrefix: prefix,
            installedCapacity: 800, 
            consumedCapacity: 0,
            reservedCapacity: 0,
            breakers: eq.ports.map((p: any) => {
              const pos = parseInt(p.name.replace(/[^0-9]/g, '')) || 0;
              const sKey = p.sensorKey || `${prefix}_${pos}`;
              return {
                id: p.id,
                position: pos,
                label: sKey,
                status: 'occupied', // En un BDFB si hay puerto, hay breaker ocupando slot
                maxAmperage: p.maxAmperage || 63,
                cableGauge: p.cableGauge || 'N/A',
                sensorKey: sKey
              };
            }).sort((a: any, b: any) => a.position - b.position)
          });
        }
        if (eq.children && eq.children.length > 0) {
          panels = [...panels, ...findPanels(eq.children)];
        }
      });
      return panels;
    };

    const allPanels = findPanels(device.equipments);

    const locationName = (device as any).positions?.[0]?.substructure?.name 
      || (device as any).container?.substructure?.name 
      || 'Sala Desconocida';

    const substructureId = (device as any).positions?.[0]?.substructureId 
      || (device as any).container?.substructureId;

    const bdfbData = {
      id: device.id,
      sn: device.sn || device.id, 
      name: device.name,
      location: (device as any).positions?.[0]?.substructure?.name || 'Sala Desconocida',
      substructureId: (device as any).positions?.[0]?.substructureId || (device as any).container?.substructureId,
      telemetry: {
          voltage: 48.2,
          current: 0,
          power: 0,
          energy: 0
      },
      panels: allPanels,
      equipments: device.equipments,
      connections: device.equipments.flatMap(eq => 
        eq.ports.filter(p => p.clientName).map(p => ({
          id: p.id,
          port: p.name,
          panelName: eq.name,
          position: p.sensorKey ? (parseInt(p.sensorKey.split('_').pop() || '0')) : (parseInt(p.name.replace(/[^0-9]/g, '')) || 0),
          status: 'Activo',
          clientName: p.clientName,
          cableGauge: p.cableGauge,
          maxAmperage: p.maxAmperage
        }))
      )
    };

    return NextResponse.json(bdfbData);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch device details';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
