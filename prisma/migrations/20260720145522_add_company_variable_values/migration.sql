-- CreateTable
CREATE TABLE "company_variable_values" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "variable_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "company_variable_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_variable_values_company_id_variable_id_key" ON "company_variable_values"("company_id", "variable_id");

-- AddForeignKey
ALTER TABLE "company_variable_values" ADD CONSTRAINT "company_variable_values_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_variable_values" ADD CONSTRAINT "company_variable_values_variable_id_fkey" FOREIGN KEY ("variable_id") REFERENCES "variables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
