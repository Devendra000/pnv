-- AlterTable
ALTER TABLE "objectives" ADD COLUMN     "category_id" TEXT;

-- CreateTable
CREATE TABLE "objective_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "objective_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "objective_categories_name_key" ON "objective_categories"("name");

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "objective_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
