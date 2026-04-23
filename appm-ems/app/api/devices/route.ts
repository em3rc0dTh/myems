import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function ok(data: unknown) {
  return NextResponse.json({ ok: true, data });
}
function err(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

// GET /api/devices
export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get("siteId");
  const containerId = req.nextUrl.searchParams.get("containerId");
  const orphaned = req.nextUrl.searchParams.get("orphaned");

  const where: any = {};
  if (containerId) where.containerId = containerId;
  else if (orphaned === "true") where.containerId = null;
  else if (siteId) where.siteId = siteId;
  else return err("siteId, containerId or orphaned=true is required");

  const devices = await prisma.device.findMany({
    where,
    include: {
      site: true,
      equipments: {
        where: { parentEquipmentId: null }, // Solo traer la raíz (Racks/Frames)
        include: { children: true }
      }
    }
  });
  return ok(devices);
}

// POST /api/devices
// Crea un dispositivo (ej: BDFB-01) y lo vincula opcionalmente a posiciones o clona una plantilla
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, category, sn, siteId, positionIds, containerId, uPosition, templateId, physWidth, physDepth, physHeight } = body;

  // ESCENARIO: CLONACIÓN DE PLANTILLA (Clona Device + Equipos + Puertos)
  if (templateId) {
    if (!siteId) return err("siteId is required for cloning");
    return await cloneDevice(templateId, siteId, containerId, uPosition, name, sn);
  }

  if (!name || !siteId) return err("name and siteId are required");

  // Transacción: Crear device y actualizar posiciones
  const device = await prisma.$transaction(async (tx) => {
      const d = await tx.device.create({
        data: { 
          name, 
          sn: sn || null,
          category: category ?? "NETWORKING", 
          siteId,
          containerId: containerId || null,
          uPosition: uPosition ? Number(uPosition) : null,
          physWidth: physWidth ? Number(physWidth) : null,
          physDepth: physDepth ? Number(physDepth) : null,
          physHeight: physHeight ? Number(physHeight) : null
        }
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

// Lógica de Clonación Profunda
async function cloneDevice(templateId: string, siteId: string, containerId: string, uPosition: any, name?: string, sn?: string) {
  try {
    const template = await prisma.device.findUnique({
      where: { id: templateId },
      include: {
        equipments: {
          include: { ports: true, children: { include: { ports: true, children: { include: { ports: true } } } } }
        },
        ports: true
      }
    });

    if (!template) return err("Template not found");

    const newDevice = await prisma.$transaction(async (tx) => {
      // 1. Clonamos el Device base (El Box)
      const d = await (tx as any).device.create({
        data: {
          name: name ? `${name}-WRAPPER` : `${template.name}-WRAPPER`,
          category: template.category,
          siteId,
          containerId: containerId || null,
          uPosition: uPosition ? Number(uPosition) : null,
          physWidth: template.physWidth,
          physDepth: template.physDepth,
          physHeight: template.physHeight
        }
      });

      // 2. Función recursiva para clonar Equipment
      let firstRootClaimed = false;
      const cloneEquipment = async (eq: any, parentId: string | null = null) => {
        // Asignamos el SN proporcionado al primer equipo raíz que encontremos (el chasis principal)
        let targetSn = eq.sn;
        if (!parentId && !firstRootClaimed && sn) {
          targetSn = sn;
          firstRootClaimed = true;
        }

        const newEq = await (tx as any).equipment.create({
          data: {
            name: !parentId && name ? name : eq.name,
            sn: targetSn,
            category: eq.category,
            slotLabel: eq.slotLabel,
            unitPosition: eq.unitPosition,
            unitHeight: eq.unitHeight,
            logicalPrefix: eq.logicalPrefix,
            deviceId: d.id,
            parentEquipmentId: parentId
          }
        });

        // Clonar puertos del equipo
        if (eq.ports?.length > 0) {
          for (const p of eq.ports) {
            await (tx as any).port.create({
              data: {
                name: p.name,
                type: p.type || "DATA",
                sensorKey: p.sensorKey || p.sensorTopic,
                equipmentId: newEq.id,
                deviceId: d.id,
                clientName: p.clientName || "",
                maxAmperage: p.maxAmperage || null,
                cableGauge: p.cableGauge || null
              }
            });
          }
        }

        // Clonar hijos recursivamente
        if (eq.children?.length > 0) {
          for (const child of eq.children) {
            await cloneEquipment(child, newEq.id);
          }
        }
      };

      // 3. Clonar Equipments Raíz
      const roots = template.equipments.filter(e => !e.parentEquipmentId);
      for (const eq of roots) {
        await cloneEquipment(eq);
      }

      // 4. Clonar Puertos Raíz del Device
      const rootPorts = template.ports.filter(p => !p.equipmentId);
      for (const p of rootPorts) {
        await tx.port.create({
          data: {
            name: p.name,
            type: p.type || "DATA",
            sensorKey: p.sensorKey || p.sensorTopic,
            deviceId: d.id,
            maxAmperage: p.maxAmperage || null,
            cableGauge: p.cableGauge || null
          }
        });
      }

      return d;
    });

    return ok(newDevice);
  } catch (e: any) {
    console.error("Cloning Error:", e);
    return err(e.message || "Error cloning device");
  }
}

// PATCH /api/devices?id=xxx
export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const body = await req.json();
  const targetId = id || body.id; // Soporta ID en query o body

  if (!targetId) return err("id required");

  const { name, category, containerId, uPosition, uHeight } = body;

  const updated = await prisma.device.update({
    where: { id: targetId },
    data: {
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(containerId !== undefined && { containerId: containerId || null }),
      ...(uPosition !== undefined && { uPosition: Number(uPosition) }),
      ...(uHeight !== undefined && { uHeight: Number(uHeight) }),
      ...(body.sn !== undefined && { sn: body.sn || null }),
      ...(body.isPinned !== undefined && { isPinned: Boolean(body.isPinned) }),
      ...(body.physWidth !== undefined && { physWidth: Number(body.physWidth) || null }),
      ...(body.physDepth !== undefined && { physDepth: Number(body.physDepth) || null }),
      ...(body.physHeight !== undefined && { physHeight: Number(body.physHeight) || null }),
    }
  });
  return ok(updated);
}
