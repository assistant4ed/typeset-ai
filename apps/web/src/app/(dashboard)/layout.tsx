import { Sidebar } from "@/components/sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main
        id="main-content"
        className="flex-1 overflow-y-auto bg-gray-50"
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
