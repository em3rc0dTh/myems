import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /telxius/api/levels?structureId=xxx
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

// POST /telxius/api/levels
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
