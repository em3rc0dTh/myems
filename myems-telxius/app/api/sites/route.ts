import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const districtId = req.nextUrl.searchParams.get("districtId");
  
  try {
    if (id) {
      const site = await prisma.site.findUnique({
        where: { id },
        include: { structures: true }
      });
      return NextResponse.json({ ok: true, data: site });
    }

    const sites = await prisma.site.findMany({
      where: districtId ? { districtId } : undefined,
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ ok: true, data: sites });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, address, districtId } = body;
    
    // Fallback: If no districtId is provided, we use the first available one to avoid orphans
    let targetDistrictId = districtId;
    if (!targetDistrictId) {
        const firstDistrict = await prisma.district.findFirst();
        targetDistrictId = firstDistrict?.id;
    }

    if (!name || !targetDistrictId) {
        return NextResponse.json({ ok: false, error: "name es requerido y debe existir al menos un distrito" }, { status: 400 });
    }

    const site = await prisma.site.create({
      data: { name, address, districtId: targetDistrictId },
    });
    return NextResponse.json({ ok: true, data: site }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const body = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id requerido" }, { status: 400 });
  try {
    const site = await prisma.site.update({ where: { id }, data: body });
    return NextResponse.json({ ok: true, data: site });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id requerido" }, { status: 400 });
  try {
    await prisma.site.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
