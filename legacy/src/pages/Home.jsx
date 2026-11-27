import { useCallback, useEffect, useRef, useState } from "react";
import "swiper/css";
import "swiper/css/free-mode";
import { FreeMode } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import PopularGames from "../components/PopularGames";
import ProductSection from "../components/ProductSection";
import Slider from "../components/Slider";
import Title from "../components/Title";
import { HomepageProvider } from "../context/HomepageContext";
import SEO from "../components/SEO";

const SECTION_CONFIG = {
  mobileGame: {
    categoryId: 113,
    extraCategoryIds: [53],
    title: "Mobile Games",
    description: "Top mobile games for on-the-go gaming",
    titleColor: "text-black",
    gif: "/fire.gif",
  },
  // pcGame: {
  //   categoryId: 113,
  //   extraCategoryIds: [],
  //   title: "PC Game",
  //   description: "Best PC games for ultimate experience",
  //   titleColor: "text-black",
  //   gif: "/fire.gif",
  // },
  // entertainment: {
  //   categoryId: 113,
  //   extraCategoryIds: [],
  //   title: "Entertainment",
  //   description: "Streaming and entertainment services",
  //   titleColor: "text-black",
  //   gif: "/fire.gif",
  // },
  // voucher: {
  //   categoryId: 113,
  //   extraCategoryIds: [],
  //   title: "Voucher",
  //   description: "Gift cards and vouchers for all platforms",
  //   titleColor: "text-black",
  //   gif: "/fire.gif",
  // },
  // others: {
  //   categoryId: 113,
  //   extraCategoryIds: [],
  //   title: "Others",
  //   description: "More products you might like",
  //   titleColor: "text-black",
  //   gif: "/fire.gif",
  // },
};

const NAV_PILLS = [
  // { id: "popular", label: "Popular", emoji: "🔥" },
  { id: "mobile-game", label: "Mobile Games", emoji: "📱" },
  // { id: "pc-game", label: "PC Game", emoji: "🖥️" },
  // { id: "entertainment", label: "Entertainment", emoji: "🎬" },
  // { id: "voucher", label: "Voucher", emoji: "🎟️" },
  // { id: "others", label: "Others", emoji: "📦" },
];

const SCROLL_DEBOUNCE_MS = 120;

const HomeContent = () => {
  const popularRef = useRef(null);
  const mobileGameRef = useRef(null);
  const pcGameRef = useRef(null);
  const entertainmentRef = useRef(null);
  const voucherRef = useRef(null);
  const othersRef = useRef(null);
  const navPillsRef = useRef(null);
  const navSwiperRef = useRef(null);
  const scrollEndTimerRef = useRef(null);

  const sectionRefsMap = useRef({
    popular: popularRef,
    "mobile-game": mobileGameRef,
    "pc-game": pcGameRef,
    entertainment: entertainmentRef,
    voucher: voucherRef,
    others: othersRef,
  });

  const [activePill, setActivePill] = useState("mobile-game");
  const [pillsVisible, setPillsVisible] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  const sectionBgStyle = {
    backgroundImage: "url('/swiper_bg.svg')",
  };

  const sectionBgClasses = "bg-cover bg-center bg-repeat-y";

  const getSectionEl = useCallback((id) => {
    return sectionRefsMap.current[id]?.current || null;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPillsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const getOffset = useCallback(() => {
    const navPillsHeight = navPillsRef.current?.offsetHeight || 60;
    return 64 + navPillsHeight + 10;
  }, []);

  const scrollToSection = useCallback(
    (id, index) => {
      const el = getSectionEl(id);
      if (!el) return;

      setActivePill(id);
      setIsAutoScrolling(true);

      if (navSwiperRef.current) {
        navSwiperRef.current.slideTo(index);
      }

      const top = el.getBoundingClientRect().top + window.scrollY - getOffset();
      window.scrollTo({ top, behavior: "smooth" });
    },
    [getOffset, getSectionEl],
  );

  useEffect(() => {
    if (!isAutoScrolling) return;

    const onScroll = () => {
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = setTimeout(
        () => setIsAutoScrolling(false),
        SCROLL_DEBOUNCE_MS,
      );
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    };
  }, [isAutoScrolling]);

  useEffect(() => {
    let currentActive = activePill;

    const handleSpy = () => {
      if (isAutoScrolling) return;

      const probeY = window.scrollY + getOffset() + 10;

      for (let i = 0; i < NAV_PILLS.length; i++) {
        const { id } = NAV_PILLS[i];
        const el = getSectionEl(id);
        if (!el) continue;

        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;

        if (probeY >= top && probeY < bottom) {
          if (currentActive !== id) {
            currentActive = id;
            setActivePill(id);
          }
          break;
        }
      }
    };

    handleSpy();
    window.addEventListener("scroll", handleSpy, { passive: true });
    window.addEventListener("resize", handleSpy);

    return () => {
      window.removeEventListener("scroll", handleSpy);
      window.removeEventListener("resize", handleSpy);
    };
  }, [isAutoScrolling, activePill, getOffset, getSectionEl]);

  useEffect(() => {
    const swiper = navSwiperRef.current;
    if (!swiper) return;

    const index = NAV_PILLS.findIndex((item) => item.id === activePill);
    if (index >= 0) swiper.slideTo(index, 250);
  }, [activePill]);

  return (
    <>
      <SEO
        title="Best Game Top-Up Store in Bangladesh"
        description="GONTOP is Bangladesh's most trusted game top-up platform. Buy PUBG UC, Mobile Legends Diamonds, Free Fire Diamonds and more at the cheapest price. Instant delivery with bKash, Nagad & Rocket."
        keywords="buy UC bangladesh, PUBG UC bd, MLBB diamonds bangladesh, mobile legends top up, free fire diamonds bd, game top up bangladesh, cheap UC, gontop, top up bd"
        url="https://gontop.app"
      />
      <div>
        {/* Hero / Slider Section */}
        <section
          className={`${sectionBgClasses} pt-2 pb-3 md:pb-6`}
          style={sectionBgStyle}
        >
          <div className="max-w-6xl mx-auto px-3">
            <Slider />
          </div>
        </section>

        {/* Navigation Pills with Swiper */}
        <nav
          ref={navPillsRef}
          className="sticky top-16 z-40 py-1"
          style={sectionBgStyle}
        >
          <div className="max-w-6xl mx-auto px-3 overflow-hidden">
            <Swiper
              modules={[FreeMode]}
              freeMode={true}
              slidesPerView="auto"
              spaceBetween={12}
              onSwiper={(swiper) => {
                navSwiperRef.current = swiper;
              }}
              className="!overflow-visible"
            >
              {NAV_PILLS.map((pill, index) => {
                const isActive = activePill === pill.id;

                return (
                  <SwiperSlide key={pill.id} className="!w-auto">
                    <button
                      onClick={() => scrollToSection(pill.id, index)}
                      style={{
                        transitionDelay: pillsVisible
                          ? `${index * 100}ms`
                          : "0ms",
                      }}
                      className={`
                      flex items-center gap-2 px-4 py-2 rounded-md 
                      border border-dashed text-sm font-medium cursor-pointer
                      whitespace-nowrap transition-all duration-500 ease-out
                      ${
                        pillsVisible
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-8"
                      }
                      ${
                        isActive
                          ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30"
                          : "bg-white border-gray-600 text-gray-600 hover:border-orange-400 hover:text-orange-500"
                      }
                    `}
                    >
                      {pill.label}
                      <span>{pill.emoji}</span>
                    </button>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>
        </nav>

        {/* Popular Section */}
        {/* <section
        ref={popularRef}
        id="popular"
        className={`${sectionBgClasses} scroll-mt-32`}
        style={sectionBgStyle}
      >
        <div className="max-w-6xl mx-auto px-3">
          <Title
            desc={"Some of the most popular products today."}
            size="text-2xl"
            name={"Popular"}
            gif={"/fire.gif"}
            color="text-black"
          />
          <PopularGames />
        </div>
      </section> */}

        {/* Mobile Game Section */}
        <section
          ref={mobileGameRef}
          id="mobile-game"
          className={`${sectionBgClasses} scroll-mt-32`}
          style={sectionBgStyle}
        >
          <div className="max-w-6xl mx-auto px-3">
            <ProductSection {...SECTION_CONFIG.mobileGame} />
          </div>
        </section>

        {/* PC Game Section */}
        {/* <section
        ref={pcGameRef}
        id="pc-game"
        className={`${sectionBgClasses} scroll-mt-32`}
        style={sectionBgStyle}
      >
        <div className="max-w-6xl mx-auto px-3">
          <ProductSection {...SECTION_CONFIG.pcGame} />
        </div>
      </section> */}

        {/* Entertainment Section */}
        {/* <section
        ref={entertainmentRef}
        id="entertainment"
        className={`${sectionBgClasses} scroll-mt-32`}
        style={sectionBgStyle}
      >
        <div className="max-w-6xl mx-auto px-3">
          <ProductSection {...SECTION_CONFIG.entertainment} />
        </div>
      </section> */}

        {/* Voucher Section */}
        {/* <section
        ref={voucherRef}
        id="voucher"
        className={`${sectionBgClasses} scroll-mt-32`}
        style={sectionBgStyle}
      >
        <div className="max-w-6xl mx-auto px-3">
          <ProductSection {...SECTION_CONFIG.voucher} />
        </div>
      </section> */}

        {/* Others Section */}
        {/* <section
        ref={othersRef}
        id="others"
        className={`${sectionBgClasses} scroll-mt-32`}
        style={sectionBgStyle}
      >
        <div className="max-w-6xl mx-auto px-3">
          <ProductSection {...SECTION_CONFIG.others} />
        </div>
      </section> */}
      </div>
    </>
  );
};

const Home = () => {
  return (
    <HomepageProvider>
      <HomeContent />
    </HomepageProvider>
  );
};

export default Home;
