import { requireAuth } from "@/lib/auth";
import { StorefrontHeader } from "@/components/layout/StorefrontHeader";
import { StorefrontFooter } from "@/components/layout/StorefrontFooter";
import { CartDrawer } from "@/components/shared/CartDrawer";
import { getStoreConfig } from "@/server/services/settings.service";

// Shopping area (checkout, orders, profile). Open to ANY signed-in user — every
// role can buy/checkout (no purchase restriction). Wrapped in the storefront
// shell so the header (account/logout menu) and footer stay consistent through
// the shopping flow. Logged-out visitors are sent to /login by requireAuth.
export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  const config = await getStoreConfig().catch(() => null);
  return (
    <div className="flex min-h-screen flex-col">
      <StorefrontHeader
        storeName={config?.storeName}
        storeLogo={config?.storeLogo || undefined}
      />
      <main className="flex-1">{children}</main>
      <StorefrontFooter
        storeName={config?.storeName}
        storeAddress={config?.storeAddress}
        socialLinks={config?.socialLinks}
      />
      <CartDrawer />
    </div>
  );
}
