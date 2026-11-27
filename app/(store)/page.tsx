import { BannerCarousel } from "@/components/store/banner-carousel";
import { CategoryShowcase } from "@/components/store/category-showcase";
import { getStorefront } from "@/lib/services/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { banners, categories } = await getStorefront();

  return (
    <>
      <section
        className="bg-cover bg-center bg-repeat-y pb-3 pt-2 md:pb-6"
        style={{ backgroundImage: "url('/swiper_bg.svg')" }}
        aria-label="Promotions"
      >
        <div className="mx-auto max-w-6xl px-3">
          {banners.length > 0 ? (
            <BannerCarousel
              banners={banners.map((banner) => ({
                id: banner.id,
                title: banner.title,
                description: banner.description,
                image: banner.image,
                link: banner.link,
              }))}
            />
          ) : (
            <img
              src="/assets/banner.avif"
              alt="GONTOP game top-ups"
              className="w-full rounded-xl object-contain"
            />
          )}
        </div>
      </section>

      <CategoryShowcase categories={categories} />
    </>
  );
}
