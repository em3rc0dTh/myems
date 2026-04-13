import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

async function getOrCreateBaseGeography(geo: { country: string, region: string, province: string, town: string, district: string }) {
    try {
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
    } catch (err: any) {
        console.error("Geo error:", err);
        throw new Error(`Geography Hierarchy Error: ${err.message}`);
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log("Bulk Site Body Received:", JSON.stringify(body, null, 2));
        
        const { country, region, province, town, district, sites } = body; 
        
        const dataToProcess = Array.isArray(sites) ? sites : (Array.isArray(body) ? body : []);
        console.log("Sites to process count:", dataToProcess.length);
        
        const results = [];
        
        const defaultDistrictId = await getOrCreateBaseGeography({ country, region, province, town, district });
        console.log("Default District ID resolved:", defaultDistrictId);

        for (const item of dataToProcess) {
            console.log("Processing Site:", item.name);
            let site = await prisma.site.findFirst({ where: { name: item.name } });
            if (!site) {
                site = await prisma.site.create({ 
                    data: { 
                        name: item.name, 
                        districtId: defaultDistrictId,
                        width: item.width ? parseFloat(item.width) : null,
                        length: item.length ? parseFloat(item.length) : null,
                        isLogical: item.isLogical || false
                    } 
                });
            }
            results.push(site.id);
        }

        return NextResponse.json({ success: true, count: results.length });
    } catch (e: any) {
        console.error("Bulk Site Error:", e);
        return NextResponse.json({ error: e.message, details: e.stack }, { status: 500 });
    }
}
