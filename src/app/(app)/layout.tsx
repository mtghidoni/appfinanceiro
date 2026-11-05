import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";
import MobileTabs from "@/components/layout/MobileTabs";
import { ToastProvider } from "@/components/ui/Toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <ToastProvider>
      <div className="flex h-dvh overflow-hidden">
        <Sidebar userEmail={user.email ?? ""} />
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
          <MobileTabs />
        </main>
      </div>
    </ToastProvider>
  );
}
