import { requireAdmin } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { BackendThemeProvider } from "@/components/backend-theme";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard (Phase 4) — admins only; redirects to /403 otherwise.
  const session = await requireAdmin();
  const user = {
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    image: session.user.image ?? null,
  };

  return (
    <BackendThemeProvider>
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar user={user} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </BackendThemeProvider>
  );
}
