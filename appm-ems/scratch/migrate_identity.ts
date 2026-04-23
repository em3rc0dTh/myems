import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  console.log('--- STARTING DATA MIGRATION: IDENTITY TRANSFER ---');
  
  // 1. Get all devices that still have an SN
  const devices = await prisma.device.findMany({
    where: { 
        NOT: { sn: null } 
    },
    include: { equipments: true }
  });

  console.log(`Found ${devices.length} devices with legacy identity.`);

  for (const device of devices) {
    const mainSn = (device as any).sn;
    
    // Find the first root equipment or create one if missing
    let targetEq = device.equipments.find(e => !e.parentEquipmentId);

    if (targetEq) {
      console.log(`Moving SN ${mainSn} from Device ${device.name} to Equipment ${targetEq.name}`);
      await prisma.equipment.update({
        where: { id: targetEq.id },
        data: { sn: mainSn }
      });
    } else {
      console.log(`No equipment found for ${device.name}. Creating generic asset.`);
      await prisma.equipment.create({
        data: {
          name: `${device.name} Chassis`,
          sn: mainSn,
          category: (device as any).category || 'CHASSIS',
          deviceId: device.id,
        }
      });
    }

    // Clear legacy SN from Device
    await prisma.device.update({
      where: { id: device.id },
      data: { sn: null } as any
    });
  }

  console.log('--- MIGRATION COMPLETE ---');
}

migrate()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
