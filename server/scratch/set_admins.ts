import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const emails = ['sinje1922@gmai.com', 'sinje1922@gmail.com', 'metaplanet99@gmail.com']
  console.log('Upserting admin users...')
  
  for (const email of emails) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { role: 'ADMIN' },
      create: { 
        email, 
        role: 'ADMIN',
        passwordHash: null // Google login users don't need a password hash
      }
    })
    console.log(`User ${email} is now ADMIN. (ID: ${user.id})`)
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
