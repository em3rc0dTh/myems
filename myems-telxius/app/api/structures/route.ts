import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/client";

const prisma = new PrismaClient();

// GET /telxius/api/structures?siteId=xxx
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const siteId = req.nextUrl.searchParams.get("siteId");
  
  try {
    if (id) {
      const structure = await prisma.structure.findUnique({
        where: { id },
        include: { 
          levels: {
            include: { rooms: true }
          }
        }
      });
      return NextResponse.json({ ok: true, data: structure });
    }

    const structures = await prisma.structure.findMany({
      where: siteId ? { siteId } : undefined,
      include: { 
        levels: {
          include: { rooms: true }
        }
      }
    });
    return NextResponse.json({ ok: true, data: structures });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST /telxius/api/structures
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("API STRUCTURES: Incoming POST body:", body);
    
    const { name, siteId, perimeter, spatialMetadata } = body;

    if (!name || !siteId) {
      return NextResponse.json({ ok: false, error: "name y siteId son requeridos" }, { status: 400 });
    }

    // Explicit creation to avoid mapping errors
    const structure = await prisma.structure.create({
      data: {
        name,
        siteId,
        perimeter,
        spatialMetadata
      }
    });

    console.log("API STRUCTURES: Created successfully ID:", structure.id);
    return NextResponse.json({ ok: true, data: structure }, { status: 201 });
  } catch (e: any) {
    console.error("API STRUCTURES ERROR:", e);
    return NextResponse.json({ 
      ok: false, 
      error: "Error interno del servidor", 
      details: e.message || String(e) 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
