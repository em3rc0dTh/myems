const { PrismaClient } = require("./lib/generated/client");
const prisma = new PrismaClient();

async function test() {
  try {
    console.log("Starting test...");
    const site = await prisma.site.findFirst();
    console.log("Connection OK, first site:", site?.name || "None found");
  } catch (e) {
    console.error("Connection Failed:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
