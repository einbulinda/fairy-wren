import { useState, useMemo } from "react";
import { Users, ChevronRight, ChevronDown, Clock, CreditCard, User, Package } from "lucide-react";
import { calculateBillPaymentInfo } from "@/utils/calculations";

const fmt = (n) =>
  `KSh. ${parseFloat(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });

const agingDays = (createdAt) =>
  Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);

const AgingBadge = ({ days }) => {
  let cls = "bg-emerald-500/20 text-emerald-300";
  if (days >= 14) cls = "bg-red-500/20 text-red-300";
  else if (days >= 7) cls = "bg-amber-500/20 text-amber-300";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <Clock size={10} />
      {days === 0 ? "Today" : `${days}d ago`}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    open: "bg-yellow-500/20 text-yellow-300",
    awaiting_confirmation: "bg-blue-500/20 text-blue-300",
  };
  const labels = { open: "Open", awaiting_confirmation: "Pending confirm" };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${map[status] || "bg-gray-600/20 text-gray-400"}`}>
      {labels[status] || status}
    </span>
  );
};

// ─── Bill detail (expanded) ────────────────────────────────────────────────

const BillDetail = ({ bill }) => {
  const { total, amountPaid, pendingAmount, balanceDue } = calculateBillPaymentInfo(bill);
  const allItems = (bill.rounds || []).flatMap((r) => r.round_items || []);
  const days = agingDays(bill.created_at);

  return (
    <div className="border-t border-purple-500/20 bg-gray-950/60 px-4 py-4 space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <User size={12} />
          Served by: <span className="text-white ml-1">{bill.created_by_user?.name ?? "—"}</span>
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {fmtDate(bill.created_at)} · <AgingBadge days={days} />
        </span>
        <StatusBadge status={bill.status} />
      </div>

      {/* Items */}
      {allItems.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-400 mb-2 flex items-center gap-1">
            <Package size={10} /> Items
          </p>
          <div className="space-y-1">
            {allItems.map((item, i) => (
              <div key={item.id ?? i} className="flex justify-between text-sm">
                <span className={`text-gray-300 ${item.is_return ? "line-through text-gray-500" : ""}`}>
                  {item.product?.name ?? item.productName ?? "Item"}
                  <span className="text-gray-500 ml-1">× {item.quantity}</span>
                </span>
                <span className={item.is_return ? "text-red-400" : "text-white"}>
                  {item.is_return ? "−" : ""}
                  {fmt(parseFloat(item.price) * parseInt(item.quantity))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payments */}
      {bill.payments?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-400 mb-2 flex items-center gap-1">
            <CreditCard size={10} /> Payments
          </p>
          <div className="space-y-1">
            {bill.payments.map((pay) => (
              <div key={pay.id} className="flex justify-between text-sm">
                <span className="text-gray-400 capitalize">
                  {(pay.payment_type || "cash").replace(/_/g, " ")}
                  {pay.status === "pending" && (
                    <span className="ml-2 text-[10px] text-amber-400 font-medium">(pending)</span>
                  )}
                </span>
                <span className="text-emerald-400">{fmt(pay.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-purple-500/10 text-center text-xs">
        <div>
          <p className="text-gray-500 mb-0.5">Bill Total</p>
          <p className="text-white font-semibold tabular-nums">{fmt(total)}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5">Paid</p>
          <p className="text-emerald-400 font-semibold tabular-nums">{fmt(amountPaid)}</p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-gray-500 mb-0.5">Balance Due</p>
          <p className={`font-semibold tabular-nums ${balanceDue > 0 ? "text-pink-400" : "text-emerald-400"}`}>
            {fmt(balanceDue)}
          </p>
        </div>
      </div>
      {pendingAmount > 0 && (
        <p className="text-xs text-amber-400 text-center">
          + {fmt(pendingAmount)} pending confirmation
        </p>
      )}
    </div>
  );
};

// ─── Bill row (collapsible detail) ────────────────────────────────────────

const BillRow = ({ bill }) => {
  const [open, setOpen] = useState(false);
  const { balanceDue } = calculateBillPaymentInfo(bill);
  const days = agingDays(bill.created_at);

  return (
    <div className="border border-purple-500/20 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/40 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{bill.customer_name}</p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <span className="text-xs text-gray-500">#{bill.id.slice(0, 8)}</span>
            <StatusBadge status={bill.status} />
            <AgingBadge days={days} />
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-base font-bold tabular-nums ${balanceDue > 0 ? "text-pink-400" : "text-emerald-400"}`}>
            {fmt(balanceDue)}
          </p>
          <p className="text-[10px] text-gray-500">balance due</p>
        </div>
        {open ? (
          <ChevronDown size={16} className="text-purple-400 shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-gray-500 shrink-0" />
        )}
      </button>
      {open && <BillDetail bill={bill} />}
    </div>
  );
};

// ─── Customer group ────────────────────────────────────────────────────────

const CustomerGroup = ({ account, bills }) => {
  const [expanded, setExpanded] = useState(false);

  const totalDue = useMemo(
    () => bills.reduce((sum, b) => sum + calculateBillPaymentInfo(b).balanceDue, 0),
    [bills]
  );

  const oldestDays = useMemo(
    () => Math.max(...bills.map((b) => agingDays(b.created_at))),
    [bills]
  );

  return (
    <div className="bg-gray-800/50 border border-purple-500/20 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-800/70 transition-colors text-left"
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {account.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{account.name}</p>
          <p className="text-xs text-gray-500">
            {bills.length} open bill{bills.length !== 1 ? "s" : ""}
            {" · "}oldest {oldestDays === 0 ? "today" : `${oldestDays}d`}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-pink-400 tabular-nums">{fmt(totalDue)}</p>
          <p className="text-[10px] text-gray-500">total due</p>
        </div>

        {expanded ? (
          <ChevronDown size={16} className="text-purple-400 shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-gray-500 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-purple-500/20 px-3 py-3 space-y-2 bg-gray-900/30">
          {bills.map((bill) => (
            <BillRow key={bill.id} bill={bill} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main view ─────────────────────────────────────────────────────────────

const CustomerBillsView = ({ bills }) => {
  const customerGroups = useMemo(() => {
    const linked = bills.filter(
      (b) =>
        b.customer_account &&
        (b.status === "open" || b.status === "awaiting_confirmation")
    );

    const map = new Map();
    for (const bill of linked) {
      const acc = bill.customer_account;
      if (!map.has(acc.id)) map.set(acc.id, { account: acc, bills: [] });
      map.get(acc.id).bills.push(bill);
    }

    return [...map.values()].sort((a, b) => {
      const dueA = a.bills.reduce((s, b) => s + calculateBillPaymentInfo(b).balanceDue, 0);
      const dueB = b.bills.reduce((s, b) => s + calculateBillPaymentInfo(b).balanceDue, 0);
      return dueB - dueA;
    });
  }, [bills]);

  const totalOutstanding = useMemo(
    () =>
      customerGroups.reduce(
        (sum, g) =>
          sum +
          g.bills.reduce((s, b) => s + calculateBillPaymentInfo(b).balanceDue, 0),
        0
      ),
    [customerGroups]
  );

  if (customerGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
          <Users size={28} className="text-purple-400" />
        </div>
        <p className="text-lg font-semibold text-white mb-1">No customer accounts</p>
        <p className="text-sm text-gray-500 max-w-xs">
          Open bills linked to CRM customer accounts will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 space-y-4 pb-24">
        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800/60 border border-purple-500/20 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">Customers with open bills</p>
            <p className="text-2xl font-bold text-white">{customerGroups.length}</p>
          </div>
          <div className="bg-gray-800/60 border border-pink-500/20 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">Total outstanding</p>
            <p className="text-xl font-bold text-pink-400 tabular-nums">{fmt(totalOutstanding)}</p>
          </div>
        </div>

        {/* Customer groups */}
        <div className="space-y-3">
          {customerGroups.map(({ account, bills: groupBills }) => (
            <CustomerGroup key={account.id} account={account} bills={groupBills} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomerBillsView;
