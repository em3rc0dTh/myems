import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/containers?substructureId=xxx
export async function GET(req: NextRequest) {
  const substructureId = req.nextUrl.searchParams.get("substructureId");
  try {
    const containers = await prisma.container.findMany({
      where: substructureId ? { substructureId } : undefined,
      orderBy: [{ row: "asc" }, { position: "asc" }],
    });
    return NextResponse.json({ ok: true, data: containers });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/containers
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { 
    name, 
    substructureId, 
    row = "A", 
    position = 0, 
    type = "RACK", 
    width, 
    depth, 
    spatialMetadata,
    parentContainerId 
  } = body;

  if (!name || !substructureId)
    return NextResponse.json(
      { ok: false, error: "name y substructureId son requeridos" },
      { status: 400 }
    );

  try {
    const container = await prisma.container.create({
      data: { 
        name, 
        substructureId, 
        row, 
        position: Number(position),
        type,
        width: width ? Number(width) : undefined,
        depth: depth ? Number(depth) : undefined,
        spatialMetadata,
        parentContainerId: parentContainerId || undefined
      },
    });
    return NextResponse.json({ ok: true, data: container }, { status: 201 });
  } catch (e) {
    console.error("Error creating container:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id requerido" }, { status: 400 });
  try {
    const container = await prisma.container.findUnique({
      where: { id },
      include: {
        _count: {
          select: { devices: true, childContainers: true }
        }
      }
    });

    if (!container) return NextResponse.json({ ok: false, error: "Contenedor no encontrado" }, { status: 404 });

    if (container._count.devices > 0 || container._count.childContainers > 0) {
      return NextResponse.json({ 
        ok: false, 
        error: `No se puede eliminar: El contenedor tiene ${container._count.devices} equipos y ${container._count.childContainers} sub-contenedores.` 
      }, { status: 400 });
    }

    await prisma.container.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
