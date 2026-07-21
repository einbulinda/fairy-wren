import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { usePendingApprovals } from "@/hooks/usePendingApprovals";
import { usePendingReservations } from "@/hooks/usePendingReservations";
import { useNewFeedback } from "@/hooks/useNewFeedback";
import { useViewedNotifications } from "@/hooks/useViewedNotifications";
import { useAwaitingPayments } from "@/hooks/useAwaitingPayments";
import { useLowStockAlerts } from "@/hooks/useLowStockAlerts";
import { usePendingReceipts } from "@/hooks/useInventory";
import { usePendingExchanges } from "@/hooks/useExchanges";
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Sun,
  Moon,
  Eye,
  ClipboardCheck,
  CalendarCheck,
  MessageSquare,
  CreditCard,
  Package,
  PackagePlus,
} from "lucide-react";

const Header = ({ title, onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pendingApprovals } = usePendingApprovals();
  const { pendingReservations } = usePendingReservations();
  const { newFeedback } = useNewFeedback();
  const { markViewed, filterUnviewed } = useViewedNotifications();
  const { awaitingPayments } = useAwaitingPayments();
  const { lowStockAlerts } = useLowStockAlerts();
  const { data: pendingReceipts = [] } = usePendingReceipts();
  const { data: pendingExchanges = [] } = usePendingExchanges();

  const unviewedApprovals = filterUnviewed(pendingApprovals);
  const unviewedReservations = filterUnviewed(pendingReservations);
  const unviewedFeedback = filterUnviewed(newFeedback);
  const unviewedCount =
    unviewedApprovals.length +
    unviewedReservations.length +
    unviewedFeedback.length +
    awaitingPayments.length +
    lowStockAlerts.length +
    pendingReceipts.length +
    pendingExchanges.length;

  const navigate = useNavigate();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const menuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-surface-900/95 backdrop-blur-sm border-b border-surface-700 sticky top-0 z-20">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        {/* Left: hamburger + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800"
          >
            <Menu size={20} />
          </button>
          <h2 className="text-base font-semibold text-white">{title}</h2>
        </div>

        {/* Right: search, theme, notifications, user */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="hidden md:flex items-center bg-surface-800 rounded-lg px-3 py-1.5 border border-surface-700">
            <Search size={16} className="text-surface-400 mr-2" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent text-sm text-surface-200 placeholder:text-surface-500 focus:outline-none w-48"
            />
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            title={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotifOpen((o) => {
                  if (!o) {
                    markViewed([
                      ...unviewedApprovals.map((a) => ({
                        entity_type: "stock_take",
                        entity_id: a.id,
                      })),
                      ...unviewedReservations.map((r) => ({
                        entity_type: "reservation",
                        entity_id: r.id,
                      })),
                      ...unviewedFeedback.map((f) => ({
                        entity_type: "feedback",
                        entity_id: f.id,
                      })),
                    ]);
                  }
                  return !o;
                });
              }}
              className="relative p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            >
              <Bell size={19} />
              {unviewedCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 flex items-center justify-center bg-danger text-[10px] font-bold text-white rounded-full px-1">
                  {unviewedCount > 99 ? "99+" : unviewedCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="fixed left-1/2 -translate-x-1/2 top-17.5 w-[calc(100vw-2rem)] max-w-80 md:absolute md:left-auto md:translate-x-0 md:right-0 md:top-auto md:mt-1 md:w-80 bg-surface-800 rounded-xl shadow-lg border border-surface-700 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
                  <h4 className="text-sm font-semibold text-white">
                    Notifications
                  </h4>
                  {unviewedCount > 0 && (
                    <span className="text-xs bg-danger/20 text-danger px-2 py-0.5 rounded-full font-medium">
                      {unviewedCount}
                    </span>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {/* Pending Approvals section */}
                  {unviewedApprovals.length > 0 && (
                    <>
                      <div className="px-4 py-2 flex items-center justify-between bg-surface-900/50">
                        <span className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider">
                          Stock Take Reports
                        </span>
                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">
                          {unviewedApprovals.length}
                        </span>
                      </div>
                      {unviewedApprovals.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setNotifOpen(false);
                            navigate(`/inventory/reports/${item.id}`, {
                              state: { from: "approvals" },
                            });
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-surface-700/50 transition-colors border-b border-surface-700/50 last:border-0"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-white truncate">
                                {item.stock_take_name || "Stock Take"}
                              </p>
                              <p className="text-xs text-surface-400 mt-0.5">
                                {item.profiles?.name || "Unknown"} &middot;{" "}
                                {new Date(item.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                                item.approval_status === "under_review"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-yellow-500/20 text-yellow-400"
                              }`}
                            >
                              {item.approval_status?.replace("_", " ") ||
                                "pending"}
                            </span>
                          </div>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Pending Reservations section */}
                  {unviewedReservations.length > 0 && (
                    <>
                      <div className="px-4 py-2 flex items-center justify-between bg-surface-900/50">
                        <span className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider">
                          New Reservations
                        </span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                          {unviewedReservations.length}
                        </span>
                      </div>
                      {unviewedReservations.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setNotifOpen(false);
                            navigate("/web", {
                              state: { tab: "reservations" },
                            });
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-surface-700/50 transition-colors border-b border-surface-700/50 last:border-0"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-white truncate">
                                {item.name || "Reservation"}
                              </p>
                              <p className="text-xs text-surface-400 mt-0.5">
                                {item.reservation_date
                                  ? new Date(
                                      item.reservation_date + "T00:00:00",
                                    ).toLocaleDateString("en-GB", {
                                      day: "numeric",
                                      month: "short",
                                      timeZone: "Africa/Nairobi",
                                    })
                                  : ""}
                                {item.party_size
                                  ? ` · ${item.party_size} guests`
                                  : ""}
                              </p>
                            </div>
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400">
                              pending
                            </span>
                          </div>
                        </button>
                      ))}
                    </>
                  )}

                  {/* New Feedback section */}
                  {unviewedFeedback.length > 0 && (
                    <>
                      <div className="px-4 py-2 flex items-center justify-between bg-surface-900/50">
                        <span className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider">
                          Customer Feedback
                        </span>
                        <span className="text-[10px] bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded-full">
                          {unviewedFeedback.length}
                        </span>
                      </div>
                      {unviewedFeedback.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setNotifOpen(false);
                            navigate("/web", { state: { tab: "feedback" } });
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-surface-700/50 transition-colors border-b border-surface-700/50 last:border-0"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-white truncate">
                                {item.name || "Anonymous"}
                              </p>
                              <p className="text-xs text-surface-400 mt-0.5 truncate">
                                {item.message
                                  ? item.message.slice(0, 50) +
                                    (item.message.length > 50 ? "…" : "")
                                  : item.type || "feedback"}
                              </p>
                            </div>
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-500/20 text-primary-400">
                              new
                            </span>
                          </div>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Awaiting Payments */}
                  {awaitingPayments.length > 0 && (
                    <>
                      <div className="px-4 py-2 flex items-center justify-between bg-surface-900/50">
                        <span className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider">
                          Awaiting Payment Approval
                        </span>
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">
                          {awaitingPayments.length}
                        </span>
                      </div>
                      {awaitingPayments.slice(0, 4).map((bill) => (
                        <button
                          key={bill.id}
                          onClick={() => {
                            setNotifOpen(false);
                            navigate("/sales?status=awaiting_confirmation");
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-surface-700/50 transition-colors border-b border-surface-700/50 last:border-0"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-white truncate">
                                {bill.customer_name || "Walk-in Customer"}
                              </p>
                              <p className="text-xs text-surface-400 mt-0.5">
                                {new Date(bill.created_at).toLocaleDateString("en-GB", {
                                  day: "numeric", month: "short",
                                  hour: "2-digit", minute: "2-digit",
                                  timeZone: "Africa/Nairobi",
                                })}
                              </p>
                            </div>
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400">
                              pending
                            </span>
                          </div>
                        </button>
                      ))}
                      {awaitingPayments.length > 4 && (
                        <p className="px-4 py-2 text-[11px] text-surface-500 text-center">
                          +{awaitingPayments.length - 4} more
                        </p>
                      )}
                    </>
                  )}

                  {/* Pending Goods Receipts */}
                  {pendingReceipts.length > 0 && (
                    <>
                      <div className="px-4 py-2 flex items-center justify-between bg-surface-900/50">
                        <span className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider">
                          Goods Receipts
                        </span>
                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">
                          {pendingReceipts.length}
                        </span>
                      </div>
                      {pendingReceipts.slice(0, 4).map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setNotifOpen(false);
                            navigate("/inventory/approvals");
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-surface-700/50 transition-colors border-b border-surface-700/50 last:border-0"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-white truncate">
                                {r.invoice_number}
                              </p>
                              <p className="text-xs text-surface-400 mt-0.5">
                                {r.supplier?.name || "—"}
                                {r.submitted_by?.name ? ` · ${r.submitted_by.name}` : ""}
                              </p>
                            </div>
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-500/20 text-yellow-400">
                              pending
                            </span>
                          </div>
                        </button>
                      ))}
                      {pendingReceipts.length > 4 && (
                        <p className="px-4 py-2 text-[11px] text-surface-500 text-center">
                          +{pendingReceipts.length - 4} more
                        </p>
                      )}
                    </>
                  )}

                  {/* Pending Product Exchanges */}
                  {pendingExchanges.length > 0 && (
                    <>
                      <div className="px-4 py-2 flex items-center justify-between bg-surface-900/50">
                        <span className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider">
                          Product Exchanges
                        </span>
                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">
                          {pendingExchanges.length}
                        </span>
                      </div>
                      {pendingExchanges.slice(0, 4).map((ex) => (
                        <button
                          key={ex.id}
                          onClick={() => {
                            setNotifOpen(false);
                            navigate("/inventory/approvals");
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-surface-700/50 transition-colors border-b border-surface-700/50 last:border-0"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-white truncate">
                                {ex.partner?.name || "—"}
                              </p>
                              <p className="text-xs text-surface-400 mt-0.5 capitalize">
                                {ex.direction}
                                {ex.submitted_by?.name ? ` · ${ex.submitted_by.name}` : ""}
                              </p>
                            </div>
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-500/20 text-yellow-400">
                              pending
                            </span>
                          </div>
                        </button>
                      ))}
                      {pendingExchanges.length > 4 && (
                        <p className="px-4 py-2 text-[11px] text-surface-500 text-center">
                          +{pendingExchanges.length - 4} more
                        </p>
                      )}
                    </>
                  )}

                  {/* Low Stock Alerts */}
                  {lowStockAlerts.length > 0 && (
                    <>
                      <div className="px-4 py-2 flex items-center justify-between bg-surface-900/50">
                        <span className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider">
                          Low Stock
                        </span>
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">
                          {lowStockAlerts.length}
                        </span>
                      </div>
                      {lowStockAlerts.slice(0, 4).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setNotifOpen(false);
                            navigate("/inventory/reorder-forecast");
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-surface-700/50 transition-colors border-b border-surface-700/50 last:border-0"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-white truncate">{item.name}</p>
                              <p className="text-xs text-surface-400 mt-0.5">
                                {item.categories?.name && `${item.categories.name} · `}
                                Stock: {item.current_stock} / Reorder: {item.reorder_level}
                              </p>
                            </div>
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/20 text-orange-400">
                              low
                            </span>
                          </div>
                        </button>
                      ))}
                      {lowStockAlerts.length > 4 && (
                        <p className="px-4 py-2 text-[11px] text-surface-500 text-center">
                          +{lowStockAlerts.length - 4} more
                        </p>
                      )}
                    </>
                  )}

                  {/* Empty state */}
                  {unviewedCount === 0 && (
                    <div className="px-4 py-8 text-center">
                      <ClipboardCheck
                        size={28}
                        className="mx-auto mb-2 text-surface-600"
                      />
                      <p className="text-sm text-surface-400">
                        No new notifications
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-surface-700 flex flex-wrap divide-x divide-surface-700">
                  <button
                    onClick={() => { setNotifOpen(false); navigate("/inventory/approvals"); }}
                    className="flex-1 px-3 py-2.5 text-xs text-primary-400 hover:bg-surface-700/50 transition-colors flex items-center justify-center gap-1.5 font-medium"
                  >
                    <Eye size={13} />
                    Stock Takes
                  </button>
                  <button
                    onClick={() => { setNotifOpen(false); navigate("/sales?status=awaiting_confirmation"); }}
                    className="flex-1 px-3 py-2.5 text-xs text-blue-400 hover:bg-surface-700/50 transition-colors flex items-center justify-center gap-1.5 font-medium"
                  >
                    <CreditCard size={13} />
                    Payments
                  </button>
                  <button
                    onClick={() => { setNotifOpen(false); navigate("/inventory/reorder-forecast"); }}
                    className="flex-1 px-3 py-2.5 text-xs text-orange-400 hover:bg-surface-700/50 transition-colors flex items-center justify-center gap-1.5 font-medium"
                  >
                    <Package size={13} />
                    Low Stock
                  </button>
                  <button
                    onClick={() => { setNotifOpen(false); navigate("/web", { state: { tab: "reservations" } }); }}
                    className="flex-1 px-3 py-2.5 text-xs text-amber-400 hover:bg-surface-700/50 transition-colors flex items-center justify-center gap-1.5 font-medium"
                  >
                    <CalendarCheck size={13} />
                    Reservations
                  </button>
                  <button
                    onClick={() => { setNotifOpen(false); navigate("/web", { state: { tab: "feedback" } }); }}
                    className="flex-1 px-3 py-2.5 text-xs text-primary-400 hover:bg-surface-700/50 transition-colors flex items-center justify-center gap-1.5 font-medium"
                  >
                    <MessageSquare size={13} />
                    Feedback
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg hover:bg-surface-800 transition-colors"
            >
              <div className="w-8 h-8 bg-primary-600/30 rounded-full flex items-center justify-center">
                <span className="text-xs font-semibold text-primary-300">
                  {user.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-surface-200 leading-tight">
                  {user.name}
                </p>
                <p className="text-[11px] text-surface-400 capitalize">
                  {user.role}
                </p>
              </div>
              <ChevronDown size={14} className="text-surface-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-surface-800 rounded-lg shadow-lg border border-surface-700 py-1 z-50">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate("/profile");
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-surface-300 hover:bg-surface-700 hover:text-white"
                >
                  <User size={16} />
                  <span>Profile</span>
                </button>
                <div className="border-t border-surface-700 my-1" />
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-red-500/10"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
