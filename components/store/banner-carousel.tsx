"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Banner = {
  id: number;
  title: string;
  description: string;
  image: string;
  link: string | null;
};

export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setIndex((current) => (banners.length ? (current + 1) % banners.length : 0));
  }, [banners.length]);

  useEffect(() => {
    if (banners.length < 2 || paused) return;
    const timer = window.setInterval(next, 5000);
    return () => window.clearInterval(timer);
  }, [banners.length, next, paused]);

  if (banners.length === 0) return null;

  return (
    <div
      className="flex w-full flex-col items-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="w-full overflow-hidden rounded-xl">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {banners.map((banner) => {
            const image = (
              <img
                src={banner.image}
                alt={banner.title || "GONTOP promotion"}
                className="block h-auto w-full object-contain"
                loading="lazy"
                decoding="async"
              />
            );

            return (
              <div key={banner.id} className="w-full shrink-0">
                {banner.link ? (
                  banner.link.startsWith("http") ? (
                    <a href={banner.link} target="_blank" rel="noreferrer">
                      {image}
                    </a>
                  ) : (
                    <Link href={banner.link}>{image}</Link>
                  )
                ) : (
                  image
                )}
              </div>
            );
          })}
        </div>
      </div>

      {banners.length > 1 && (
        <div className="mt-2 flex h-2 justify-center gap-2">
          {banners.map((banner, dotIndex) => (
            <button
              key={banner.id}
              onClick={() => setIndex(dotIndex)}
              aria-label={`Go to banner ${dotIndex + 1}`}
              className={`h-1.5 rounded-sm bg-orange-500 transition-all ${
                dotIndex === index ? "w-5 opacity-100" : "w-3.5 opacity-50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
