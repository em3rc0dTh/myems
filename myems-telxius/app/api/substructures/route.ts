import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /telxius/api/substructures?structureId=xxx
export async function GET(req: NextRequest) {
  const structureId = req.nextUrl.searchParams.get("structureId");
  const id = req.nextUrl.searchParams.get("id");

  try {
    if (id) {
      const room = await prisma.substructure.findUnique({
        where: { id },
        include: { 
          level: {
            include: { structure: true }
          },
          racks: true,
          rows: true
        }
      });
      return NextResponse.json({ ok: true, data: room });
    }

    // Find all levels of the structure and then their rooms
    if (structureId) {
      const levels = await prisma.level.findMany({
        where: { structureId },
        include: { rooms: true }
      });
      const rooms = levels.flatMap(l => l.rooms);
      return NextResponse.json({ ok: true, data: rooms });
    }

    const all = await prisma.substructure.findMany();
    return NextResponse.json({ ok: true, data: all });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST /telxius/api/substructures
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("API SUBSTRUCTURES: Incoming POST body:", body);

    const { name, levelId, perimeter, type, width, length, area } = body;

    if (!name || !levelId) {
      return NextResponse.json({ ok: false, error: "name y levelId son requeridos" }, { status: 400 });
    }

    const room = await prisma.substructure.create({
      data: {
        name,
        levelId,
        perimeter,
        type: type || "ROOM",
        width: width || 0,
        length: length || 0,
        area: area || 0,
        measurementUnit: "METRIC"
      }
    });

    console.log("API SUBSTRUCTURES: Created successfully ID:", room.id);
    return NextResponse.json({ ok: true, data: room }, { status: 201 });
  } catch (e: any) {
    console.error("API SUBSTRUCTURES ERROR:", e);
    return NextResponse.json({ ok: false, error: "Error interno", details: e.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
