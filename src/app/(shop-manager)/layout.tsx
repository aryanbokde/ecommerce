import { requireShopManager } from "@/lib/auth";
import { ManagerSidebar } from "@/components/manager/ManagerSidebar";
import { ManagerTopbar } from "@/components/manager/ManagerTopbar";
import { BackendThemeProvider } from "@/components/backend-theme";

export default async function ShopManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard (Phase 4) — shop managers only; redirects to /403 otherwise.
  const session = await requireShopManager();
  const user = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
  };

  return (
    <BackendThemeProvider>
      <ManagerSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ManagerTopbar user={user} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </BackendThemeProvider>
  );
}
