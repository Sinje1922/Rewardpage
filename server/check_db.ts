import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const campaigns = await prisma.campaign.findMany()
  console.log('Campaigns:', campaigns.map(c => ({ id: c.id, title: c.title, points: c.totalRewardPoints })))
  
  const submissions = await prisma.submission.findMany()
  console.log('Submissions:', submissions.map(s => ({ id: s.id, status: s.status, missionId: s.missionId })))
}

main().catch(console.error).finally(() => prisma.$disconnect())
