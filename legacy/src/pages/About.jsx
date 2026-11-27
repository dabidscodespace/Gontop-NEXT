import Marquee from "react-fast-marquee";
import { useState, useEffect, useRef } from "react";
import banner_1 from "../assets/banner.avif";
import bKash from "../assets/Bkash.png";
import Nagad from "../assets/Nagad.png";
import Rocket from "../assets/rocket.png";
import SEO from "../components/SEO";

const SHARE_URL = "https://gontop.app";
const SHARE_TEXT =
  "🔥 Check out GONTOP — Buy UC, MLBB Diamonds & game top-ups at the cheapest price!";

const About = () => {
  const [showContact, setShowContact] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareClosing, setShareClosing] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareRef = useRef(null);

  const openShare = () => {
    setShowShare(true);
    setShareClosing(false);
  };

  const closeShare = () => {
    setShareClosing(true);
    setTimeout(() => {
      setShowShare(false);
      setShareClosing(false);
    }, 300);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(SHARE_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Lock body scroll
  useEffect(() => {
    if (showContact || showShare) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showContact, showShare]);

  // Swipe down to close share modal
  useEffect(() => {
    if (!showShare || !shareRef.current) return;

    let startY = 0;
    const el = shareRef.current;

    const onTouchStart = (e) => {
      startY = e.touches[0].clientY;
    };

    const onTouchEnd = (e) => {
      const diff = e.changedTouches[0].clientY - startY;
      if (diff > 80) closeShare();
    };

    el.addEventListener("touchstart", onTouchStart);
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [showShare]);

  return (
    <>
      <SEO
        title="About Us"
        description="GONTOP is Bangladesh's most trusted game top-up platform. Buy PUBG UC, Mobile Legends Diamonds, Free Fire Diamonds and more. Instant delivery with bKash, Nagad & Rocket."
        keywords="gontop about, game top up bangladesh, trusted game top up, gontop.app"
        url="https://gontop.app/about"
      />
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        {/* Inline keyframes for Tailwind v4 */}
        <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out forwards;
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.2s ease-out forwards;
        }
      `}</style>

        <div className="max-w-7xl mx-auto px-4 pb-20">
          {/* Header */}
          <header className="pt-8">
            <img src="/logo.png" className="h-20" alt="GONTOP logo" />
            <p className="text-lg text-gray-600">Great deals are guaranteed!</p>
          </header>

          {/* Promo Section */}
          <section className="mt-10 bg-white rounded-3xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="md:flex md:items-center md:gap-10 md:p-10">
              <div className="md:w-1/2 p-3">
                <img
                  src={banner_1}
                  alt="GONTOP promotional banner"
                  className="rounded-2xl w-full object-cover shadow-md"
                />
              </div>

              <div className="md:w-1/2 p-3 md:p-0 space-y-6">
                <div className="text-center md:text-left">
                  <h2 className="text-sm md:text-base text-[#ff6600] uppercase tracking-widest font-bold mb-2">
                    GONTOP
                  </h2>
                  <h3 className="text-lg md:text-3xl font-bold leading-snug mb-2 text-gray-900">
                    A Top‑Up Platform With Great Deals
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600">
                    Trusted by gamers around the world.
                  </p>
                </div>

                <div className="space-y-2 py-2">
                  <Marquee speed={40} gradient={false}>
                    {REVIEWS_ROW_1.map((text, idx) => (
                      <ReviewCard key={idx} text={text} />
                    ))}
                  </Marquee>
                  <Marquee speed={40} direction="right" gradient={false}>
                    {REVIEWS_ROW_2.map((text, idx) => (
                      <ReviewCard key={idx} text={text} />
                    ))}
                  </Marquee>
                </div>

                <div>
                  <a
                    href="https://www.facebook.com/gontopofficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-gradient-to-r from-[#ff6600] to-[#ff8833] text-white font-semibold text-sm md:text-base py-3 rounded-full shadow-lg hover:shadow-xl hover:brightness-110 transition duration-200 text-center"
                  >
                    Join Our Facebook Community
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Payment Methods */}
          <section className="mt-8 bg-white rounded-3xl px-6 py-8 md:py-12 border border-gray-200 shadow-lg">
            <h3 className="text-lg md:text-2xl font-bold uppercase text-gray-800 tracking-wide mb-8">
              Payment Methods
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6 md:gap-10 place-items-center">
              {PAYMENT_METHODS.map((method) => (
                <PaymentCard
                  key={method.name}
                  src={method.src}
                  name={method.name}
                />
              ))}
            </div>
          </section>

          {/* Navigation Links */}
          <section className="mt-8 bg-white rounded-3xl px-6 py-8 border border-gray-200 shadow-lg">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Contact Us — existing */}
              <button
                onClick={() => setShowContact(true)}
                className="w-full text-left"
              >
                <NavLinkCard
                  label="Contact Us"
                  description="Get in touch via WhatsApp"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 10.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l2.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
                      />
                    </svg>
                  }
                />
              </button>

              {/* ✅ NEW — Follow on Instagram */}
              <a
                href="https://www.instagram.com/gontopofficial"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <NavLinkCard
                  label="Follow us on Instagram"
                  description="Stay updated with our latest deals"
                  icon={
                    <svg
                      className="w-6 h-6"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                  }
                />
              </a>

              {/* Share — existing */}
              <button onClick={openShare} className="w-full text-left">
                <NavLinkCard
                  label="Share"
                  description="Share GONTOP with friends"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                  }
                />
              </button>

              {/* Privacy Policy — existing */}
              <a href="#" className="w-full">
                <NavLinkCard
                  label="Privacy Policy"
                  description="Read our privacy policy"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  }
                />
              </a>
            </div>
          </section>

          {/* Footer */}
          <footer className="text-center text-xs md:text-sm text-gray-500 mt-14 pb-4 tracking-wide">
            © {new Date().getFullYear()} GONTOP. All rights reserved.
          </footer>
        </div>

        {/* ===== Contact Modal ===== */}
        {showContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
              onClick={() => setShowContact(false)}
            />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 z-10 animate-scale-in">
              <button
                onClick={() => setShowContact(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center shadow-md">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-9 h-9 text-green-500"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                Contact Us
              </h3>
              <p className="text-sm text-gray-600 text-center mb-6 leading-relaxed">
                If you face any issues with our website or have any
                order‑related concerns, you can contact us through WhatsApp for
                assistance. We're here to help!
              </p>

              <a
                href="https://wa.me/+8801648338771"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full bg-green-500 hover:bg-green-600 text-white font-semibold text-base py-3 rounded-full shadow-lg hover:shadow-xl transition duration-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Chat on WhatsApp
              </a>

              <button
                onClick={() => setShowContact(false)}
                className="mt-3 w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ===== Share Modal (Slide In / Out) ===== */}
        {showShare && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
              style={{ opacity: shareClosing ? 0 : 1 }}
              onClick={closeShare}
            />

            {/* Panel */}
            <div
              ref={shareRef}
              className="relative bg-white rounded-t-3xl shadow-2xl w-full max-w-lg z-10 transition-transform duration-300 ease-out"
              style={{
                transform: shareClosing ? "translateY(100%)" : "translateY(0)",
                animation: !shareClosing ? "slideUp 0.3s ease-out" : "none",
              }}
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
              </div>

              <div className="px-6 pb-8 pt-4">
                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 text-center mb-1">
                  Share GONTOP
                </h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                  Tell your squad about the cheapest UC & Diamonds 💎
                </p>

                {/* Share Grid */}
                <div className="grid grid-cols-4 gap-5 mb-6">
                  {/* Facebook */}
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md group-hover:scale-110 group-active:scale-95 transition-transform duration-200">
                      <svg
                        className="w-7 h-7 text-white"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      Facebook
                    </span>
                  </a>

                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(SHARE_TEXT + " " + SHARE_URL)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center shadow-md group-hover:scale-110 group-active:scale-95 transition-transform duration-200">
                      <svg
                        className="w-7 h-7 text-white"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      WhatsApp
                    </span>
                  </a>

                  {/* Messenger */}
                  <a
                    href={`fb-messenger://share/?link=${encodeURIComponent(SHARE_URL)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center shadow-md group-hover:scale-110 group-active:scale-95 transition-transform duration-200">
                      <svg
                        className="w-7 h-7 text-white"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8.2l3.131 3.259L19.752 8.2l-6.561 6.763z" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      Messenger
                    </span>
                  </a>

                  {/* Copy Link */}
                  <button
                    onClick={handleCopyLink}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 group-active:scale-95 transition-all duration-200"
                      style={{
                        backgroundColor: copied ? "#22c55e" : "#374151",
                      }}
                    >
                      {copied ? (
                        <svg
                          className="w-7 h-7 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-7 h-7 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      {copied ? "Copied!" : "Copy Link"}
                    </span>
                  </button>
                </div>

                {/* URL Bar */}
                <div className="flex items-center bg-gray-100 rounded-xl px-4 py-3 mb-4 border border-gray-200">
                  <svg
                    className="w-5 h-5 text-gray-400 flex-shrink-0 mr-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"
                    />
                  </svg>
                  <span className="text-sm text-gray-600 truncate flex-1">
                    {SHARE_URL}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="ml-3 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
                    style={{
                      backgroundColor: copied ? "#dcfce7" : "#fff7ed",
                      color: copied ? "#16a34a" : "#ea580c",
                    }}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>

                {/* Cancel */}
                <button
                  onClick={closeShare}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 py-3 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

/* ===== Constants ===== */
const REVIEWS_ROW_1 = [
  "Really love this platform!",
  "Fast and convenient top‑ups 🔥",
  "UI looks smooth and modern!",
  "Trusted site for all my games 💎",
  "Always the best deals!",
];

const REVIEWS_ROW_2 = [
  "Excellent service 👏",
  "GONTOP is my go‑to for top‑ups!",
  "Highly recommend to gamers!",
  "Cheaper than anywhere else 💰",
  "Love the Facebook community ❤️",
];

const PAYMENT_METHODS = [
  { src: bKash, name: "bKash" },
  { src: Nagad, name: "Nagad" },
  { src: Rocket, name: "Rocket" },
];

/* ===== Reusable Components ===== */
const ReviewCard = ({ text }) => (
  <div className="flex items-center bg-gray-100 border border-gray-200 rounded-full px-4 py-2 mx-2 shrink-0 text-gray-700 whitespace-nowrap shadow-sm hover:shadow-md transition-shadow">
    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 mr-2 flex-shrink-0" />
    <span className="text-sm font-medium">{text}</span>
  </div>
);

const PaymentCard = ({ src, name }) => (
  <div className="relative bg-white rounded-2xl w-full max-w-[120px] aspect-[3/2] flex items-center justify-center p-4 border border-gray-200 hover:border-orange-400 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md">
    <img
      src={src}
      alt={`${name} payment method`}
      className="max-h-full max-w-full object-contain"
      loading="lazy"
    />
  </div>
);

const NavLinkCard = ({ label, icon, description }) => (
  <div className="group flex items-center gap-4 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-400 rounded-2xl px-5 py-4 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
    <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-200">
      {icon}
    </div>
    <div>
      <p className="text-sm md:text-base font-semibold text-gray-800 group-hover:text-orange-600 transition-colors duration-200">
        {label}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    </div>
    <div className="ml-auto text-gray-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all duration-200">
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </div>
);

export default About;
