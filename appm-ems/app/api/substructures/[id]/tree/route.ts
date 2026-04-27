import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('--- API: FETCHING TREE FOR ROOM ID:', id);

    const room = await prisma.substructure.findUnique({
      where: { id },
      include: {
        level: {
            include: {
                structure: {
                    include: { site: true }
                }
            }
        },
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

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const roomRows = room.rows || [];
    const allRacks = room.racks || [];

    const mapRacksToEquipment = (racks: any[]) => {
        return racks.map(c => ({
            id: c.id,
            name: c.name,
            category: 'SUBSHELF', // Mapped to 'FRAME' in UI
            // No SN on the Rack itself to avoid confusion
            children: (c as any).devices?.map((dev: any) => ({
                id: dev.id,
                name: dev.name,
                category: 'SHELF', // This will be the clickable device
                sn: dev.sn,
                children: dev.equipments.map((eq: any) => ({
                    id: dev.id, // IMPORTANTE: Mandamos el ID del DEVICE para que el clic funcione
                    name: eq.name,
                    category: eq.category,
                    children: eq.children
                }))
            })) || []
        }));
    };

    // Spatial containment logic to group Racks into Bays (Rows)
    const bays = roomRows.map(r => {
        const rowId = r.id.toString();
        
        // Parse bay bounding box
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

        const nestedContainers = allRacks.filter(c => {
            // 1. Strict rowId link
            if (c.rowId?.toString() === rowId) return true;
            // 2. Spatial containment
            if (bayBounds && c.spatialMetadata) {
                try {
                    const sm = typeof c.spatialMetadata === 'string' ? JSON.parse(c.spatialMetadata) : c.spatialMetadata;
                    const cx = (sm.x || 0) + (sm.w || 0) / 2;
                    const cy = (sm.y || 0) + (sm.h || 0) / 2;
                    return cx >= bayBounds.minX && cx <= bayBounds.maxX && cy >= bayBounds.minY && cy <= bayBounds.maxY;
                } catch(_) {}
            }
            return false;
        });

        return {
            id: rowId,
            name: r.name,
            equipment: mapRacksToEquipment(nestedContainers)
        };
    });

    // Also include racks that are NOT in any bay (spatial or id-based)
    const racksInBays = new Set(bays.flatMap(b => b.equipment.map(e => e.id)));
    const unassignedRacks = allRacks.filter(c => !racksInBays.has(c.id));

    if (unassignedRacks.length > 0) {
        bays.push({
            id: 'unassigned',
            name: 'Otros Activos (Sin Bahía)',
            equipment: mapRacksToEquipment(unassignedRacks)
        });
    }

    return NextResponse.json({
      ok: true,
      data: {
        siteName: room.level?.structure?.site?.name || "Site",
        roomName: room.name,
        bays: bays
      }
    });

  } catch (error: any) {
    console.error("Tree API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
