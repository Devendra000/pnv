import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const hash = await bcrypt.hash("admin123", 12)
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@pnv.local",
      passwordHash: hash,
      displayName: "Admin",
      role: "ADMIN",
    },
  })

  // Create default #general channel
  const generalChannel = await prisma.channel.upsert({
    where: { slug: "general" },
    update: {},
    create: {
      name: "General",
      slug: "general",
      description: "Company-wide announcements and work-based matters",
      type: "PUBLIC",
      createdById: admin.id,
    },
  })

  // Ensure admin is a member of #general
  await prisma.channelMember.upsert({
    where: {
      channelId_userId: {
        channelId: generalChannel.id,
        userId: admin.id,
      },
    },
    update: {},
    create: {
      channelId: generalChannel.id,
      userId: admin.id,
    },
  })

  const rolesToSeed = ['अध्यक्ष', 'संचालक']
  for (const roleName of rolesToSeed) {
    await prisma.ownerRole.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    })
  }

  console.log("Seeded admin user, #general channel, and owner roles successfully")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })