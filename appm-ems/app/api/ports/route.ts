import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function ok(data: unknown) {
  return NextResponse.json({ ok: true, data });
}
function err(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

// GET /api/ports?equipmentId=xxx
export async function GET(req: NextRequest) {
  const equipmentId = req.nextUrl.searchParams.get("equipmentId");
  const deviceId = req.nextUrl.searchParams.get("deviceId");

  const where = {
    ...(equipmentId && { equipmentId }),
    ...(deviceId && { deviceId }),
  };

  const ports = await (prisma.port as any).findMany({
    where,
    include: {
      sourceConnections: { include: { targetPort: { include: { equipment: true } } } },
      targetConnections: { include: { sourcePort: { include: { equipment: true } } } },
    }
  });
  return ok(ports);
}

// POST /api/ports
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, type, equipmentId, deviceId, sensorKey, sensorTopic, clientName, maxAmperage, cableGauge } = body;

  if (!name || !deviceId) return err("name and deviceId are required");

  const port = await (prisma.port as any).create({
    data: {
      name,
      type: type || "POWER_DIST",
      sensorKey: sensorKey || sensorTopic || null,
      equipmentId: equipmentId || null,
      deviceId,
      clientName: clientName || "",
      maxAmperage: maxAmperage ? Number(maxAmperage) : null,
      cableGauge: cableGauge || null
    }
  });
  return ok(port);
}

// PATCH /api/ports?id=xxx
export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return err("id required");

  const body = await req.json();
  const { name, type, sensorKey, sensorTopic, clientName, maxAmperage, cableGauge } = body;

  const updated = await (prisma.port as any).update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...( (sensorKey !== undefined || sensorTopic !== undefined) && { sensorKey: sensorKey || sensorTopic || null }),
      ...(clientName !== undefined && { clientName: clientName || "" }),
      ...(maxAmperage !== undefined && { maxAmperage: Number(maxAmperage) || null }),
      ...(cableGauge !== undefined && { cableGauge: cableGauge || null }),
    }
  });
  return ok(updated);
}

// DELETE /api/ports?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return err("id required");

  await prisma.port.delete({ where: { id } });
  return ok({ deleted: id });
}
