import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const substructure = await prisma.substructure.findUnique({
      where: { id },
      include: {
        level: {
          include: {
            structure: {
              include: { site: true }
            }
          }
        },
        positions: {
          include: {
            device: {
              include: { equipments: true }
            }
          }
        },
        racks: true // Include Containers (Racks/Cabinets)
      }
    });

    if (!substructure) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Merge containers (racks) and explicit positions into the UI format
    // A container at Row B, Pos 12 should be treated as a position record.
    const positionsMap = new Map();

    // 1. Process explicit position records
    substructure.positions.forEach(p => {
      positionsMap.set(`${p.row}-${p.col}`, {
        id: p.id,
        label: p.label || p.device?.name || `${p.row}${p.col}`,
        row: p.row,
        col: p.col,
        status: p.status as 'EMPTY' | 'OCCUPIED' | 'RESERVED' | 'ERROR' | 'WARNING',
        type: p.device?.category === 'BDFB' ? 'bdfb' : 'rack',
        deviceId: p.deviceId,
        widthUnits: p.widthUnits,
        depthUnits: p.depthUnits,
        physWidthCm: p.physWidthCm,
        physDepthCm: p.physDepthCm,
        physOffsetX: p.physOffsetX,
        physOffsetY: p.physOffsetY,
      });
    });

    // 2. Process containers (racks) - if a rack exists at (row, pos) but no position record does, add it.
    substructure.racks.forEach(r => {
      const key = `${r.row}-${r.position}`;
      if (!positionsMap.has(key)) {
        positionsMap.set(key, {
            id: r.id,
            label: r.name,
            row: r.row,
            col: r.position,
            status: 'OCCUPIED',
            type: r.type === 'CABINET' ? 'bdfb' : 'rack',
            widthUnits: 1,
            depthUnits: 1
        });
      }
    });

    const formattedPositions = Array.from(positionsMap.values());

    const roomLength = substructure.length || 10;
    const calculatedColsCount = Math.floor((roomLength * 100) / 60);
    const dynamicGridCols = Array.from({ length: Math.max(calculatedColsCount, 12) }, (_, i) => i + 1);

    return NextResponse.json({
      substructure: {
        id: substructure.id,
        name: substructure.name,
        width: substructure.width || 10,
        length: roomLength,
        gridRows: substructure.gridRows || ["A", "B", "C", "D", "E"],
        gridCols: dynamicGridCols, // Use calculated columns to span the entire room
        perimeter: substructure.perimeter,
        referencePoints: substructure.referencePoints,
        siteName: substructure.level.structure.site.name,
        buildingName: substructure.level.structure.name
      },
      positions: formattedPositions
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch room topology';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
