import type { Metadata } from "next";
import type { Organization, WithContext } from "schema-dts";
import JsonLd from "@/components/shared/JsonLd";
import { HeroSlider } from "@/components/home/HeroSlider";
import { TrustStrip } from "@/components/home/TrustStrip";
import { TopCategoriesSection } from "@/components/home/TopCategoriesSection";
import { FeaturedSection } from "@/components/home/FeaturedSection";
import { PromoBanners } from "@/components/home/PromoBanners";
import { NewArrivalsSection } from "@/components/home/NewArrivalsSection";
import { BestSellersSection } from "@/components/home/BestSellersSection";
import { DealOfTheDaySection } from "@/components/home/DealOfTheDaySection";
import { BrandMarquee } from "@/components/home/BrandMarquee";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { NewsletterSection } from "@/components/home/NewsletterSection";
import { RecentlyViewed } from "@/components/store/RecentlyViewed";

const TAGLINE =
  "Quality products, fair prices, delivered to your door. Discover the latest arrivals.";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  return {
    // `absolute` opts out of the "%s | MyShop" template from the root layout.
    title: { absolute: "MyShop — Home" },
    description: TAGLINE,
    openGraph: { title: "MyShop — Home", description: TAGLINE },
  };
}

const organizationSchema: WithContext<Organization> = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MyShop",
  url: BASE_URL,
  logo: `${BASE_URL}/icon.png`,
  description: TAGLINE,
};

// Storefront home — composed of the home/* sections. Server component; each
// section self-handles its own data + Suspense/skeleton (server) or loading
// state (client). AnnouncementBar is mounted in the (store) layout, above header.
export default function StoreHomePage() {
  return (
    <>
      <JsonLd schema={organizationSchema} />

      <HeroSlider />
      <TrustStrip />
      <TopCategoriesSection />
      <FeaturedSection />
      <PromoBanners />
      <NewArrivalsSection />
      <BestSellersSection />
      <DealOfTheDaySection />
      <BrandMarquee />
      <TestimonialsSection />
      <NewsletterSection />

      {/* Client component — reads localStorage, self-skips when empty. */}
      <RecentlyViewed />
    </>
  );
}
