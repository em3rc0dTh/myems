import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function ok(data: unknown) {
  return NextResponse.json({ ok: true, data });
}
function err(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

// GET /api/connections?portId=xxx (trae conexiones de un puerto)
export async function GET(req: NextRequest) {
  const portId = req.nextUrl.searchParams.get("portId");
  if (!portId) return err("portId required");

  const connections = await prisma.connection.findMany({
    where: {
      OR: [
        { sourcePortId: portId },
        { targetPortId: portId }
      ]
    },
    include: {
      sourcePort: { include: { equipment: true } },
      targetPort: { include: { equipment: true } }
    }
  });
  return ok(connections);
}

// POST /api/connections
// Crea el enlace físico (ej: Breaker A -> Rectificador 1)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sourcePortId, targetPortId, label } = body;

  if (!sourcePortId || !targetPortId) return err("source and target ports are required");

  const conn = await prisma.connection.create({
    data: {
      sourcePortId,
      targetPortId,
      label: label || "FEED"
    }
  });
  return ok(conn);
}

// DELETE /api/connections?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return err("id required");

  await prisma.connection.delete({ where: { id } });
  return ok({ deleted: id });
}
