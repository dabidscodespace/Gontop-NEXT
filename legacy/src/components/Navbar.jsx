// src/components/Navbar.jsx

import {
  ChevronRight,
  Crown,
  HelpCircle,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  User,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { getWalletBalance } from "../api/services/wallet";
import SearchModal from "./SearchModal";

const Navbar = () => {
  const { isAuthenticated, user, logout, openLoginPopup } = useShop();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (isAuthenticated && user?.email) {
        try {
          const data = await getWalletBalance(user.email, true);
          if (data && !data.disabled) {
            setWalletBalance(data.balance || 0);
          }
        } catch (error) {
          console.error("Failed to fetch wallet balance:", error);
        }
      }
    };

    fetchWalletBalance();

    const interval = setInterval(() => {
      if (isAuthenticated && user?.email) {
        fetchWalletBalance();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user?.email]);

  const openSearch = () => setIsSearchOpen(true);
  const closeSearch = () => setIsSearchOpen(false);

  const openMenu = () => {
    setIsMenuOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    });
  };

  const closeMenu = () => {
    setIsAnimating(false);
    setTimeout(() => setIsMenuOpen(false), 300);
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    if (isMenuOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const handleLogout = () => {
    closeMenu();
    logout();
  };

  const formatCoinBalance = (amount) => {
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + "M";
    if (amount >= 10_000) return (amount / 1_000).toFixed(1) + "K";
    return Math.floor(amount).toLocaleString();
  };

  const menuItems = [
    {
      icon: Wallet,
      label: "G Coin",
      href: "/wallet",
      subtitle: `${formatCoinBalance(walletBalance)} coins`,
    },
    {
      icon: ShoppingBag,
      label: "Orders",
      href: "/orders",
    },
    {
      icon: Settings,
      label: "Account",
      href: "/account",
    },
    {
      icon: HelpCircle,
      label: "Support",
      href: "https://m.me/gontopofficial",
    },
  ];

  const CoinBalanceCard = ({ onTopUpClick }) => (
    <div className="mt-4 bg-gradient-to-r from-accent-orange/20 to-yellow-500/20 rounded-xl p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="relative w-10 h-10">
          <img
            src="/coin.png"
            alt="G Coin"
            className="w-full h-full object-contain drop-shadow-md"
          />
        </div>
        <div>
          <p className="text-white/60 text-xs">G Coin Balance</p>
          <div className="flex items-baseline gap-1">
            <span className="text-white font-bold text-lg leading-none">
              {formatCoinBalance(walletBalance)}
            </span>
            <span className="text-white/50 text-xs">coins</span>
          </div>
        </div>
      </div>
      <Link
        to="/wallet"
        onClick={onTopUpClick}
        className="flex items-center gap-1 bg-accent-orange hover:bg-accent-orange/90 
                   text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Top Up
      </Link>
    </div>
  );

  return (
    <>
      <div className="bg-primary sticky top-0 w-full z-50">
        <nav className="flex w-full max-w-6xl mx-auto items-center justify-between py-2 px-3">
          {/* Left: Logo */}
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center text-accent-orange font-bold text-lg"
            >
              <img src="/logo.png" alt="GONTOP logo" className="h-12" />
            </Link>
            <span className="text-white hidden md:block text-lg font-normal italic">
              Great deals are guaranteed!
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Search — Desktop */}
            <button
              onClick={openSearch}
              className="hidden md:flex items-center gap-2 bg-secondary hover:bg-secondary/80 
                         text-white/70 hover:text-white rounded-lg px-3 h-10 
                         transition-colors cursor-pointer"
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">Search games...</span>
            </button>

            {/* Search — Mobile */}
            <button
              onClick={openSearch}
              className="md:hidden flex items-center justify-center w-10 h-10 
                         bg-secondary hover:bg-secondary/80 rounded-lg 
                         text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Coin pill — Desktop */}
            {isAuthenticated ? (
              <button
                onClick={openMenu}
                className="hidden md:flex items-center gap-2 bg-secondary 
                           hover:bg-secondary/80 rounded-full px-3 h-10 
                           transition-colors cursor-pointer"
              >
                <span className="text-white font-bold text-sm">
                  {formatCoinBalance(walletBalance)}
                </span>
                <div className="w-7 h-7">
                  <img
                    src="/coin.png"
                    alt="coin"
                    className="w-full h-full object-contain"
                  />
                </div>
              </button>
            ) : (
              <div className="hidden md:flex items-center justify-end bg-secondary rounded-full px-3 h-10 gap-2">
                <span className="text-white font-bold text-sm">0</span>
                <div className="w-7 h-7">
                  <img
                    src="/coin.png"
                    alt="coin"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Auth */}
            {isAuthenticated ? (
              <button
                onClick={openMenu}
                className="flex items-center justify-center w-10 h-10 md:w-auto md:h-10 
                           bg-secondary hover:bg-secondary/80 rounded-lg md:px-2 md:gap-2 
                           transition-colors cursor-pointer"
              >
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.display_name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent-orange flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
                <span className="hidden md:block text-white text-sm font-medium max-w-[100px] truncate">
                  {user?.display_name || user?.email?.split("@")[0]}
                </span>
              </button>
            ) : (
              <button
                onClick={openLoginPopup}
                className="border border-accent-orange bg-accent-orange text-white 
                           h-10 px-4 rounded-lg text-sm font-medium cursor-pointer
                           hover:bg-accent-orange/90 transition-colors"
              >
                Login
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={closeSearch} />

      {/* Menu */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeMenu}
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[998]
              transition-opacity duration-300
              ${isAnimating ? "opacity-100" : "opacity-0"}`}
          />

          {/* ── Mobile: Slide from Right ─────────────────────────────────── */}
          <div
            className={`md:hidden fixed top-0 right-0 bottom-0 z-999
              w-75 max-w-[85vw] bg-primary shadow-2xl flex flex-col
              transition-transform duration-300 ease-out
              ${isAnimating ? "translate-x-0" : "translate-x-full"}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <Link to="/" onClick={closeMenu}>
                <img src="/logo.png" alt="GONTOP" className="h-10" />
              </Link>
              <button
                onClick={closeMenu}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 
                           flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.display_name}
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-accent-orange"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-accent-orange flex items-center justify-center">
                    <User className="w-7 h-7 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-lg truncate">
                    {user?.display_name || "User"}
                  </p>
                  <p className="text-white/60 text-sm truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Coin Balance Card */}
              <CoinBalanceCard onTopUpClick={closeMenu} />
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto py-2">
              {menuItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-4 py-3.5 text-white/80 
                             hover:text-white hover:bg-white/10 transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.label}</p>
                    {item.subtitle && (
                      <p className="text-white/50 text-xs">{item.subtitle}</p>
                    )}
                  </div>
                  {item.badge && (
                    <span
                      className={`${item.badgeColor} text-white text-xs font-bold px-2 py-0.5 rounded-full`}
                    >
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </Link>
              ))}
            </div>

            {/* Logout */}
            <div className="p-4 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-3.5 
                           bg-red-500/20 hover:bg-red-500/30 text-red-400 
                           rounded-xl transition-colors font-medium"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* ── Desktop: Dropdown ────────────────────────────────────────── */}
          <div
            className={`hidden md:block fixed top-16 right-4 z-999
              transition-all duration-300 ease-out
              ${
                isAnimating
                  ? "opacity-100 translate-y-0 scale-100"
                  : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
              }`}
          >
            <div className="bg-primary rounded-2xl shadow-2xl border border-white/10 overflow-hidden w-105">
              {/* User Header */}
              <div className="p-5 border-b border-white/10">
                <div className="flex items-center gap-4">
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt={user.display_name}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-accent-orange"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-accent-orange flex items-center justify-center">
                      <User className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-lg font-bold truncate">
                      {user?.display_name || "User"}
                    </p>
                    <p className="text-white/60 text-sm truncate">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={closeMenu}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 
                               flex items-center justify-center text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Coin Balance Card */}
                <CoinBalanceCard onTopUpClick={closeMenu} />
              </div>

              {/* Menu Grid */}
              <div className="p-4 grid grid-cols-3 gap-2">
                {menuItems.map((item, index) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={closeMenu}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-xl
                      bg-white/5 hover:bg-white/10 transition-all group
                      ${
                        isAnimating
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-4"
                      }`}
                    style={{
                      transitionDelay: isAnimating
                        ? `${(index + 1) * 50}ms`
                        : "0ms",
                      transitionDuration: "300ms",
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl bg-white/10 group-hover:bg-accent-orange/20 
                                    flex items-center justify-center transition-colors"
                    >
                      <item.icon className="w-6 h-6 text-white/70 group-hover:text-accent-orange transition-colors" />
                    </div>
                    <span className="text-white/80 text-sm font-medium">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span
                        className={`absolute top-2 right-2 ${item.badgeColor} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full py-3 
                             bg-red-500/20 hover:bg-red-500/30 text-red-400 
                             rounded-xl transition-colors font-medium"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navbar;
