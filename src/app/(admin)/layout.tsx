import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { getErrorStats } from "@/server/services/error-log.service";
import AdminSidebarNav from "./_components/AdminSidebarNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const unresolvedErrors = await getErrorStats()
    .then((s) => s.unresolved)
    .catch(() => 0);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r bg-card">
        <div className="flex items-center gap-2 px-6 py-4">
          <ShoppingCart className="size-5 text-primary" />
          <Link
            href="/dashboard"
            className="text-base font-semibold tracking-tight hover:text-primary"
          >
            Admin Panel
          </Link>
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto">
          <AdminSidebarNav unresolvedErrors={unresolvedErrors} />
        </div>
        <Separator />
        <div className="px-4 py-3 text-xs text-muted-foreground">
          MyShop Admin v{process.env.npm_package_version ?? "0.1.0"}
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center border-b px-6">
          <p className="text-sm text-muted-foreground">
            Logged in as <span className="font-medium text-foreground">Admin</span>
          </p>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
