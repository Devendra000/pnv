/*
  Warnings:

  - A unique constraint covering the columns `[root_folder_id]` on the table `companies` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "root_folder_id" TEXT;

-- AlterTable
ALTER TABLE "generated_documents" ADD COLUMN     "folder_id" TEXT;

-- CreateTable
CREATE TABLE "company_folders" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "parent_folder_id" TEXT,
    "name" TEXT NOT NULL DEFAULT 'Documents',
    "path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_folders_path_key" ON "company_folders"("path");

-- CreateIndex
CREATE INDEX "company_folders_company_id_idx" ON "company_folders"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_root_folder_id_key" ON "companies"("root_folder_id");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_root_folder_id_fkey" FOREIGN KEY ("root_folder_id") REFERENCES "company_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_folders" ADD CONSTRAINT "company_folders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_folders" ADD CONSTRAINT "company_folders_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "company_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "company_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
