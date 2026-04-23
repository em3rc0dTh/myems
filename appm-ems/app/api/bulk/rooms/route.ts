import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

// Script Helper para asegurar que la jerarquía base existe en DB
async function getOrCreateBaseGeography(geo: { country: string, region: string, province: string, town: string, district: string }) {
    const country = await prisma.country.upsert({ 
        where: { name: geo.country || 'Peru' }, 
        update: {}, 
        create: { name: geo.country || 'Peru' } 
    });
    
    let region = await prisma.region.findFirst({ where: { name: geo.region || 'Lima', countryId: country.id } });
    if (!region) region = await prisma.region.create({ data: { name: geo.region || 'Lima', countryId: country.id } });

    let province = await prisma.province.findFirst({ where: { name: geo.province || 'Lima', regionId: region.id } });
    if (!province) province = await prisma.province.create({ data: { name: geo.province || 'Lima', regionId: region.id } });

    let town = await prisma.town.findFirst({ where: { name: geo.town || 'Lima', provinceId: province.id } });
    if (!town) town = await prisma.town.create({ data: { name: geo.town || 'Lima', provinceId: province.id } });

    let district = await prisma.district.findFirst({ where: { name: geo.district || 'Lurin', townId: town.id } });
    if (!district) district = await prisma.district.create({ data: { name: geo.district || 'Lurin', townId: town.id } });

    return district.id;
}

// Carga masiva de Rooms
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { country, region, province, town, district, rooms } = body; 
        
        const dataToProcess = Array.isArray(rooms) ? rooms : (Array.isArray(body) ? body : []);
        const results = [];
        
        const defaultDistrictId = await getOrCreateBaseGeography({ country, region, province, town, district });

        for (const item of dataToProcess) {
            // 1. Get/Create Site
            let site = await prisma.site.findFirst({ where: { name: item.siteName } });
            if (!site) {
                site = await prisma.site.create({ 
                    data: { 
                        name: item.siteName, 
                        districtId: defaultDistrictId 
                    } 
                });
            }

            // 2. Get/Create Structure (Building)
            let structure = await prisma.structure.findFirst({ 
                where: { name: item.buildingName, siteId: site.id } 
            });
            if (!structure) {
                structure = await prisma.structure.create({ 
                    data: { 
                        name: item.buildingName, 
                        siteId: site.id 
                    } 
                });
            }

            // 3. Get/Create Level (Defaulting to Level 1 if not provided)
            let level = await prisma.level.findFirst({ 
                where: { name: item.levelName || "Piso 1", structureId: structure.id } 
            });
            if (!level) {
                level = await prisma.level.create({ 
                    data: { 
                        name: item.levelName || "Piso 1", 
                        structureId: structure.id 
                    } 
                });
            }

            // 4. Create Substructure (Room)
            let room = await prisma.substructure.findFirst({ 
                where: { name: item.name, levelId: level.id } 
            });
            
            if (!room) {
                room = await prisma.substructure.create({
                    data: {
                        name: item.name,
                        levelId: level.id,
                        type: "ROOM",
                        area: item.area ? parseFloat(item.area) : undefined,
                        width: item.width ? parseFloat(item.width) : undefined,
                        length: item.length ? parseFloat(item.length) : undefined,
                        measurementUnit: item.measurementUnit || "METRIC",
                        gridRows: ["A", "B", "C", "D"],
                        gridCols: [1,2,3,4,5,6,7,8,9,10,11,12]
                    }
                });
            }
            results.push(room.id);
        }

        return NextResponse.json({ success: true, count: results.length });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
