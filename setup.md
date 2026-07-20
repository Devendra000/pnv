Here's the full Phase 1 setup, step by step.

1. Scaffold the Next.js app
bash
npx create-next-app@latest company-doc-generator

Prompts to choose:

TypeScript → Yes
ESLint → Yes
Tailwind CSS → Yes (optional, but useful for the dynamic forms)
src/ directory → Yes
App Router → Yes
Import alias (@/*) → Yes, default
bash
cd company-doc-generator

===================== DONE ==============================

2. Install dependencies
bash
npm install prisma @prisma/client --save
npm install docxtemplater pizzip
npm install -D @types/node

=====================DONE==============================


3. Set up Prisma + PostgreSQL
bash
npx prisma init

This creates prisma/schema.prisma and a .env file with:

DATABASE_URL="postgresql://user:password@localhost:5432/company_doc_generator?schema=public"

Update DATABASE_URL with your actual local Postgres credentials (create the DB first: createdb company_doc_generator or via psql).

=====================DONE==============================

4. Define the Prisma schema

Replace the contents of prisma/schema.prisma:

prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum OwnerType {
  SINGLE
  MULTIPLE
}

model Company {
  id               String              @id @default(cuid())
  name             String
  ownerType        OwnerType           @default(SINGLE)
  registrationDate DateTime?
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  owners           CompanyOwner[]
  witnesses        CompanyWitness[]
  objectives       CompanyObjective[]
  documents        GeneratedDocument[]
}

model CompanyOwner {
  id              String   @id @default(cuid())
  companyId       String
  company         Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  name            String
  address         String?
  sharePercentage Float?
  order           Int      @default(0)
}

model CompanyWitness {
  id        String   @id @default(cuid())
  companyId String
  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  name      String
  address   String?
  order     Int      @default(0)
}

model Objective {
  id        String   @id @default(cuid())
  text      String
  createdAt DateTime @default(now())
}

model CompanyObjective {
  id                String   @id @default(cuid())
  companyId         String
  company           Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  sourceObjectiveId String?
  text              String
  order             Int      @default(0)
}

model Variable {
  id    String @id @default(cuid())
  key   String @unique
  label String
  type  String @default("text") // text | date | number | list
}

model Template {
  id        String   @id @default(cuid())
  name      String
  fileUrl   String
  createdAt DateTime @default(now())

  documents GeneratedDocument[]
}

model GeneratedDocument {
  id          String   @id @default(cuid())
  templateId  String
  template    Template @relation(fields: [templateId], references: [id])
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id])
  docxUrl     String
  pdfUrl      String?
  generatedAt DateTime @default(now())
}

=====================DONE==============================

5. Run the initial migration
bash
npx prisma migrate dev --name init

This creates the tables and generates the Prisma Client.

Verify it worked:

bash
npx prisma studio

(opens a local GUI to browse the empty tables)

=====================DONE==============================

6. Set up local /uploads storage

Since we're using a local directory for now:

bash
mkdir -p public/uploads/templates
mkdir -p public/uploads/generated

Add a .gitignore entry so uploaded files don't get committed:

# .gitignore
/public/uploads/*
!/public/uploads/.gitkeep
bash
touch public/uploads/templates/.gitkeep
touch public/uploads/generated/.gitkeep

Create a small helper for saving uploaded files, src/lib/storage.ts:

ts
import { writeFile } from "fs/promises";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

export async function saveFile(
  buffer: Buffer,
  subdir: "templates" | "generated",
  filename: string
): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, subdir);
  const filePath = path.join(dir, filename);
  await writeFile(filePath, buffer);
  // Public URL path, since it's served from /public
  return `/uploads/${subdir}/${filename}`;
}

Note: placing uploads under public/ makes them directly downloadable via URL, which is convenient for .docx/.pdf links but means anyone with the link can access them — fine for an internal tool, but worth keeping in mind if this ever needs access control.

=====================DONE==============================

7. Prisma Client singleton

Create src/lib/prisma.ts (avoids exhausting connections in dev with hot reload):

ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

=====================DONE==============================

8. Sanity check
bash
npm run dev

At this point you have: a running Next.js app, a connected Postgres DB with the full schema migrated, and /uploads folders ready for templates and generated docs.