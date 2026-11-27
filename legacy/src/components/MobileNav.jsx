import { ClockArrowUp, Gem, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";


export default function MobileNav() {
  const { pathname } = useLocation();

  // Check if path is active
  const isActive = (path) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  // Dynamic class based on active state
  const linkClass = (path) =>
    `w-12 h-12 flex items-center justify-center rounded-full transition ${
      isActive(path)
        ? "bg-orange-500 text-white shadow-md"
        : "text-gray-300 hover:text-white"
    }`;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 
                 bg-primary/70 px-6 py-3 rounded-full flex items-center justify-between 
                 w-70 shadow-lg backdrop-blur-md z-50"
    >
      {/* Home */}
      <Link to="/" className={linkClass("/")}>
        <img src="/home.png"  alt="" />
      </Link>

      {/* Orders */}
      <Link to="/orders" className={linkClass("/orders")}>
        <img src="/order.png" alt="" />
      </Link>

      {/* Contact */}
      <Link to="/about" className={linkClass("/about")}>
        <img src="/about.png" alt="" />
      </Link>
    </div>
  );
}
