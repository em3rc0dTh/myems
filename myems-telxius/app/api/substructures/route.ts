import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/substructures?levelId=xxx
export async function GET(req: NextRequest) {
  const levelId = req.nextUrl.searchParams.get("levelId");
  try {
    const rooms = await prisma.substructure.findMany({
      where: levelId ? { levelId } : undefined,
      include: { _count: { select: { racks: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ ok: true, data: rooms });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/substructures
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, levelId, type = "ROOM", gridRows = [], gridCols = [] } = body;
  if (!name || !levelId)
    return NextResponse.json({ ok: false, error: "name y levelId son requeridos" }, { status: 400 });
  try {
    const room = await prisma.substructure.create({
      data: { name, levelId, type, gridRows, gridCols },
    });
    return NextResponse.json({ ok: true, data: room }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
