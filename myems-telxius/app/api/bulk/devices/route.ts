import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const results = [];

        for (const item of body) {
            // 1. Buscamos el sitio (o usamos el Almacén Central por defecto)
            let site = await prisma.site.findFirst({ where: { name: item.siteName || "ALMACÉN CENTRAL" } });
            
            if (!site) {
                const systemCountry = await prisma.country.upsert({
                    where: { name: "SYSTEM" },
                    update: {},
                    create: { name: "SYSTEM" }
                });
                const systemRegion = await prisma.region.findFirst({ where: { name: "GLOBAL", countryId: systemCountry.id } }) || 
                                     await prisma.region.create({ data: { name: "GLOBAL", countryId: systemCountry.id } });
                const systemProvince = await prisma.province.findFirst({ where: { name: "GLOBAL", regionId: systemRegion.id } }) ||
                                       await prisma.province.create({ data: { name: "GLOBAL", regionId: systemRegion.id } });
                const systemTown = await prisma.town.findFirst({ where: { name: "GLOBAL", provinceId: systemProvince.id } }) ||
                                   await prisma.town.create({ data: { name: "GLOBAL", provinceId: systemProvince.id } });
                const systemDistrict = await prisma.district.findFirst({ where: { name: "GLOBAL", townId: systemTown.id } }) ||
                                       await prisma.district.create({ data: { name: "GLOBAL", townId: systemTown.id } });
                
                site = await prisma.site.create({
                    data: {
                        name: "ALMACÉN CENTRAL",
                        districtId: systemDistrict.id,
                        address: "VIRTUAL STORAGE",
                        isLogical: true
                    }
                });
            }

            // 2. Escenario: Instanciación desde Plantilla (Catalog -> Instance)
            if (item.templateName) {
                const template = await prisma.device.findFirst({
                    where: { name: item.templateName, site: { isLogical: true } }
                });

                if (template) {
                    const container = await prisma.container.findFirst({ where: { name: item.containerName } });
                    
                    // Llamamos a la lógica interna de clonación (asumimos que existe un helper o la replicamos)
                    // Para brevedad en bulk, usaremos un POST a la ruta de devices individual o implementamos aquí
                    const res = await fetch(`${req.url.split('/api/')[0]}/api/devices`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            templateId: template.id,
                            siteId: site.id,
                            name: item.name,
                            containerId: container?.id,
                            uPosition: item.uPosition
                        })
                    });
                    if (res.ok) results.push((await res.json()).data.id);
                    continue;
                }
            }

            // 3. Creación Estándar (Master Template o Standalone)
            let device = await prisma.device.findFirst({ 
                where: { name: item.name, siteId: site.id } 
            });

            if (!device) {
                const container = item.containerName ? await prisma.container.findFirst({ where: { name: item.containerName } }) : null;

                device = await prisma.device.create({
                    data: {
                        name: item.name,
                        category: item.category || "GENERAL",
                        siteId: site.id,
                        containerId: container?.id || null,
                        uPosition: item.uPosition ? Number(item.uPosition) : null
                    }
                });
            }
            results.push(device.id);
        }

        return NextResponse.json({ success: true, count: results.length });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
