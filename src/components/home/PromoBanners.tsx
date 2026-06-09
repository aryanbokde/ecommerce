import { BannerCard } from "./BannerCard";

// Two promo banners side by side (alternating split layout), stacking on mobile.
export function PromoBanners() {
  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-2">
          <BannerCard
            variant="split"
            subtitle="Just dropped"
            title="New Season Arrivals"
            cta="Shop new in"
            href="/products?sortBy=createdAt&sortOrder=desc"
            index={0}
          />
          <BannerCard
            variant="split"
            reverse
            subtitle="Up to 40% off"
            title="Clearance Sale"
            cta="Shop deals"
            href="/products?isFeatured=true"
            index={1}
          />
        </div>
      </div>
    </section>
  );
}
