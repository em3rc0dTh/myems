import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/structures?siteId=xxx
export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get("siteId");
  try {
    const structures = await prisma.structure.findMany({
      where: siteId ? { siteId } : undefined,
      include: { _count: { select: { levels: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ ok: true, data: structures });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/structures
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, siteId } = body;
  if (!name || !siteId)
    return NextResponse.json({ ok: false, error: "name y siteId son requeridos" }, { status: 400 });
  try {
    const structure = await prisma.structure.create({ data: { name, siteId } });
    return NextResponse.json({ ok: true, data: structure }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
