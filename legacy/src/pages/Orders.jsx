import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle,
  Clock,
  Copy,
  MessageSquare,
  Package,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  extractNotesFromOrders,
  getCustomerOrders,
} from "../api/services/orders";
import { useShop } from "../context/ShopContext";

const Orders = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useShop();

  const [tab, setTab] = useState("Paid");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (selectedOrder) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedOrder]);

  const fetchOrders = async (isRefresh = false) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getCustomerOrders();
      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [isAuthenticated]);

  const allNotes = useMemo(() => extractNotesFromOrders(orders), [orders]);

  // ✅ FIXED: pending now includes "on-hold"
  const orderStats = useMemo(() => {
    const total = orders.length;

    const paidOrders = orders.filter((o) =>
      ["processing", "completed"].includes(o.status),
    );

    const paid = paidOrders.length;

    const pending = orders.filter((o) =>
      ["pending", "on-hold"].includes(o.status),
    ).length;

    // ✅ only successful money spent
    const totalAmount = paidOrders.reduce(
      (sum, o) => sum + parseFloat(o.total || 0),
      0,
    );

    return { total, paid, pending, totalAmount };
  }, [orders]);

  // ✅ FIXED: All statuses covered across 3 tabs
  // Pending    → pending + on-hold
  // Paid       → processing + completed
  // All orders → everything (cancelled, failed, refunded, etc.)
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (tab === "Pending")
      filtered = orders.filter((o) =>
        ["pending", "on-hold"].includes(o.status),
      );
    else if (tab === "Paid")
      filtered = orders.filter((o) =>
        ["processing", "completed"].includes(o.status),
      );
    // "All orders" — no filter, shows everything

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.id.toString().includes(query) ||
          o.line_items?.some((item) =>
            item.name?.toLowerCase().includes(query),
          ),
      );
    }
    return filtered;
  }, [orders, tab, searchQuery]);

  const getOrderNotes = useCallback(
    (orderId) => {
      return allNotes.filter((note) => note.orderId === orderId);
    },
    [allNotes],
  );

  const displayName =
    user?.display_name ||
    user?.first_name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "Guest";
  const userAvatar = user?.picture || user?.avatar_url || user?.avatar || null;

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  };

  const getStatusConfig = (status) => {
    const configs = {
      processing: {
        icon: CheckCircle,
        color: "text-green-600",
        bg: "bg-green-100",
        label: "Processing",
      },
      completed: {
        icon: CheckCircle,
        color: "text-green-600",
        bg: "bg-green-100",
        label: "Completed",
      },
      pending: {
        icon: Clock,
        color: "text-orange-600",
        bg: "bg-orange-100",
        label: "Pending",
      },
      "on-hold": {
        icon: AlertCircle,
        color: "text-yellow-600",
        bg: "bg-yellow-100",
        label: "On Hold",
      },
      cancelled: {
        icon: XCircle,
        color: "text-red-600",
        bg: "bg-red-100",
        label: "Cancelled",
      },
      failed: {
        icon: XCircle,
        color: "text-red-600",
        bg: "bg-red-100",
        label: "Failed",
      },
      refunded: {
        icon: AlertCircle,
        color: "text-purple-600",
        bg: "bg-purple-100",
        label: "Refunded",
      },
    };
    return (
      configs[status] || {
        icon: Clock,
        color: "text-gray-600",
        bg: "bg-gray-100",
        label: status,
      }
    );
  };

  const UserAvatar = ({ size = "md", className = "" }) => {
    const sizeClasses = {
      sm: "w-8 h-8 text-xs",
      md: "w-10 h-10 text-sm",
      lg: "w-12 h-12 text-base",
      xl: "w-16 h-16 text-lg",
    };
    const sizeClass = sizeClasses[size] || sizeClasses.md;

    if (userAvatar) {
      return (
        <img
          src={userAvatar}
          alt={displayName}
          className={`${sizeClass} rounded-full object-cover border-2 border-white shadow-sm ${className}`}
        />
      );
    }
    return (
      <div
        className={`${sizeClass} rounded-full bg-orange-100 text-orange-600 font-semibold flex items-center justify-center border-2 border-white shadow-sm ${className}`}
      >
        {getInitials(displayName)}
      </div>
    );
  };

  const StatusBadge = ({ status }) => {
    const config = getStatusConfig(status);
    return (
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  const getItemsCount = (order) => {
    return (
      order.line_items?.reduce((sum, item) => sum + (item.quantity || 1), 0) ||
      0
    );
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center font-sans">
      {/* Header */}
      <div className="w-full max-w-xl flex items-center justify-between px-4 py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-orange-500 transition-colors"
            type="button"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">Orders</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-full transition ${showSearch ? "bg-orange-100 text-orange-600" : "hover:bg-gray-100"}`}
            type="button"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className={`p-2 hover:bg-gray-100 rounded-full transition ${refreshing ? "animate-spin text-orange-500" : ""}`}
            type="button"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="w-full max-w-xl px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by order ID or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition text-sm"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                type="button"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Wrapper */}
      <div className="w-full max-w-xl flex flex-col items-center bg-gray-50 min-h-[calc(100vh-100px)] px-4 py-6 rounded-lg">
        {/* Orders Summary Bar */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 text-white text-sm font-medium rounded-lg px-4 py-4 w-full shadow-sm mb-5">
          <div className="flex items-center gap-3">
            <UserAvatar size="lg" />
            <div className="flex-1">
              <p className="font-bold capitalize text-base">{displayName}</p>
              {loading ? (
                <p className="text-white/80 text-xs">Loading your orders...</p>
              ) : orders.length === 0 ? (
                <p className="text-white/80 text-xs">
                  You haven't placed any orders yet.
                </p>
              ) : (
                <p className="text-white/90 text-xs">
                  <span className="font-semibold">{orderStats.total}</span>{" "}
                  orders ·{" "}
                  <span className="font-semibold">{orderStats.paid}</span> paid
                  · <span className="font-semibold">{orderStats.pending}</span>{" "}
                  pending
                </p>
              )}
            </div>
            {!loading && orders.length > 0 && (
              <div className="bg-white/20 rounded-lg px-3 py-1.5 text-center">
                <p className="text-[10px] uppercase opacity-80">Spent</p>
                <p className="font-bold text-sm">
                  ৳{orderStats.totalAmount.toFixed(0)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-around text-sm w-full mb-4 text-gray-400">
          {["Pending", "Paid", "All orders"].map((label) => (
            <button
              key={label}
              onClick={() => setTab(label)}
              className={`relative font-medium transition-all duration-200 ${tab === label ? "text-orange-500" : "text-gray-400"}`}
              type="button"
            >
              {label}
              {tab === label && (
                <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-10 h-0.5 bg-orange-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Orders Section */}
        <div className="w-full flex-1 mt-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                      <div className="h-5 bg-gray-200 rounded w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-10">
              <div className="bg-orange-100 rounded-full w-40 h-40 flex items-center justify-center mb-4">
                <div className="bg-orange-200 w-20 h-12 rounded-t-2xl relative">
                  <div className="absolute -top-2 left-2 w-8 h-8 bg-orange-300 rotate-12 rounded-lg" />
                  <div className="absolute -top-2 right-2 w-8 h-8 bg-orange-300 -rotate-12 rounded-lg" />
                </div>
              </div>
              <p className="text-gray-500 text-sm text-center">
                {!isAuthenticated
                  ? "Login to view your orders."
                  : searchQuery
                    ? "No orders found matching your search."
                    : tab === "Pending"
                      ? "No pending or on-hold orders."
                      : tab === "Paid"
                        ? "No completed or processing orders."
                        : "No orders found."}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-3 text-orange-500 text-sm font-medium"
                  type="button"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredOrders.map((order) => {
                const noteCount = getOrderNotes(order.id).length;
                const items = order.line_items || [];
                const firstItem = items[0];
                const totalItems = getItemsCount(order);
                const moreItems = items.length - 1;

                return (
                  <li
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-3 cursor-pointer hover:border-orange-200 hover:shadow-md transition-all active:scale-[0.98]"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={
                          firstItem?.image ||
                          "https://via.placeholder.com/80x80.png?text=Image"
                        }
                        alt=""
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      {moreItems > 0 && (
                        <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          +{moreItems}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {firstItem?.name || "Product"}
                          </p>
                          {moreItems > 0 && (
                            <p className="text-xs text-orange-500">
                              +{moreItems} more item{moreItems > 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatDate(order.date_created)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Order #{order.id} · {totalItems} item
                        {totalItems > 1 ? "s" : ""}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} />
                          {noteCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <MessageSquare size={12} />
                              {noteCount}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-gray-800">
                          ৳{parseFloat(order.total).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          getOrderNotes={getOrderNotes}
          getStatusConfig={getStatusConfig}
        />
      )}
    </div>
  );
};

const OrderModal = ({ order, onClose, getOrderNotes, getStatusConfig }) => {
  const [copiedField, setCopiedField] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  const notes = getOrderNotes(order.id);
  const items = order.line_items || [];
  const config = getStatusConfig(order.status);
  const Icon = config.icon;

  const totalQuantity = items.reduce(
    (sum, item) => sum + (item.quantity || 1),
    0,
  );

  const safeString = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return "";
      }
    }
    return String(value);
  };

  const getGameDetails = () => {
    const details = {};

    if (order.meta_data && Array.isArray(order.meta_data)) {
      order.meta_data.forEach((meta) => {
        const key = safeString(meta.key).toLowerCase();
        const value = safeString(meta.value);
        if (!value || value.startsWith("{") || value.startsWith("[")) return;
        if (meta.key.startsWith("_")) return;

        if (
          key.includes("user") ||
          key.includes("player") ||
          key.includes("uid") ||
          key.includes("game_id") ||
          key.includes("userid")
        ) {
          details.userId = value;
          details.userIdLabel = meta.key;
        }
        if (
          key.includes("zone") ||
          key.includes("server") ||
          key.includes("region")
        ) {
          details.zoneId = value;
          details.zoneIdLabel = meta.key;
        }
        if (
          key.includes("ign") ||
          key.includes("username") ||
          key.includes("nickname") ||
          key.includes("player name")
        ) {
          details.ign = value;
        }
      });
    }

    const firstItem = items[0];
    if (firstItem?.meta_data) {
      firstItem.meta_data.forEach((meta) => {
        const key = safeString(meta.key).toLowerCase();
        const value = safeString(meta.value);
        if (!value || value.startsWith("{") || value.startsWith("[")) return;
        if (meta.key.startsWith("_")) return;

        if (
          (key.includes("user") ||
            key.includes("player") ||
            key.includes("uid") ||
            key.includes("game_id")) &&
          !details.userId
        ) {
          details.userId = value;
          details.userIdLabel = meta.key;
        }
        if (
          (key.includes("zone") || key.includes("server")) &&
          !details.zoneId
        ) {
          details.zoneId = value;
          details.zoneIdLabel = meta.key;
        }
        if (key.includes("player name") && !details.ign) {
          details.ign = value;
        }
      });
    }

    if (!details.userId && order.customer_note) {
      details.userId = safeString(order.customer_note);
      details.userIdLabel = "Player ID";
    }

    return details;
  };

  const gameDetails = getGameDetails();
  const hasGameDetails =
    gameDetails.userId || gameDetails.zoneId || gameDetails.ign;

  const billing = order.billing || {};
  const hasContactInfo = billing.email || billing.phone;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(safeString(text));
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const CopyableRow = ({ label, value, fieldId, mono = false }) => {
    const displayValue = safeString(value);
    if (
      !displayValue ||
      displayValue.startsWith("{") ||
      displayValue.startsWith("[")
    )
      return null;

    const isCopied = copiedField === fieldId;

    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-gray-500">{label}</span>
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium text-gray-800 ${mono ? "font-mono" : ""}`}
          >
            {displayValue}
          </span>
          <button
            onClick={() => handleCopy(displayValue, fieldId)}
            className={`p-1.5 rounded-lg transition-colors ${
              isCopied ? "bg-green-100" : "hover:bg-gray-100"
            }`}
            type="button"
          >
            {isCopied ? (
              <Check size={14} className="text-green-500" />
            ) : (
              <Copy size={14} className="text-gray-400" />
            )}
          </button>
        </div>
      </div>
    );
  };

  const getItemMetaDisplay = (meta) => {
    const value = safeString(meta.display_value || meta.value);
    if (!value || value.startsWith("{") || value.startsWith("[")) return null;
    return value;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 flex items-center justify-center w-full h-full p-4">
        <div
          className={`bg-white w-full max-w-xl max-h-[calc(100vh-2rem)] flex flex-col rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ease-out ${
            isVisible
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-8 scale-95 opacity-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
            <div>
              <h3 className="font-bold text-gray-900">Order Details</h3>
              <p className="text-xs text-gray-500">
                {new Date(order.date_created).toLocaleString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition"
              type="button"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
            {/* Status Card */}
            <div
              className={`flex items-center gap-3 p-4 rounded-xl ${config.bg}`}
            >
              <div
                className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center`}
              >
                <Icon size={22} className={config.color} />
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${config.color}`}>
                  {config.label}
                </p>
                <p className="text-xs text-gray-600">
                  Order is {config.label.toLowerCase()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Total</p>
                <p className="font-bold text-gray-900">
                  ৳{parseFloat(order.total).toFixed(0)}
                </p>
              </div>
            </div>

            {/* Order ID */}
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Order ID</p>
                  <p className="font-mono font-bold text-lg">#{order.id}</p>
                </div>
                <button
                  onClick={() => handleCopy(order.id, "orderId")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    copiedField === "orderId"
                      ? "bg-green-100 text-green-600"
                      : "bg-white border border-gray-200 hover:bg-gray-100 text-gray-700"
                  }`}
                  type="button"
                >
                  {copiedField === "orderId" ? (
                    <Check size={14} />
                  ) : (
                    <Copy size={14} />
                  )}
                  {copiedField === "orderId" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Game Details */}
            {hasGameDetails && (
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg">🎮</span>
                  </div>
                  <p className="font-semibold text-gray-800">
                    Game Account Details
                  </p>
                </div>
                <div className="space-y-1 divide-y divide-orange-100">
                  {gameDetails.userId && (
                    <CopyableRow
                      label={gameDetails.userIdLabel || "Player ID"}
                      value={gameDetails.userId}
                      fieldId="userId"
                      mono
                    />
                  )}
                  {gameDetails.zoneId && (
                    <CopyableRow
                      label={gameDetails.zoneIdLabel || "Zone ID"}
                      value={gameDetails.zoneId}
                      fieldId="zoneId"
                      mono
                    />
                  )}
                  {gameDetails.ign && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-500">
                        In-Game Name
                      </span>
                      <span className="text-sm font-semibold text-green-600">
                        {gameDetails.ign}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Products */}
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-gray-500" />
                  <p className="font-semibold text-gray-700">
                    Products ({items.length})
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  {totalQuantity} item{totalQuantity > 1 ? "s" : ""}
                </p>
              </div>

              <div className="space-y-2">
                {items.map((item, index) => {
                  const gameRelatedKeys = [
                    "user",
                    "player",
                    "uid",
                    "game_id",
                    "userid",
                    "zone",
                    "server",
                    "region",
                    "ign",
                    "username",
                    "nickname",
                    "player name",
                    "id",
                  ];

                  const validMeta = (item.meta_data || [])
                    .map((m) => ({
                      ...m,
                      safeValue: getItemMetaDisplay(m),
                    }))
                    .filter((m) => {
                      if (!m.safeValue || m.key.startsWith("_")) return false;
                      const keyLower = m.key.toLowerCase();
                      const isGameRelated = gameRelatedKeys.some((gk) =>
                        keyLower.includes(gk),
                      );
                      return !isGameRelated;
                    });

                  return (
                    <div
                      key={item.id || index}
                      className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100"
                    >
                      <img
                        src={item.image || "https://via.placeholder.com/60"}
                        alt=""
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm line-clamp-2">
                          {item.name || "Product"}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            Qty: {item.quantity || 1}
                          </span>
                          {validMeta.length > 0 &&
                            validMeta.slice(0, 2).map((m, i) => (
                              <span
                                key={i}
                                className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full"
                              >
                                {m.safeValue}
                              </span>
                            ))}
                        </div>
                      </div>
                      <p className="font-bold text-gray-800">
                        ৳{parseFloat(item.total || 0).toFixed(0)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contact Info */}
            {hasContactInfo && (
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg">📱</span>
                  </div>
                  <p className="font-semibold text-gray-800">Contact Info</p>
                </div>
                <div className="space-y-1 divide-y divide-gray-100">
                  {billing.email && (
                    <CopyableRow
                      label="Email"
                      value={billing.email}
                      fieldId="email"
                    />
                  )}
                  {billing.phone && (
                    <CopyableRow
                      label="Phone"
                      value={billing.phone}
                      fieldId="phone"
                    />
                  )}
                  {billing.first_name && (
                    <CopyableRow
                      label="Name"
                      value={`${billing.first_name} ${billing.last_name || ""}`.trim()}
                      fieldId="name"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Price Summary */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 p-4 rounded-xl">
              <p className="font-semibold text-gray-800 mb-3">
                Payment Summary
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-800">
                    ৳
                    {items
                      .reduce(
                        (sum, item) => sum + parseFloat(item.subtotal || 0),
                        0,
                      )
                      .toFixed(0)}
                  </span>
                </div>

                {parseFloat(order.discount_total) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600">Discount</span>
                    <span className="text-green-600 font-medium">
                      -৳{parseFloat(order.discount_total).toFixed(0)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-green-200">
                  <span className="font-semibold text-gray-700">
                    Total Paid
                  </span>
                  <span className="text-2xl font-bold text-green-600">
                    ৳{parseFloat(order.total).toFixed(0)}
                  </span>
                </div>

                {order.payment_method_title && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <span className="text-xs text-gray-500">Paid via</span>
                    <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full">
                      {order.payment_method_title}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Transaction ID */}
            {order.transaction_id && (
              <div className="bg-gray-50 p-4 rounded-xl">
                <CopyableRow
                  label="Transaction ID"
                  value={order.transaction_id}
                  fieldId="transactionId"
                  mono
                />
              </div>
            )}

            {/* Order Notes */}
            {notes.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={16} className="text-gray-500" />
                  <p className="font-semibold text-gray-700">
                    Order Notes ({notes.length})
                  </p>
                </div>
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-white p-3 rounded-lg border border-gray-100"
                    >
                      <p className="text-sm text-gray-700">
                        {safeString(note.content)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(note.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Note */}
            {order.customer_note && !gameDetails.userId && (
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Customer Note</p>
                <p className="text-sm text-gray-800">
                  {safeString(order.customer_note)}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 shrink-0 bg-white">
            <button
              onClick={handleClose}
              className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold transition"
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
