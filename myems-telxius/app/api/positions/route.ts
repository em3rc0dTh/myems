import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function ok(data: unknown) {
  return NextResponse.json({ ok: true, data });
}
function err(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

// GET /api/positions?substructureId=xxx
// Returns all positions for a room, sorted row/col
export async function GET(req: NextRequest) {
  const substructureId = req.nextUrl.searchParams.get("substructureId");
  if (!substructureId) return err("substructureId required");

  const positions = await prisma.position.findMany({
    where: { substructureId },
    orderBy: [{ row: "asc" }, { col: "asc" }],
  });
  return ok(positions);
}

// POST /api/positions
// Body: { substructureId, row, col, widthUnits?, depthUnits?, label?, status? }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { substructureId, row, col, widthUnits, depthUnits, physWidthCm, physDepthCm, physOffsetX, physOffsetY, label, status } = body;

  if (!substructureId || !row || col === undefined)
    return err("substructureId, row and col are required");

  // Prevent duplicate (same room + row + col)
  const existing = await prisma.position.findFirst({
    where: { substructureId, row, col: Number(col) },
  });
  if (existing) return err(`Position ${row}${col} already exists in this room`, 409);

  const position = await (prisma.position as any).create({
    data: {
      substructureId,
      row,
      col: Number(col),
      widthUnits:  Number(widthUnits  ?? 1),
      depthUnits:  Number(depthUnits  ?? 1),
      physWidthCm: Number(physWidthCm ?? 60),
      physDepthCm: Number(physDepthCm ?? 60),
      physOffsetX: Number(physOffsetX ?? 0),
      physOffsetY: Number(physOffsetY ?? 0),
      label: label ?? null,
      status: status ?? "EMPTY",
    },
  });
  return ok(position);
}

// PATCH /api/positions?id=xxx
// Body: { status?, label?, widthUnits?, depthUnits?, deviceId? }
export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return err("id required");

  const body = await req.json();
  const { status, label, widthUnits, depthUnits, physWidthCm, physDepthCm, physOffsetX, physOffsetY, deviceId } = body;

  const updated = await (prisma.position as any).update({
    where: { id },
    data: {
      ...(status      !== undefined && { status }),
      ...(label       !== undefined && { label }),
      ...(widthUnits  !== undefined && { widthUnits:  Number(widthUnits) }),
      ...(depthUnits  !== undefined && { depthUnits:  Number(depthUnits) }),
      ...(physWidthCm !== undefined && { physWidthCm: Number(physWidthCm) }),
      ...(physDepthCm !== undefined && { physDepthCm: Number(physDepthCm) }),
      ...(physOffsetX !== undefined && { physOffsetX: Number(physOffsetX) }),
      ...(physOffsetY !== undefined && { physOffsetY: Number(physOffsetY) }),
      ...(deviceId    !== undefined && { deviceId }),
    },
  });
  return ok(updated);
}

// DELETE /api/positions?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return err("id required");

  await prisma.position.delete({ where: { id } });
  return ok({ deleted: id });
}
