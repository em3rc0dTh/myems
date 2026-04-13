import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

// POST /telxius/api/bulk/containers
export async function POST(req: Request) {
    try {
        const body = await req.json();
        if (!Array.isArray(body)) {
            return NextResponse.json({ error: "Se esperaba un array de contenedores" }, { status: 400 });
        }

        const createdCount = [];

        for (const contData of body) {
            const { 
                roomName, 
                rowName, 
                containerName, 
                type = "RACK", 
                position = 0, 
                width = 60, 
                depth = 60, 
                height, 
                footprintArea, 
                mountingWidth, 
                assignSpace,
                x = 0, 
                y = 0 
            } = contData;

            // 1. Find Room
            const room = await prisma.substructure.findFirst({ where: { name: roomName } });
            if (!room) {
                console.warn(`Room not found: ${roomName}`);
                continue;
            }

            // 2. Find Parent Row (Bay)
            const parentRow = await prisma.row.findFirst({
                where: { name: rowName, substructureId: room.id }
            });

            // 3. Create Container
            const container = await prisma.container.create({
                data: {
                    name: containerName,
                    substructureId: room.id,
                    rowId: parentRow ? parentRow.id : undefined,
                    row: rowName || "A", // legacy field
                    position: Number(position),
                    type,
                    width: Number(width),
                    depth: Number(depth),
                    height: height ? Number(height) : undefined,
                    footprintArea: footprintArea ? Number(footprintArea) : undefined,
                    mountingWidth: mountingWidth ? Number(mountingWidth) : undefined,
                    assignSpace: assignSpace ? Number(assignSpace) : 46,
                    spatialMetadata: JSON.stringify({ x, y, w: width, h: depth, metric: 'cm' })
                }
            });
            
            createdCount.push(container.id);
        }

        return NextResponse.json({ success: true, count: createdCount.length });
    } catch (e: any) {
        console.error("Bulk Container Ingestion Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
