import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen bg-background">
      <Navbar />
      <div className="flex h-[calc(100vh)] pt-16">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
