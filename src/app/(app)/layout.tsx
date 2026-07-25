import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Navbar />
      <div className="flex flex-1 min-h-0 overflow-hidden pt-16">
        <Sidebar />
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
