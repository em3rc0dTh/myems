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

    // Recursive function to find all equipment that acts as a "Panel" (has ports/breakers)
    const findPanels = (equips: any[]): any[] => {
      let panels: any[] = [];
      equips.forEach(eq => {
        if (eq.ports && eq.ports.length > 0) {
          panels.push({
            id: eq.id,
            name: eq.name,
            installedCapacity: eq.unitHeight ? eq.unitHeight * 100 : 800, // Logic heuristic
            consumedCapacity: 0,
            reservedCapacity: 0,
            breakers: eq.ports.map((p: any) => ({
              id: p.id,
              position: parseInt(p.name.replace(/[^0-9]/g, '')) || 0,
              label: p.sensorTopic ? `Topic: ${p.sensorTopic}` : 'Disponible',
              status: p.sensorTopic ? 'occupied' : 'empty'
            })).sort((a: any, b: any) => a.position - b.position)
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
      sn: device.id, 
      name: device.name,
      location: locationName,
      substructureId: substructureId,
      telemetry: {
          voltage: 48.2,
          current: 0,
          power: 0,
          energy: 0
      },
      panels: allPanels
    };

    return NextResponse.json(bdfbData);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch device details';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
