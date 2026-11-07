import { Sidebar } from "@/components/layout/sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 lg:pl-64">
        <div className="min-h-screen p-4 pt-16 lg:p-8 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
