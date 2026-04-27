import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
          include: { 
            substructure: { include: { rows: true } },
            parentContainer: true
          }
        },
        positions: {
          include: { substructure: { include: { rows: true } } }
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

    const roomName = (device as any).positions?.[0]?.substructure?.name 
      || (device as any).container?.substructure?.name 
      || 'Sala Desconocida';

    const subId = (device as any).positions?.[0]?.substructureId || (device as any).container?.substructureId;
    
    let roomRows: any[] = (device as any).positions?.[0]?.substructure?.rows || (device as any).container?.substructure?.rows || [];
    let roomRacks: any[] = (device as any).positions?.[0]?.substructure?.racks || (device as any).container?.substructure?.racks || [];

    // Fallback: Si no vinieron en el include, los buscamos por subId
    if (subId && (roomRows.length === 0 || roomRacks.length === 0)) {
      const roomData = await prisma.substructure.findUnique({
        where: { id: subId },
        include: {
          rows: true,
          racks: {
            include: {
              devices: {
                include: {
                  equipments: {
                    include: {
                      ports: true,
                      children: { include: { ports: true } }
                    }
                  }
                }
              }
            }
          }
        }
      });
      if (roomData) {
        if (roomRows.length === 0) roomRows = roomData.rows;
        if (roomRacks.length === 0) roomRacks = roomData.racks;
      }
    }

    const bdfbData = {
      id: device.id,
      sn: device.sn || device.id, 
      name: device.name,
      location: (device as any).site?.name || 'Site Desconocido',
      roomName: roomName,
      substructureId: subId,
      bays: roomRows.map((r: any) => {
        const rowId = r.id.toString();

        // Parse bay bounding box from spatialMetadata
        let bayBounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null;
        if (r.spatialMetadata) {
          try {
            const sm = typeof r.spatialMetadata === 'string' ? JSON.parse(r.spatialMetadata) : r.spatialMetadata;
            const pts: {x:number,y:number}[] = sm.points || [];
            if (pts.length > 0) {
              bayBounds = {
                minX: Math.min(...pts.map(p => p.x)),
                maxX: Math.max(...pts.map(p => p.x)),
                minY: Math.min(...pts.map(p => p.y)),
                maxY: Math.max(...pts.map(p => p.y)),
              };
            }
          } catch(_) {}
        }

        const containers = roomRacks.filter(c => {
          // 1. Strict rowId link
          if (c.rowId?.toString() === rowId) return true;
          // 2. Spatial containment: rack center inside bay bounds
          if (bayBounds && c.spatialMetadata) {
            try {
              const sm = typeof c.spatialMetadata === 'string' ? JSON.parse(c.spatialMetadata) : c.spatialMetadata;
              const cx = sm.x + (sm.w || 0) / 2;
              const cy = sm.y + (sm.h || 0) / 2;
              return cx >= bayBounds.minX && cx <= bayBounds.maxX && cy >= bayBounds.minY && cy <= bayBounds.maxY;
            } catch(_) {}
          }
          return false;
        });

        return {
          id: rowId,
          name: r.name,
          equipment: containers.map(c => ({
            id: c.id,
            name: c.name,
            category: 'SHELF',
            children: c.devices.flatMap((dev: any) => {
              if (dev.id === id) return allPanels;
              return [{
                id: dev.id,
                name: dev.name,
                category: 'CIRCUIT_PACK',
                children: dev.equipments.map((eq: any) => ({
                  id: eq.id,
                  name: eq.name,
                  category: eq.category,
                  children: eq.children
                }))
              }];
            })
          }))
        };
      }) || [],
      telemetry: {
          voltage: 48.2,
          current: 0,
          power: 0,
          energy: 0
      },
      panels: allPanels,
      equipments: device.equipments,
      connections: device.equipments.flatMap(eq => 
        eq.ports.filter((p: any) => p.clientName).map((p: any) => ({
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
