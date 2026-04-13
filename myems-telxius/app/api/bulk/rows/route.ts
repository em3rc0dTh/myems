import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// POST /telxius/api/bulk/rows
export async function POST(req: NextRequest) {
  try {
    const rows = await req.json();
    if (!Array.isArray(rows)) {
      return NextResponse.json({ ok: false, error: "Se esperaba una lista de bahías" }, { status: 400 });
    }

    const createdRows = [];
    for (const rowData of rows) {
      const { roomName, name, x, y, width, depth } = rowData;

      // Find the room by name
      const substructure = await prisma.substructure.findFirst({
        where: { name: roomName }
      });

      if (substructure) {
        const row = await prisma.row.create({
          data: {
            name,
            substructureId: substructure.id,
            spatialMetadata: JSON.stringify({ x, y, w: width, h: depth, metric: 'cm' })
          }
        });
        createdRows.push(row);
      }
    }

    return NextResponse.json({ ok: true, count: createdRows.length });
  } catch (e) {
    console.error("Bulk Rows Ingestion Error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
