import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Navbar session={session} />
      <div className="flex flex-1 min-h-0 overflow-hidden pt-16">
        <Sidebar session={session} />
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
