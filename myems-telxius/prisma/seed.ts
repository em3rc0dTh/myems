import { config } from "dotenv";
config();
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🛡️ Iniciando SEED - Fase 0: Seguridad (Admin por defecto)...");
  
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    const admin = await prisma.user.create({
      data: {
        username: "admin",
        password: hash,
        name: "Administrador General",
        role: "ADMIN",
        mustChangePassword: true,
      },
    });
    console.log(`✅ Usuario Maestro Creado: ${admin.username} (Contraseña a cambiar en 1er login)`);
  } else {
    console.log(`✅ Usuarios ya existen en base de datos. Saltando semilla de seguridad.`);
  }

  console.log("\n🌍 Iniciando SEED - Fase 1: Dominio Geográfico...\n");

  // 1. País — findFirst para evitar duplicados sin upsert (no requiere replica set)
  let country = await prisma.country.findFirst({ where: { name: "Perú" } });
  if (!country) {
    country = await prisma.country.create({ data: { name: "Perú" } });
  }
  console.log(`✅ País: ${country.name} (${country.id})`);

  // 2. Región
  let region = await prisma.region.findFirst({ where: { name: "Región Lima", countryId: country.id } });
  if (!region) {
    region = await prisma.region.create({ data: { name: "Región Lima", countryId: country.id } });
  }
  console.log(`✅ Región: ${region.name}`);

  // 3. Provincia
  let province = await prisma.province.findFirst({ where: { name: "Provincia de Lima", regionId: region.id } });
  if (!province) {
    province = await prisma.province.create({ data: { name: "Provincia de Lima", regionId: region.id } });
  }
  console.log(`✅ Provincia: ${province.name}`);

  // 4. Ciudad/Pueblo (Town)
  let town = await prisma.town.findFirst({ where: { name: "Lima", provinceId: province.id } });
  if (!town) {
    town = await prisma.town.create({ data: { name: "Lima", provinceId: province.id } });
  }
  console.log(`✅ Pueblo/Ciudad: ${town.name}`);

  // 5. Distrito
  let district = await prisma.district.findFirst({ where: { name: "Lurín", townId: town.id } });
  if (!district) {
    district = await prisma.district.create({ data: { name: "Lurín", townId: town.id } });
  }
  console.log(`✅ Distrito: ${district.name}`);

  // 6. Sitio
  let site = await prisma.site.findFirst({ where: { name: "Lurín DC01", districtId: district.id } });
  if (!site) {
    site = await prisma.site.create({
      data: {
        name: "Lurín DC01",
        districtId: district.id,
        address: "Panamericana Sur Km. 35, Lurín, Lima, Perú",
        geoCoords: "-12.2741, -76.8711",
      },
    });
  }

  console.log(`\n🏗️  Sitio creado: ${site.name}`);
  console.log(`   ID     : ${site.id}`);
  console.log(`   Address: ${site.address}`);
  console.log(`   Coords : ${site.geoCoords}`);
  console.log("\n✅ SEED Fase 1 completado con éxito!");
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
