import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  const campaigns = await prisma.campaign.findMany({
    select: { id: true, title: true, companyLogoUrl: true }
  });
  console.log(JSON.stringify(campaigns, null, 2));
  await prisma.$disconnect();
}

check();
