import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function ok(data: unknown) {
  return NextResponse.json({ ok: true, data });
}
function err(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

// GET /api/equipments
// query params: deviceId (para traer todos los de un device) o parentId (para lazy loading)
export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  const parentId = req.nextUrl.searchParams.get("parentId");

  if (parentId) {
    const children = await (prisma.equipment as any).findMany({
      where: { parentEquipmentId: parentId },
      include: { children: true, ports: true },
      orderBy: { slotLabel: "asc" }
    });
    return ok(children);
  }

  if (deviceId) {
    const all = await (prisma.equipment as any).findMany({
      where: { deviceId },
      include: { children: true, ports: true },
      orderBy: { slotLabel: "asc" }
    });
    return ok(all);
  }

  return err("deviceId or parentId required");
}

// POST /api/equipments
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, category, slotLabel, deviceId, parentEquipmentId, unitPosition, unitHeight } = body;

  if (!name || !category || !deviceId) return err("name, category and deviceId are required");

  const equipment = await (prisma.equipment as any).create({
    data: {
      name,
      category,
      slotLabel,
      deviceId,
      parentEquipmentId: parentEquipmentId || null,
      unitPosition: unitPosition !== undefined ? Number(unitPosition) : null,
      unitHeight: unitHeight !== undefined ? Number(unitHeight) : 1,
    }
  });
  return ok(equipment);
}

// PATCH /api/equipments?id=xxx
export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return err("id required");

  const body = await req.json();
  const { name, slotLabel, category, unitPosition, unitHeight } = body;

  const updated = await (prisma.equipment as any).update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(slotLabel !== undefined && { slotLabel }),
      ...(category !== undefined && { category }),
      ...(unitPosition !== undefined && { unitPosition: Number(unitPosition) }),
      ...(unitHeight !== undefined && { unitHeight: Number(unitHeight) }),
    }
  });
  return ok(updated);
}

// DELETE /api/equipments?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return err("id required");

  try {
    const deleteRecursive = async (eqId: string) => {
      const children = await (prisma.equipment as any).findMany({ where: { parentEquipmentId: eqId } });
      for (const child of children) {
        await deleteRecursive(child.id);
      }
      await prisma.port.deleteMany({ where: { equipmentId: eqId } });
      await (prisma.equipment as any).delete({ where: { id: eqId } });
    };

    await deleteRecursive(id);
    return ok({ deleted: id });
  } catch (e: any) {
    console.error("Delete Error:", e);
    return err(e.message || "Error deleting equipment", 500);
  }
}
