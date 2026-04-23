import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /appm-ems/api/levels?structureId=xxx
export async function GET(req: NextRequest) {
  const structureId = req.nextUrl.searchParams.get("structureId");
  
  try {
    const levels = await prisma.level.findMany({
      where: structureId ? { structureId } : undefined,
      include: { rooms: true }
    });
    return NextResponse.json({ ok: true, data: levels });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

// POST /appm-ems/api/levels
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, structureId } = body;

    if (!name || !structureId) {
      return NextResponse.json({ ok: false, error: "name y structureId son requeridos" }, { status: 400 });
    }

    const level = await prisma.level.create({
      data: {
        name,
        structureId
      }
    });

    return NextResponse.json({ ok: true, data: level }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "Error interno", details: e.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id requerido" }, { status: 400 });
  try {
    const level = await prisma.level.findUnique({
      where: { id },
      include: {
        _count: {
          select: { rooms: true }
        }
      }
    });

    if (!level) return NextResponse.json({ ok: false, error: "Nivel no encontrado" }, { status: 404 });

    if (level._count.rooms > 0) {
      return NextResponse.json({ 
        ok: false, 
        error: `No se puede eliminar: El nivel tiene ${level._count.rooms} salas mapeadas.` 
      }, { status: 400 });
    }

    await prisma.level.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
