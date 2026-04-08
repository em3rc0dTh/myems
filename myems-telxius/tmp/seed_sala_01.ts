import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Sala-01 3-Bay Digital Twin Seed...");

  try {
    // 1. Identify the Room (Substructure) - Adjusting for the actual names found
    const room = await prisma.substructure.findFirst({
      where: { name: { contains: "SALA" } },
      orderBy: { name: 'asc' } // Usually SALA 05 or SALA02
    });

    if (!room) {
      console.error("❌ Room not found. Run migrations first.");
      return;
    }

    console.log(`📍 Updating Room: ${room.name} (${room.id})`);

    // 2. Clear existing positions mapping for this room to start clean
    await prisma.position.deleteMany({ where: { substructureId: room.id } });

    // 3. Define the Polygonal Perimeter from the sketch
    // Approximate scale: 1 unit = 1 cm
    // Shape: Rectangular top, slanted right, cutout bottom left
    const perimeter = [
      [0, 0],       // Top Left (near Door)
      [1400, 0],    // Top Right
      [1400, 600],  // Right wall starts slant
      [1000, 900],  // Bottom Right slanted
      [200, 900],   // Bottom Mid
      [200, 700],   // Bottom Left Cutout
      [0, 700],
      [0, 0]        // Close
    ];

    const referencePoints = [
      { x: 50, y: 10, type: 'DOOR', label: 'ACCESO PRINCIPAL' },
      { x: 1350, y: 550, type: 'MARKER', label: 'RACK SEGURIDAD' }
    ];

    await (prisma.substructure as any).update({
      where: { id: room.id },
      data: {
        perimeter: JSON.stringify(perimeter),
        referencePoints: JSON.stringify(referencePoints),
        gridRows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
        gridCols: Array.from({ length: 25 }, (_, i) => i + 1)
      }
    });

    // 4. Create 3 Bays (Horizontal Rows)
    // Bay 1: Rows A & B (Back-to-back)
    // Bay 2: Rows D & E
    // Bay 3: Rows G & H
    const bayLabels = [
        { rows: ["A", "B"], colStart: 3, colEnd: 18, labelPrefix: "RACK-1-" },
        { rows: ["D", "E"], colStart: 3, colEnd: 18, labelPrefix: "RACK-2-" },
        { rows: ["G", "H"], colStart: 3, colEnd: 18, labelPrefix: "RACK-3-" }
    ];

    console.log("📦 Creating positions for 3 Bays...");

    for (const bay of bayLabels) {
        for (const row of bay.rows) {
            for (let col = bay.colStart; col <= bay.colEnd; col++) {
                const isFirstInBay = col === bay.colStart && row === bay.rows[0];
                
                await (prisma.position as any).create({
                    data: {
                        substructureId: room.id,
                        row,
                        col,
                        status: isFirstInBay ? "OCCUPIED" : "EMPTY",
                        label: isFirstInBay ? `BDFB-${bay.labelPrefix.split('-')[1]}` : `${bay.labelPrefix}${col}`,
                        physWidthCm: 58,  // Slightly offset from the 60cm tile
                        physDepthCm: 58,
                        physOffsetX: 1,   // Centered in tile
                        physOffsetY: 1,
                        widthUnits: 1,
                        depthUnits: 1,
                        deviceId: null
                    }
                });
            }
        }
    }

    console.log("✅ Seed completed successfully.");

  } catch (err) {
    console.error("❌ Seed error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
