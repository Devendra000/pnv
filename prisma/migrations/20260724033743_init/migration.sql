-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('SINGLE', 'MULTIPLE');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "english_name" TEXT NOT NULL,
    "nepali_name" TEXT NOT NULL,
    "owner_type" "OwnerType" NOT NULL DEFAULT 'SINGLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_owners" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "father_name" TEXT,
    "address" TEXT,
    "citizenship" TEXT,
    "jari_jilla" TEXT,
    "citizenship_jari_date" TEXT,
    "phone_number" TEXT,
    "shares" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "company_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_witnesses" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "citizenship" TEXT,
    "jari_jilla" TEXT,
    "citizenship_jari_date" TEXT,
    "phone_number" TEXT,
    "owner_index" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "company_witnesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objective_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "objective_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objectives" (
    "id" TEXT NOT NULL,
    "category_id" TEXT,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_objectives" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "source_objective_id" TEXT,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "company_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variables" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',

    CONSTRAINT "variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_variable_values" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "variable_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "company_variable_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "docx_url" TEXT NOT NULL,
    "pdf_url" TEXT,
    "variables" JSONB,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "objective_categories_name_key" ON "objective_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "variables_key_key" ON "variables"("key");

-- CreateIndex
CREATE UNIQUE INDEX "company_variable_values_company_id_variable_id_key" ON "company_variable_values"("company_id", "variable_id");

-- AddForeignKey
ALTER TABLE "company_owners" ADD CONSTRAINT "company_owners_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_witnesses" ADD CONSTRAINT "company_witnesses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "objective_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_objectives" ADD CONSTRAINT "company_objectives_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_variable_values" ADD CONSTRAINT "company_variable_values_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_variable_values" ADD CONSTRAINT "company_variable_values_variable_id_fkey" FOREIGN KEY ("variable_id") REFERENCES "variables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
