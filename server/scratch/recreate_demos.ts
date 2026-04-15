import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = 'demo1234'
  const passwordHash = await bcrypt.hash(password, 10)

  const demoUsers = [
    { email: 'user@demo.local', role: 'USER' },
    { email: 'manager@demo.local', role: 'MANAGER' },
    { email: 'admin@demo.local', role: 'ADMIN' },
  ]

  console.log('Recreating demo users in the new database...')

  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { 
        role: u.role,
        passwordHash
      },
      create: {
        email: u.email,
        role: u.role,
        passwordHash
      }
    })
    console.log(`User ${u.email} (${u.role}) is ready.`)
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
