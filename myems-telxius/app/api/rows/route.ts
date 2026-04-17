import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /telxius/api/rows?substructureId=xxx
export async function GET(req: NextRequest) {
  const substructureId = req.nextUrl.searchParams.get("substructureId");
  try {
    const rows = await prisma.row.findMany({
      where: substructureId ? { substructureId } : undefined,
    });
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    console.error("Error fetching rows:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST /telxius/api/rows
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, substructureId, spatialMetadata } = body;

    // Log the incoming request for debugging
    console.log("POST /api/rows payload:", { name, substructureId });

    if (!name || !substructureId) {
      return NextResponse.json({ ok: false, error: "name y substructureId son requeridos" }, { status: 400 });
    }

    const row = await prisma.row.create({
      data: {
        name,
        substructureId,
        spatialMetadata
      }
    });

    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch (e) {
    console.error("CRITICAL: Error creating row (bay):", e);
    return NextResponse.json({ 
      ok: false, 
      error: String(e),
      message: "Check server logs for detailed Prisma error" 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id requerido" }, { status: 400 });
  try {
    const row = await prisma.row.findUnique({
      where: { id },
      include: {
        _count: {
          select: { containers: true }
        }
      }
    });

    if (!row) return NextResponse.json({ ok: false, error: "Bahía no encontrada" }, { status: 404 });

    if (row._count.containers > 0) {
      return NextResponse.json({ 
        ok: false, 
        error: `No se puede eliminar: La bahía tiene ${row._count.containers} racks instalados.` 
      }, { status: 400 });
    }

    await prisma.row.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
