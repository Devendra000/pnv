import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { COMPANY_VARIABLE_DEFINITIONS } from "../src/lib/companyVariables";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.objective.createMany({
    data: [
      { text: "To carry on the business of general trading and commission agency." },
      { text: "To provide consultancy and advisory services related to business registration." },
      { text: "To import, export, buy, sell, and deal in goods of all kinds." },
    ],
  });

  for (const variable of COMPANY_VARIABLE_DEFINITIONS) {
    await prisma.variable.upsert({
      where: { key: variable.key },
      update: {
        label: variable.label,
        type: variable.type,
      },
      create: {
        key: variable.key,
        label: variable.label,
        type: variable.type,
      },
    });
  }

  await prisma.company.create({
    data: {
      englishName: "Test Traders Pvt. Ltd.",
      nepaliName: "टेस्ट ट्रेडर्स प्रा. लि.",
      ownerType: "SINGLE",
      owners: {
        create: [{ name: "Ram Sharma", address: "Kathmandu", order: 0 }],
      },
    },
  });
}

main()
  .then(() => console.log("Seeded."))
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());