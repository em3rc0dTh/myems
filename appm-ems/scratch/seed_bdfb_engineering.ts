
import { PrismaClient, EquipmentCategory, PortType, PortRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Semilla de Ingeniería para BDFB ---');

  // 1. Encontrar o crear un Sitio y un Contenedor (Rack)
  const site = await prisma.site.findFirst();
  if (!site) throw new Error('No se encontró un sitio para asociar el BDFB');

  const container = await prisma.container.findFirst({ where: { type: 'RACK' } });
  if (!container) throw new Error('No se encontró un contenedor tipo RACK');

  // 2. Crear el Device (Abstracción Lógica)
  const bdfbDevice = await prisma.device.create({
    data: {
      name: 'BDFB-DC01-A',
      category: 'POWER_DISTRIBUTION',
      siteId: site.id,
      containerId: container.id,
    }
  });

  // 3. Crear el Chasis Físico (SHELF)
  const bdfbShelf = await prisma.equipment.create({
    data: {
      name: 'BDFB 600A Chassis',
      category: 'SHELF',
      deviceId: bdfbDevice.id,
      expectedType: 'GENERAL_ELECTRIC_600A',
      sn: 'SN-BDFB-001',
    }
  });

  // 4. Crear el Panel A (SUBSHELF)
  const panelA = await prisma.equipment.create({
    data: {
      name: 'Panel A',
      category: 'SUBSHELF',
      deviceId: bdfbDevice.id,
      parentEquipmentId: bdfbShelf.id,
      logicalPrefix: '0_1',
    }
  });

  // 5. Crear 24 Ranuras (Holders) para el Panel A
  console.log('Creando 24 Holders para Panel A...');
  for (let i = 1; i <= 24; i++) {
    const holder = await prisma.holder.create({
      data: {
        name: `Posicion ${i.toString().padStart(2, '0')}`,
        location: `/sh=1/pa=1/pos=${i}`,
        parentEquipmentId: panelA.id,
      }
    });

    // 6. Instalar un Breaker en la Posición 1 como ejemplo
    if (i === 1) {
      const breaker = await prisma.equipment.create({
        data: {
          name: 'Breaker 63A - Slot 01',
          category: 'BREAKER',
          deviceId: bdfbDevice.id,
          parentEquipmentId: panelA.id,
          insertedInId: holder.id,
          expectedType: '63A_SINGLE_POLE',
          sn: 'BRK-XP-9921',
        }
      });

      // 7. Crear el Puerto de Salida del Breaker
      await prisma.port.create({
        data: {
          name: 'Load Connection',
          type: 'POWER_DIST',
          role: 'OUTPUT',
          deviceId: bdfbDevice.id,
          equipmentId: breaker.id,
          maxAmperage: 63,
          nominalVoltage: 48,
          cableGauge: '4AWG',
          cableType: 'Cu-Multifilar-Red',
          clientName: 'CORE_ROUTER_FARID',
          sensorTopic: 'appm-ems/dc01/bdfbA/p1/amps'
        }
      });
    }
  }

  console.log('--- Migración de Ingeniería completada con éxito ---');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
