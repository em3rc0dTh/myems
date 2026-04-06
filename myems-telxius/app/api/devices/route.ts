import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function ok(data: unknown) {
  return NextResponse.json({ ok: true, data });
}
function err(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

// GET /api/devices?siteId=xxx
// Lista los dispositivos de un sitio
export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) return err("siteId is required");

  const devices = await prisma.device.findMany({
    where: { siteId },
    include: {
      equipments: {
        where: { parentEquipmentId: null }, // Solo traer la raíz (Racks/Frames)
        include: { children: true }
      }
    }
  });
  return ok(devices);
}

// POST /api/devices
// Crea un dispositivo (ej: BDFB-01) y lo vincula opcionalmente a posiciones
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, category, siteId, positionIds } = body;

  if (!name || !siteId) return err("name and siteId are required");

  // Transacción: Crear device y actualizar posiciones
  const device = await prisma.$transaction(async (tx) => {
    const d = await tx.device.create({
      data: { name, category: category ?? "NETWORKING", siteId }
    });

    if (positionIds && Array.isArray(positionIds)) {
      await (tx as any).position.updateMany({
        where: { id: { in: positionIds } },
        data: { deviceId: d.id, status: "OCCUPIED" }
      });
    }
    return d;
  });

  return ok(device);
}

// PATCH /api/devices?id=xxx
export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return err("id required");

  const body = await req.json();
  const { name, category } = body;

  const updated = await prisma.device.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(category && { category }),
    }
  });
  return ok(updated);
}
