-- AlterTable
ALTER TABLE "company_owners" ADD COLUMN     "owner_role_id" TEXT;

-- CreateTable
CREATE TABLE "owner_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owner_roles_name_key" ON "owner_roles"("name");

-- AddForeignKey
ALTER TABLE "company_owners" ADD CONSTRAINT "company_owners_owner_role_id_fkey" FOREIGN KEY ("owner_role_id") REFERENCES "owner_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
