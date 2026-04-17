
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log("Intentando conectar a MongoDB...");
    const userCount = await prisma.user.count();
    console.log("Conexión EXITOSA. Usuarios en BD:", userCount);
    process.exit(0);
  } catch (e) {
    console.error("ERROR DE CONEXIÓN A BD:");
    console.error(e);
    process.exit(1);
  }
}

test();
