import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Script Helper para asegurar que la jerarquía base (País -> Región -> Provincia -> Ciudad -> Distrito) existe en DB
async function getOrCreateBaseGeography() {
    const country = await prisma.country.upsert({ 
        where: { name: 'Peru' }, 
        update: {}, 
        create: { name: 'Peru' } 
    });
    
    let region = await prisma.region.findFirst({ where: { name: 'Lima', countryId: country.id } });
    if (!region) region = await prisma.region.create({ data: { name: 'Lima', countryId: country.id } });

    let province = await prisma.province.findFirst({ where: { name: 'Lima', regionId: region.id } });
    if (!province) province = await prisma.province.create({ data: { name: 'Lima', regionId: region.id } });

    let town = await prisma.town.findFirst({ where: { name: 'Lima', provinceId: province.id } });
    if (!town) town = await prisma.town.create({ data: { name: 'Lima', provinceId: province.id } });

    let district = await prisma.district.findFirst({ where: { name: 'Lurin', townId: town.id } });
    if (!district) district = await prisma.district.create({ data: { name: 'Lurin', townId: town.id } });

    return district.id;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // 1. Asegurar la existencia de base geográfica
        const districtId = await getOrCreateBaseGeography();

        // 2. Iterar sobre todos los BDFBs / Nodos subidos en el CSV/JSON (Monolithic o Cascaded)
        for (const bdfb of body) {
            
            // -- TAPI DOMAIN O (Estructural) --
            let site = await prisma.site.findFirst({ where: { name: bdfb.site, districtId } });
            if (!site) site = await prisma.site.create({ data: { name: bdfb.site, districtId } });

            let structure = await prisma.structure.findFirst({ where: { name: bdfb.building, siteId: site.id } });
            if (!structure) structure = await prisma.structure.create({ data: { name: bdfb.building, siteId: site.id } });

            let level = await prisma.level.findFirst({ where: { name: "Piso 1", structureId: structure.id } });
            if (!level) level = await prisma.level.create({ data: { name: "Piso 1", structureId: structure.id } });

            let room = await prisma.substructure.findFirst({ where: { name: bdfb.room, levelId: level.id } });
            if (!room) {
                room = await prisma.substructure.create({ 
                    data: { 
                        name: bdfb.room, 
                        levelId: level.id, 
                        type: "ROOM", 
                        measurementUnit: "METRIC",
                        area: 250.0,
                        gridRows: ["A", "B", "C", "D"], 
                        gridCols: [1,2,3,4,5,6,7,8,9,10,11,12] 
                    } 
                });
            }

            // -- NUEVO: CONTAINER (Base de montaje física del Rack/Cabinet) --
            let container = await prisma.container.findFirst({ where: { name: bdfb.deviceName, substructureId: room.id } });
            if (!container) {
                const isBDFB = bdfb.deviceType === "BDFB";
                container = await prisma.container.create({
                    data: {
                        name: bdfb.deviceName,
                        type: isBDFB ? "CABINET" : "RACK",
                        substructureId: room.id,
                        row: bdfb.gridRow || "A",
                        position: parseInt(bdfb.gridCol) || 1,
                        measurementUnit: isBDFB ? "IMPERIAL" : "METRIC",
                        width: isBDFB ? 34.0 : 60.0,
                        depth: isBDFB ? 15.0 : 60.0,
                        height: isBDFB ? 84.0 : 220.0,
                        footprintArea: isBDFB ? (34.0 * 15.0) : (60.0 * 60.0),
                        mountingWidth: isBDFB ? 19.0 : 47.5,
                        assignSpace: 46 // Capacidad por defecto de U / Slots (46 RUs)
                    }
                });
            }

            // -- TAPI DOMAIN 1 (Devices Físicos Lógicos) --
            let device = await prisma.device.findFirst({ where: { name: bdfb.deviceName, siteId: site.id } });
            if (!device) {
                device = await prisma.device.create({ 
                    data: { name: bdfb.deviceName, siteId: site.id, category: bdfb.deviceType }
                });
                
                // Mapear su posición física en la grilla de la sala (Tile 60x60 base ocupado por el Container)
                await prisma.position.create({
                    data: {
                        substructureId: room.id,
                        row: bdfb.gridRow || "A",
                        col: parseInt(bdfb.gridCol) || 1,
                        status: "OCCUPIED",
                        label: bdfb.deviceName,
                        deviceId: device.id,
                        physWidthCm: 60,
                        physDepthCm: 60
                    }
                });
            }

            // -- TAPI DOMAIN 2 (Equipments Secundarios, Serial Numbers, y Puertos Influx) --
            let unitPosCounter = 40; // Iniciar Rack Units en la 40 para los Panels
            for (const panel of bdfb.panels) {
                // Cada panel es un 'Equipment' anidado bajo el Device o Rack
                let eqPanel = await prisma.equipment.findFirst({ where: { name: panel.name, deviceId: device.id } });
                if (!eqPanel) {
                    eqPanel = await prisma.equipment.create({
                        data: { 
                            name: panel.name, 
                            category: "BREAKER_PANEL", 
                            deviceId: device.id,
                            sn: bdfb.deviceSn, // Mapeado del serial number principal o del panel
                            unitPosition: unitPosCounter, // Ocupando la posición RU del Container AssignSpace
                            unitHeight: 2 
                        }
                    });
                }
                
                unitPosCounter -= 2; // Bajando unidades de Rack

                for (const br of panel.breakers) {
                    const portName = `Port ${br.position.toString().padStart(2, '0')}`;
                    let port = await prisma.port.findFirst({ where: { name: portName, equipmentId: eqPanel.id } });
                    
                    if (!port) {
                        await prisma.port.create({
                            data: {
                                name: portName,
                                equipmentId: eqPanel.id,
                                deviceId: device.id,
                                type: "POWER_OUT",
                                sensorTopic: br.mqttChannel || "" // TOPIC VINCULANTE A INFLUXDB
                            }
                        });
                    } else {
                        // Actualizar mapeo MQTT si cambió
                        if (port.sensorTopic !== br.mqttChannel) {
                           await prisma.port.update({ where: { id: port.id }, data: { sensorTopic: br.mqttChannel } });
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true, countProcessed: body.length });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
