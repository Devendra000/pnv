import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

type CompanyWithOwners = Prisma.CompanyGetPayload<{
  include: { owners: true };
}>;

export default async function Home() {
  const companies = await prisma.company.findMany({
    include: { owners: true },
    orderBy: { createdAt: "desc" },
  });

  const objectiveCount = await prisma.objective.count();

  return (
    <main className="min-h-screen p-10">
      <h1 className="text-2xl font-bold mb-2">Company Doc Generator</h1>
      <p className="text-sm text-gray-500 mb-8">
        {companies.length} companies · {objectiveCount} master objectives
      </p>

      <div className="space-y-4">
        {companies.length === 0 && (
          <p className="text-gray-400">No companies yet.</p>
        )}
        {companies.map((company: CompanyWithOwners) => (
          <div key={company.id} className="border rounded-lg p-4">
            <div className="font-medium">{company.name}</div>
            <div className="text-sm text-gray-500">
              {company.ownerType} · {company.owners.length} owner
              {company.owners.length !== 1 ? "s" : ""}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
