import { prisma } from "../src/lib/prisma.js";

async function main() {
  const tables = await prisma.$queryRawUnsafe<any[]>("SHOW TABLES");
  console.log("Tables in database:", tables);
}

main().catch(console.error).finally(() => prisma.$disconnect());
