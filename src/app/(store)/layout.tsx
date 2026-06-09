import { StorefrontHeader } from "@/components/layout/StorefrontHeader";
import { StorefrontFooter } from "@/components/layout/StorefrontFooter";
import { CartDrawer } from "@/components/shared/CartDrawer";
import { AnnouncementBar } from "@/components/home/AnnouncementBar";
import { getStoreConfig } from "@/server/services/settings.service";

// Render dynamically so admin branding changes (StoreSetting) show immediately
// rather than being baked into the static home route. getStoreConfig is memoised
// 60s, so the per-request DB cost is negligible.
export const dynamic = "force-dynamic";

// Storefront shell — wraps every public store page. Server component, no auth
// check: these pages are fully public. Branding (name/logo/address/socials) is
// read from StoreSetting so admin changes flow through to the storefront.
export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getStoreConfig().catch(() => null);

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
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
      {/* Mounted once; controlled by the useCart store (opened by Add-to-Cart). */}
      <CartDrawer />
    </div>
  );
}
