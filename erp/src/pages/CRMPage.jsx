import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Users,
  Search,
  X,
  Loader2,
  ChevronRight,
  AlertCircle,
  ArrowLeft,
  CreditCard,
  TrendingUp,
  Plus,
  UserPlus,
  Link2,
  CheckCircle2,
  Phone,
  Mail,
  StickyNote,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import {
  fetchCustomerAccounts,
  createCustomerAccount,
  updateCustomerAccount,
  deleteCustomerAccount,
  fetchAccountBills,
  linkNameToAccount,
  unlinkBillFromAccount,
  fetchUnlinkedNames,
  fetchUnlinkedBillsForName,
  linkBillsToAccount,
} from "@/services/customers.service";
import { fmtNumber as fmt, fmtDate } from "@/utils/formatters";
import { MobileCard, MobileCardList } from "@/components/shared/MobileCard";

const STATUS_BADGE = {
  open: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  awaiting_confirmation: "bg-blue-500/20 text-blue-400",
  cancelled: "bg-surface-600/30 text-surface-400",
};
const STATUS_LABEL = {
  open: "Open",
  completed: "Closed",
  awaiting_confirmation: "Pending",
  cancelled: "Cancelled",
};

// ─── Shared utility ────────────────────────────────────────────────────────

const Avatar = ({ name, size = "md" }) => {
  const sz = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  return (
    <div className={`${sz} rounded-full bg-primary-600/20 flex items-center justify-center shrink-0`}>
      <span className="font-bold text-primary-400">{(name || "?")[0].toUpperCase()}</span>
    </div>
  );
};

// ─── Create / Edit Account Modal ───────────────────────────────────────────

const AccountModal = ({ initial = {}, onSave, onClose, linkName: autoLinkName }) => {
  const [form, setForm] = useState({
    name: initial.name || autoLinkName || "",
    phone: initial.phone || "",
    email: initial.email || "",
    notes: initial.notes || "",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isEdit = !!initial.id;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface-800 border border-surface-700 rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-700">
          <h3 className="font-semibold text-white">{isEdit ? "Edit Customer" : "New Customer Account"}</h3>
          <button onClick={onClose} className="p-1 rounded text-surface-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {autoLinkName && !isEdit && (
            <div className="flex items-start gap-2 p-3 bg-primary-600/10 border border-primary-500/30 rounded-lg text-sm">
              <Link2 size={14} className="text-primary-400 mt-0.5 shrink-0" />
              <p className="text-primary-300">
                All bills named <strong>"{autoLinkName}"</strong> will be linked to this account.
              </p>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Full Name *</label>
            <input
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Jane Wanjiku"
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={set("phone")}
                placeholder="+254…"
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1">Email</label>
              <input
                value={form.email}
                onChange={set("email")}
                placeholder="jane@…"
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={set("notes")}
              rows={2}
              placeholder="Any notes…"
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-surface-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-surface-400 hover:text-white rounded-lg hover:bg-surface-700 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => form.name.trim() && onSave({ ...initial, ...form })}
            disabled={!form.name.trim()}
            className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white rounded-lg transition-colors"
          >
            {isEdit ? "Save Changes" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Link-to-existing Modal ────────────────────────────────────────────────

const LinkModal = ({ unlinked, accounts, onLink, onClose }) => {
  const [picked, setPicked] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return accounts;
    const q = search.toLowerCase();
    return accounts.filter((a) => a.name.toLowerCase().includes(q));
  }, [accounts, search]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface-800 border border-surface-700 rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-700">
          <h3 className="font-semibold text-white">Link to Existing Account</h3>
          <button onClick={onClose} className="p-1 rounded text-surface-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-surface-400">
            Link <strong className="text-white">"{unlinked.name}"</strong> ({unlinked.bill_count} bills) to:
          </p>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search accounts…"
              className="w-full pl-8 pr-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filtered.map((a) => (
              <button
                key={a.id}
                onClick={() => setPicked(a.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  picked === a.id ? "bg-primary-600/20 border border-primary-500/40" : "hover:bg-surface-700/50 border border-transparent"
                }`}
              >
                <Avatar name={a.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{a.name}</p>
                  <p className="text-[10px] text-surface-500">{a.total_bills} bills · bal {fmt(a.balance_due)}</p>
                </div>
                {picked === a.id && <CheckCircle2 size={14} className="text-primary-400 shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-surface-500 text-center py-4">No accounts found</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-surface-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-surface-400 hover:text-white rounded-lg hover:bg-surface-700 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => picked && onLink(picked)}
            disabled={!picked}
            className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white rounded-lg transition-colors"
          >
            Link Bills
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Account detail panel ──────────────────────────────────────────────────

const AccountDetail = ({ account, onClose, onEdit, onUnlink }) => {
  const [statusFilter, setStatusFilter] = useState("");

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["account-bills", account.id, statusFilter],
    queryFn: () => fetchAccountBills(account.id, statusFilter ? { status: statusFilter } : {}),
    staleTime: 60 * 1000,
  });

  const balance = parseFloat(account.balance_due || 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-surface-700 shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </button>
        <Avatar name={account.name} />
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-white truncate">{account.name}</h2>
          <div className="flex items-center gap-3 mt-0.5">
            {account.phone && (
              <span className="flex items-center gap-1 text-[10px] text-surface-400">
                <Phone size={10} />{account.phone}
              </span>
            )}
            {account.email && (
              <span className="flex items-center gap-1 text-[10px] text-surface-400">
                <Mail size={10} />{account.email}
              </span>
            )}
          </div>
        </div>
        <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white transition-colors">
          <Pencil size={14} />
        </button>
      </div>

      {account.notes && (
        <div className="mx-4 mt-3 flex items-start gap-2 px-3 py-2 bg-surface-900/60 border border-surface-700 rounded-lg text-xs text-surface-300">
          <StickyNote size={12} className="text-surface-500 mt-0.5 shrink-0" />
          {account.notes}
        </div>
      )}

      {/* Balance strip */}
      <div className="grid grid-cols-3 gap-px bg-surface-700 border-y border-surface-700 mt-3 shrink-0">
        <div className="bg-surface-800/80 p-3 text-center">
          <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Billed</p>
          <p className="text-sm font-bold text-white tabular-nums mt-0.5">{fmt(account.total_billed)}</p>
        </div>
        <div className="bg-surface-800/80 p-3 text-center">
          <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Paid</p>
          <p className="text-sm font-bold text-emerald-400 tabular-nums mt-0.5">{fmt(account.total_paid)}</p>
        </div>
        <div className={`p-3 text-center ${balance > 0 ? "bg-amber-500/10" : "bg-surface-800/80"}`}>
          <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Balance</p>
          <p className={`text-sm font-bold tabular-nums mt-0.5 ${balance > 0 ? "text-amber-400" : "text-surface-500"}`}>
            {fmt(balance)}
          </p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5 px-3 py-2 border-b border-surface-700 shrink-0 overflow-x-auto scrollbar-hide">
        {[
          { key: "", label: "All" },
          { key: "open", label: "Open" },
          { key: "awaiting_confirmation", label: "Pending" },
          { key: "completed", label: "Closed" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === key ? "bg-primary-600/20 text-primary-400" : "bg-surface-700 text-surface-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bills */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-surface-400" />
          </div>
        ) : bills.length === 0 ? (
          <div className="py-16 text-center text-surface-500 text-sm">No bills found</div>
        ) : (
          <div className="divide-y divide-surface-700/30">
            {bills.map((bill) => {
              const items = (bill.rounds || []).flatMap((r) => r.round_items || []);
              const billBalance = parseFloat(bill.balance_due || 0);
              return (
                <div key={bill.id} className="p-4 hover:bg-surface-700/10 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_BADGE[bill.status] || "bg-surface-600/30 text-surface-400"}`}>
                          {STATUS_LABEL[bill.status] || bill.status}
                        </span>
                        <span className="text-xs text-surface-500">{fmtDate(bill.created_at)}</span>
                      </div>
                      <p className="text-xs text-surface-400 mt-0.5">
                        {items.length} item{items.length !== 1 ? "s" : ""}
                        {bill.customer_name && bill.customer_name !== account.name && (
                          <span className="ml-1 text-surface-600">· as "{bill.customer_name}"</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-start gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-white tabular-nums">{fmt(bill.total_amount)}</p>
                        {billBalance > 0 && (
                          <p className="text-xs text-amber-400 tabular-nums">Bal: {fmt(billBalance)}</p>
                        )}
                      </div>
                      <button
                        onClick={() => onUnlink(bill)}
                        title="Unlink this bill"
                        className="p-1 rounded text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Link2 size={12} />
                      </button>
                    </div>
                  </div>
                  {items.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs text-surface-500">
                          <span className="truncate mr-2">{item.product?.name || "—"}</span>
                          <span className="tabular-nums shrink-0">{item.quantity} × {fmt(item.price)}</span>
                        </div>
                      ))}
                      {items.length > 3 && <p className="text-[10px] text-surface-600">+{items.length - 3} more</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Name group (expandable with per-bill checkboxes) ────────────────────

const NameGroup = ({ nameRow, accounts, onDone }) => {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [createModal, setCreateModal] = useState(false);
  const [linkModal, setLinkModal] = useState(false);

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["unlinked-bills", nameRow.name],
    queryFn: () => fetchUnlinkedBillsForName(nameRow.name),
    enabled: expanded,
    staleTime: 30 * 1000,
  });

  const allIds = bills.map((b) => b.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(allIds));

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["customers"] });
    qc.invalidateQueries({ queryKey: ["unlinked-names"] });
    qc.invalidateQueries({ queryKey: ["unlinked-bills", nameRow.name] });
    onDone?.();
  };

  const createMutation = useMutation({
    mutationFn: async ({ form }) => {
      const customer = await createCustomerAccount(form);
      const ids = selected.size > 0 ? [...selected] : allIds;
      await linkBillsToAccount({ id: customer.id, billIds: ids });
      return customer;
    },
    onSuccess: () => { invalidate(); toast.success("Account created and bills linked"); setCreateModal(false); },
    onError: () => toast.error("Failed to create account"),
  });

  const linkMutation = useMutation({
    mutationFn: (accountId) => {
      const ids = selected.size > 0 ? [...selected] : allIds;
      return linkBillsToAccount({ id: accountId, billIds: ids });
    },
    onSuccess: () => { invalidate(); toast.success("Bills linked"); setLinkModal(false); },
    onError: () => toast.error("Failed to link bills"),
  });

  const selectedCount = selected.size || allIds.length;
  const computeItems = (bill) => (bill.rounds || []).flatMap((r) => r.round_items || []);

  return (
    <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
      {/* Name header row */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-700/30 transition-colors text-left"
      >
        <Avatar name={nameRow.name} size="sm" />
        <div className="flex-1 min-w-0">
          <span className="font-medium text-white">{nameRow.name}</span>
          <span className="ml-2 text-xs text-surface-500">{nameRow.bill_count} open bill{nameRow.bill_count !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-4 text-xs shrink-0">
          <span className="hidden sm:block text-surface-400 tabular-nums">{fmt(nameRow.total_billed)}</span>
          {parseFloat(nameRow.balance_due) > 0 && (
            <span className="text-amber-400 font-semibold tabular-nums">Bal: {fmt(nameRow.balance_due)}</span>
          )}
          <ChevronRight size={14} className={`text-surface-500 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>

      {/* Expanded bill list */}
      {expanded && (
        <div className="border-t border-surface-700">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-surface-400" />
            </div>
          ) : bills.length === 0 ? (
            <p className="text-center text-surface-500 text-sm py-6">No open bills found</p>
          ) : (
            <>
              {/* Select-all row */}
              <div className="flex items-center gap-3 px-4 py-2 bg-surface-900/40 border-b border-surface-700/50">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded accent-primary-500 cursor-pointer"
                />
                <span className="text-xs text-surface-400">
                  {allSelected ? "Deselect all" : "Select all"} ({allIds.length})
                </span>
              </div>

              {/* Individual bills */}
              <div className="divide-y divide-surface-700/30">
                {bills.map((bill) => {
                  const items = computeItems(bill);
                  const isChecked = selected.has(bill.id);
                  return (
                    <div
                      key={bill.id}
                      onClick={() => toggle(bill.id)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${isChecked ? "bg-primary-600/8" : "hover:bg-surface-700/20"}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(bill.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 w-4 h-4 rounded accent-primary-500 cursor-pointer shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_BADGE[bill.status] || "bg-surface-600/30 text-surface-400"}`}>
                            {STATUS_LABEL[bill.status] || bill.status}
                          </span>
                          <span className="text-xs text-surface-500">{fmtDate(bill.created_at)}</span>
                          <span className="text-xs text-surface-600">#{bill.id.slice(0, 8)}</span>
                        </div>
                        {items.length > 0 && (
                          <p className="text-xs text-surface-500 mt-0.5 truncate">
                            {items.slice(0, 3).map((i) => i.product?.name).join(", ")}
                            {items.length > 3 ? ` +${items.length - 3}` : ""}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-white tabular-nums">{fmt(bill.total_amount)}</p>
                        {parseFloat(bill.balance_due) > 0 && (
                          <p className="text-xs text-amber-400 tabular-nums">Bal: {fmt(bill.balance_due)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-surface-700 bg-surface-900/40">
                <span className="text-xs text-surface-500">
                  {selected.size > 0 ? `${selected.size} selected` : `All ${allIds.length} will be linked`}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLinkModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Link2 size={12} /> Link to existing
                  </button>
                  <button
                    onClick={() => setCreateModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 rounded-lg text-xs font-medium transition-colors"
                  >
                    <UserPlus size={12} /> Create account
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {createModal && (
        <AccountModal
          linkName={nameRow.name}
          onClose={() => setCreateModal(false)}
          onSave={(form) => createMutation.mutate({ form })}
        />
      )}
      {linkModal && (
        <LinkModal
          unlinked={{ ...nameRow, bill_count: selected.size || allIds.length }}
          accounts={accounts}
          onClose={() => setLinkModal(false)}
          onLink={(accountId) => linkMutation.mutate(accountId)}
        />
      )}
    </div>
  );
};

// ─── Discover Tab ──────────────────────────────────────────────────────────

const DiscoverTab = ({ accounts }) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(window.__discoverTimer);
    window.__discoverTimer = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const { data: names = [], isLoading, refetch } = useQuery({
    queryKey: ["unlinked-names", debouncedSearch],
    queryFn: () => fetchUnlinkedNames(debouncedSearch ? { search: debouncedSearch } : {}),
    staleTime: 60 * 1000,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-primary-600/10 border border-primary-500/30 rounded-xl">
        <Eye size={16} className="text-primary-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-primary-300">Customer Name Discovery</p>
          <p className="text-xs text-surface-400 mt-0.5">
            These are open bills with customer names not yet linked to an account.
            Expand a name, select individual bills, then create or link to an account.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Filter names…"
          className="w-full pl-8 pr-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-surface-400" />
        </div>
      ) : names.length === 0 ? (
        <div className="py-16 text-center">
          <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-700" />
          <p className="text-surface-400 font-medium">All names have been confirmed</p>
          <p className="text-xs text-surface-600 mt-1">No unlinked customer names remain</p>
        </div>
      ) : (
        <div className="space-y-2">
          {names.map((n) => (
            <NameGroup key={n.name} nameRow={n} accounts={accounts} onDone={() => refetch()} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Accounts Tab ──────────────────────────────────────────────────────────

const AccountsTab = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(window.__crmSearchTimer);
    window.__crmSearchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["customers", debouncedSearch],
    queryFn: () => fetchCustomerAccounts(debouncedSearch ? { search: debouncedSearch } : {}),
    staleTime: 2 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: createCustomerAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer created");
      setCreateModal(false);
    },
    onError: () => toast.error("Failed to create customer"),
  });

  const updateMutation = useMutation({
    mutationFn: updateCustomerAccount,
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      if (selected?.id === updated.id) setSelected((s) => ({ ...s, ...updated }));
      toast.success("Customer updated");
      setEditModal(null);
    },
    onError: () => toast.error("Failed to update customer"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomerAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      if (selected?.id === deleteConfirm?.id) setSelected(null);
      toast.success("Customer deleted");
      setDeleteConfirm(null);
    },
    onError: () => toast.error("Failed to delete customer"),
  });

  const unlinkMutation = useMutation({
    mutationFn: unlinkBillFromAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["account-bills", selected?.id] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["unlinked-names"] });
      toast.success("Bill unlinked");
    },
    onError: () => toast.error("Failed to unlink bill"),
  });

  const totals = useMemo(() => ({
    count: accounts.length,
    billed: accounts.reduce((s, c) => s + parseFloat(c.total_billed || 0), 0),
    paid: accounts.reduce((s, c) => s + parseFloat(c.total_paid || 0), 0),
    balance: accounts.reduce((s, c) => s + parseFloat(c.balance_due || 0), 0),
  }), [accounts]);

  return (
    <div className="flex gap-0 md:gap-5 min-h-0">
      {/* Left: list */}
      <div className={`flex flex-col flex-1 min-w-0 space-y-4 ${selected ? "hidden md:flex" : ""}`}>
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1"><Users size={13} className="text-primary-400" /><span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Accounts</span></div>
            <p className="text-xl font-bold text-white">{totals.count}</p>
          </div>
          <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1"><TrendingUp size={13} className="text-emerald-400" /><span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Total Billed</span></div>
            <p className="text-xl font-bold text-white tabular-nums">{fmt(totals.billed)}</p>
          </div>
          <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1"><CreditCard size={13} className="text-blue-400" /><span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Collected</span></div>
            <p className="text-xl font-bold text-emerald-400 tabular-nums">{fmt(totals.paid)}</p>
          </div>
          <div className={`border rounded-xl p-3 ${totals.balance > 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-surface-800/30 border-surface-700/50"}`}>
            <div className="flex items-center gap-2 mb-1"><AlertCircle size={13} className={totals.balance > 0 ? "text-amber-400" : "text-surface-500"} /><span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Outstanding</span></div>
            <p className={`text-xl font-bold tabular-nums ${totals.balance > 0 ? "text-amber-400" : "text-surface-500"}`}>{fmt(totals.balance)}</p>
          </div>
        </div>

        {/* Search + New */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search accounts…"
              className="w-full pl-8 pr-8 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {search && (
              <button onClick={() => handleSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            <Plus size={15} /> New
          </button>
        </div>

        {/* List */}
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-surface-400" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-20 text-center">
              <Users size={36} className="mx-auto mb-3 text-surface-700" />
              <p className="text-surface-500 text-sm">No customer accounts yet</p>
              <p className="text-xs text-surface-600 mt-1">Use the Discover tab to create accounts from bill names</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700 bg-surface-900/40">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Customer</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Bills</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Billed</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Paid</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Balance</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Last Visit</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700/30">
                    {accounts.map((c) => {
                      const bal = parseFloat(c.balance_due || 0);
                      const isSel = selected?.id === c.id;
                      return (
                        <tr key={c.id} onClick={() => setSelected(c)} className={`cursor-pointer transition-colors ${isSel ? "bg-primary-600/10" : "hover:bg-surface-700/20"}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={c.name} size="sm" />
                              <div>
                                <p className="font-medium text-white">{c.name}</p>
                                {c.phone && <p className="text-[10px] text-surface-500">{c.phone}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <div className="flex items-center justify-end gap-2">
                              {c.open_bills > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">{c.open_bills} open</span>
                              )}
                              <span className="text-surface-300">{c.total_bills}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-white font-medium tabular-nums">{fmt(c.total_billed)}</td>
                          <td className="px-4 py-3 text-right text-emerald-400 tabular-nums">{fmt(c.total_paid)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span className={bal > 0 ? "text-amber-400 font-semibold" : "text-surface-600"}>{fmt(bal)}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-surface-400 text-xs">{c.last_visit ? fmtDate(c.last_visit) : "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c); }}
                                className="p-1.5 rounded text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                              <ChevronRight size={14} className="text-surface-600" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <MobileCardList>
                {accounts.map((c) => {
                  const bal = parseFloat(c.balance_due || 0);
                  return (
                    <MobileCard key={c.id} onClick={() => setSelected(c)}>
                      <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar name={c.name} size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-white text-sm truncate">{c.name}</p>
                            {c.phone && <p className="text-[10px] text-surface-500">{c.phone}</p>}
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-surface-600 shrink-0" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                        <div>
                          <p className="text-surface-500">Billed</p>
                          <p className="text-white font-medium tabular-nums">{fmt(c.total_billed)}</p>
                        </div>
                        <div>
                          <p className="text-surface-500">Paid</p>
                          <p className="text-emerald-400 tabular-nums">{fmt(c.total_paid)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-surface-500">Balance</p>
                          <p className={`font-semibold tabular-nums ${bal > 0 ? "text-amber-400" : "text-surface-600"}`}>{fmt(bal)}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-surface-500 mt-1">
                        {c.total_bills} bill{c.total_bills !== 1 ? "s" : ""}
                        {c.open_bills > 0 ? ` · ${c.open_bills} open` : ""}
                        {c.last_visit ? ` · ${fmtDate(c.last_visit)}` : ""}
                      </p>
                    </MobileCard>
                  );
                })}
              </MobileCardList>
            </>
          )}
        </div>
      </div>

      {/* Right: detail panel */}
      {selected && (
        <div className="w-full md:w-[420px] bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden flex flex-col md:max-h-[calc(100vh-10rem)]">
          <AccountDetail
            account={selected}
            onClose={() => setSelected(null)}
            onEdit={() => setEditModal(selected)}
            onUnlink={(bill) => unlinkMutation.mutate({ customerId: selected.id, billId: bill.id })}
          />
        </div>
      )}

      {/* Modals */}
      {createModal && (
        <AccountModal onClose={() => setCreateModal(false)} onSave={createMutation.mutate} />
      )}
      {editModal && (
        <AccountModal initial={editModal} onClose={() => setEditModal(null)} onSave={updateMutation.mutate} />
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="w-full max-w-sm bg-surface-800 border border-surface-700 rounded-xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-white mb-2">Delete Customer?</h3>
            <p className="text-sm text-surface-400 mb-4">
              This will remove <strong className="text-white">{deleteConfirm.name}</strong> and unlink all their bills. The bills themselves are kept.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-surface-400 hover:text-white rounded-lg hover:bg-surface-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────

const CRMPage = () => {
  const [tab, setTab] = useState("accounts");

  const { data: accounts = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => fetchCustomerAccounts(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: unlinkedCount = 0 } = useQuery({
    queryKey: ["unlinked-names-count"],
    queryFn: async () => {
      const names = await fetchUnlinkedNames();
      return names.length;
    },
    staleTime: 2 * 60 * 1000,
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-600/20 rounded-lg">
            <Users size={22} className="text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">CRM</h1>
            <p className="text-sm text-surface-400">Customer accounts &amp; relationship management</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-700">
        {[
          { id: "accounts", label: "Accounts", icon: Users },
          { id: "discover", label: "Discover", icon: Eye, badge: unlinkedCount },
        ].map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
              tab === id ? "text-primary-400" : "text-surface-400 hover:text-surface-200"
            }`}
          >
            <Icon size={15} />
            {label}
            {badge > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full leading-none">
                {badge}
              </span>
            )}
            {tab === id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />}
          </button>
        ))}
      </div>

      {tab === "accounts" && <AccountsTab />}
      {tab === "discover" && <DiscoverTab accounts={accounts} />}
    </div>
  );
};

export default CRMPage;
