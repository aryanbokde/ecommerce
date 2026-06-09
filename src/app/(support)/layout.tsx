import { requireSupport } from "@/lib/auth";
import { SupportSidebar } from "@/components/support/SupportSidebar";
import { SupportTopbar } from "@/components/support/SupportTopbar";
import { BackendThemeProvider } from "@/components/backend-theme";

export default async function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard (Phase 4) — support agents only; redirects to /403 otherwise.
  const session = await requireSupport();
  const user = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
  };

  return (
    <BackendThemeProvider>
      <SupportSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <SupportTopbar user={user} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </BackendThemeProvider>
  );
}
