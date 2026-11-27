import { useState } from "react";
import "swiper/css";
import "swiper/css/pagination";
import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import banner_1 from "../assets/banner.avif";


const Slider = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = [
    { image: banner_1 },
    // { image: banner_1 },
    // { image: banner_1 },
    // { image: banner_1 },
  ];

  return (
    <div className="flex w-full flex-col items-center">
      <div className="w-full">
        <Swiper
          modules={[Autoplay, Pagination]}
          pagination={{
            clickable: true,
            el: ".custom-pagination",
          }}
          slidesPerView={1}
          autoplay={{ delay: 4000 }}
          grabCursor={true}
          onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
          // breakpoints={{
          //   0: { slidesPerView: 1 },
          //   800: { slidesPerView: 1, spaceBetween: 10 },
          //   1024: { slidesPerView: 1, spaceBetween: 10 },
          // }}
          className="w-full transition-transform duration-700 ease-in-out"
        >
          {slides.map((slide, idx) => (
            <SwiperSlide key={idx} className="flex justify-center">
              <div
                className={`relative transform overflow-hidden rounded-xl transition-transform duration-700`}
              >
                <img
                  src={slide.image}
                  alt={`banner-${idx}`}
                  className="block h-auto w-full object-contain"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className="custom-pagination mt-2 flex h-2 justify-center gap-2" />
      <style>
        {`
          .custom-pagination .swiper-pagination-bullet {
            width: 15px !important;
            height: 6px !important;
            border-radius: 2px !important;
            background: orange !important;
            opacity: 0.5 !important;
            margin: 0 !important;
            transition: all 0.3s ease;
            cursor: pointer;
          }
          .custom-pagination .swiper-pagination-bullet-active {
            width: 20px !important;
            opacity: 1 !important;
          }
        `}
      </style>
    </div>
  );
};

export default Slider;
