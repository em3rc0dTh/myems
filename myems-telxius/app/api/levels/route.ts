import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/levels?structureId=xxx
export async function GET(req: NextRequest) {
  const structureId = req.nextUrl.searchParams.get("structureId");
  try {
    const levels = await prisma.level.findMany({
      where: structureId ? { structureId } : undefined,
      include: { _count: { select: { rooms: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ ok: true, data: levels });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/levels
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, structureId } = body;
  if (!name || !structureId)
    return NextResponse.json({ ok: false, error: "name y structureId son requeridos" }, { status: 400 });
  try {
    const level = await prisma.level.create({ data: { name, structureId } });
    return NextResponse.json({ ok: true, data: level }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
