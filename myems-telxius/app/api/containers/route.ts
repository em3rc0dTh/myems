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
  const { name, substructureId, row, position } = body;
  if (!name || !substructureId || !row || position === undefined)
    return NextResponse.json(
      { ok: false, error: "name, substructureId, row y position son requeridos" },
      { status: 400 }
    );
  try {
    const container = await prisma.container.create({
      data: { name, substructureId, row, position: Number(position) },
    });
    return NextResponse.json({ ok: true, data: container }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
