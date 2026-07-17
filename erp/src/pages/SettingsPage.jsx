import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Target,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Info,
  Building2,
  Loader2,
  Pencil,
  Trash2,
  X,
  Check,
  BookOpen,
  Shield,
  BarChart3,
  UserCircle,
  Package,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  fetchYearlyTargets,
  saveBusinessTarget,
  bulkUpdateTargets,
  fetchAllUserTargets,
  bulkUpdateUserTargets,
} from "@/services/targets.service";
import { useUsers } from "@/hooks/useUsers";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import {
  useAccountClasses,
  useCreateAccountClass,
  useUpdateAccountClass,
  useDeleteAccountClass,
} from "@/hooks/useAccountClasses";
import {
  useSystemRoles,
  useCreateSystemRole,
  useUpdateSystemRole,
  useDeleteSystemRole,
} from "@/hooks/useSystemRoles";
import {
  useReorderPolicies,
  useReorderSettings,
  useUpdateReorderSettings,
  useRefreshReorderLevels,
  useSetManualReorderLevel,
  useClearReorderOverride,
} from "@/hooks/useInventory";
import { useCategories } from "@/hooks/useCategories";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { inputCls } from "@/utils/constants";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const CATEGORIES = ["asset", "liability", "equity", "income", "expense"];

const CAPABILITIES = [
  {
    key: "pos_access",
    label: "POS Access",
    description: "Can use the POS ordering system",
  },
  {
    key: "stock_take",
    label: "Stock Take",
    description: "Can perform stock takes from POS",
  },
  {
    key: "erp_access",
    label: "ERP Access",
    description: "Can access the ERP back-office",
  },
  {
    key: "approve_payments",
    label: "Approve Payments",
    description: "Can confirm payment requests",
  },
  {
    key: "view_all_bills",
    label: "View All Bills",
    description: "Can see all bills, not just own",
  },
  {
    key: "z_report",
    label: "Z-Report",
    description: "Can view the end-of-day Z-Report on POS",
  },
  {
    key: "weekly_sales",
    label: "Weekly Sales",
    description: "Can view the weekly sales summary on POS",
  },
  {
    key: "exchange_items",
    label: "Approve Item Exchanges",
    description: "Can authorize item exchanges on open bills",
  },
  {
    key: "stocktake_reports",
    label: "Stock Take Reports",
    description: "Can view the read-only stock take reports on POS",
  },
  {
    key: "manage_products",
    label: "Manage Products",
    description: "Can create, update, and archive products",
  },
  {
    key: "manage_categories",
    label: "Manage Categories",
    description: "Can create, update, and archive product categories",
  },
  {
    key: "process_payments",
    label: "Process Payments",
    description: "Can record and process customer payments",
  },
  {
    key: "manage_feedback",
    label: "Manage Feedback",
    description: "Can mark customer feedback as read or archive it",
  },
  {
    key: "reconcile_bank",
    label: "Reconcile Bank",
    description: "Can match and unmatch bank statement lines",
  },
  {
    key: "view_reports",
    label: "View Reports",
    description: "Can access financial and performance reports",
  },
  {
    key: "view_audit_trail",
    label: "View Audit Trail",
    description: "Can access the full system audit trail and activity log",
  },
  {
    key: "receive_goods",
    label: "Receive Goods",
    description: "Can submit goods receipts from POS (pending approval unless also has Approve Receipts)",
  },
  {
    key: "approve_receipts",
    label: "Approve Receipts",
    description: "Can approve or reject pending goods receipts — combined with Receive Goods grants auto-approval",
  },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
  }).format(value || 0);

const parseCurrency = (value) => {
  if (!value) return 0;
  return parseFloat(value.toString().replace(/[^0-9.-]+/g, "")) || 0;
};

const EMPTY = [];
const labelCls = "block text-sm font-medium text-surface-300 mb-1";

// ==========================================
// 1. ORGANISATION TAB (Original)
// ==========================================
const FIELDS = [
  {
    key: "organisation_name",
    label: "Organisation Name",
    placeholder: "e.g. Fairy Wren Limited",
  },
  { key: "currency", label: "Currency", placeholder: "e.g. KES" },
  { key: "tax_pin", label: "Tax PIN", placeholder: "e.g. P0123456789A" },
  {
    key: "address",
    label: "Address",
    placeholder: "e.g. 123 Main St, Nairobi",
  },
  { key: "phone", label: "Phone", placeholder: "e.g. +254 700 000000" },
  { key: "email", label: "Email", placeholder: "e.g. info@company.co.ke" },
];

const OrganisationTab = () => {
  const { data: settings, isLoading } = useSettings();
  const { data: systemRoles = [] } = useSystemRoles();
  const updateMutation = useUpdateSettings();
  const [form, setForm] = useState({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(form, {
      onSuccess: () => toast.success("Settings saved"),
      onError: () => toast.error("Failed to save settings"),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-surface-400" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-surface-400">
          Configure your organisation details used across the system.
        </p>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex justify-center sm:justify-start items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {updateMutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save Changes
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className={labelCls}>{label}</label>
            <input
              type="text"
              className={inputCls}
              placeholder={placeholder}
              value={form[key] ?? ""}
              onChange={(e) => handleChange(key, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* POS Operations */}
      <div className="mt-6 pt-6 border-t border-surface-700">
        <h3 className="text-sm font-semibold text-surface-200 mb-1">POS Operations</h3>
        <p className="text-xs text-surface-400 mb-4">
          Configure operational controls for the point-of-sale system.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Exchange Approver Role</label>
            <select
              className={inputCls}
              value={form.exchange_approver_role ?? "manager"}
              onChange={(e) => handleChange("exchange_approver_role", e.target.value)}
            >
              {systemRoles.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-surface-500 mt-1">
              PIN from a user with this role (or owner) is required to authorize an item exchange.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. BUSINESS TARGETS TAB (New)
// ==========================================
const BusinessTargetsTab = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [overrides, setOverrides] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Performance thresholds (global settings)
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const savedGmTarget = parseFloat(settings?.gross_margin_target ?? 35);
  const [gmTarget, setGmTarget] = useState("");
  const [gmEditing, setGmEditing] = useState(false);

  const displayGmTarget = gmEditing ? gmTarget : savedGmTarget;

  const handleGmSave = () => {
    const val = parseFloat(gmTarget);
    if (isNaN(val) || val < 1 || val > 100) {
      toast.error("Enter a margin target between 1 and 100");
      return;
    }
    updateSettings.mutate(
      { gross_margin_target: val.toString() },
      {
        onSuccess: () => {
          toast.success("Gross margin target updated");
          setGmEditing(false);
        },
        onError: () => toast.error("Failed to update setting"),
      },
    );
  };

  const queryClient = useQueryClient();

  const { data: yearlyTargets = EMPTY, isLoading: targetsLoading } = useQuery({
    queryKey: ["business-targets", selectedYear],
    queryFn: () => fetchYearlyTargets(selectedYear),
  });

  // Build complete targets: fetched data merged with user overrides
  const baseTargets = useMemo(() => {
    const targetsMap = new Map(yearlyTargets.map((t) => [t.month, t]));
    const result = {};
    for (let month = 1; month <= 12; month++) {
      const existing = targetsMap.get(month);
      result[month] = existing
        ? { ...existing }
        : {
            year: selectedYear,
            month,
            target_revenue: 0,
            target_gross_margin: 35,
            target_cash_reserve_days: 30,
            default_staff_target_revenue: 50000,
          };
    }
    return result;
  }, [yearlyTargets, selectedYear]);

  // Reset overrides when base data changes (adjust state during render)
  const [prevYearlyTargets, setPrevYearlyTargets] = useState(yearlyTargets);
  if (yearlyTargets !== prevYearlyTargets) {
    setPrevYearlyTargets(yearlyTargets);
    setOverrides({});
    setHasChanges(false);
  }

  // Merge base with overrides for display/save
  const editedTargets = useMemo(() => {
    const merged = {};
    for (let month = 1; month <= 12; month++) {
      merged[month] = { ...baseTargets[month], ...overrides[month] };
    }
    return merged;
  }, [baseTargets, overrides]);

  const saveTargetMutation = useMutation({
    mutationFn: saveBusinessTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-targets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success("Target saved successfully");
      setHasChanges(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to save target");
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ year, targets }) => bulkUpdateTargets(year, targets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-targets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success("All targets saved successfully");
      setHasChanges(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to save targets");
    },
  });

  const handleTargetChange = (month, field, value) => {
    setOverrides((prev) => ({
      ...prev,
      [month]: {
        ...prev[month],
        [field]:
          field.includes("revenue") || field.includes("value")
            ? parseCurrency(value)
            : parseFloat(value) || 0,
      },
    }));
    setHasChanges(true);
  };

  const handleSaveMonth = async (month) => {
    const target = editedTargets[month];
    if (!target) return;

    await saveTargetMutation.mutateAsync({
      year: selectedYear,
      month,
      target_revenue: target.target_revenue,
      target_gross_margin: target.target_gross_margin,
      target_cash_reserve_days: target.target_cash_reserve_days,
      default_staff_target_revenue: target.default_staff_target_revenue,
    });
  };

  const handleSaveAll = async () => {
    const targetsArray = Object.values(editedTargets).map((t) => ({
      ...t,
      year: selectedYear,
    }));

    await bulkUpdateMutation.mutateAsync({
      year: selectedYear,
      targets: targetsArray,
    });
  };

  const applyGrowthRate = (growthPercent) => {
    const multiplier = 1 + growthPercent / 100;
    const newTargets = {};

    Object.keys(editedTargets).forEach((month, index) => {
      const current = editedTargets[month];
      let baseRevenue = current.target_revenue;

      if (index === 0 && (!baseRevenue || baseRevenue === 0)) {
        baseRevenue = 1000000;
      }

      const monthsElapsed = index;
      const newRevenue = Math.round(
        baseRevenue * Math.pow(multiplier, monthsElapsed),
      );

      newTargets[month] = {
        ...current,
        target_revenue: newRevenue,
      };
    });

    setOverrides(newTargets);
    setHasChanges(true);
    toast.success(`Applied ${growthPercent}% monthly growth rate`);
  };

  if (targetsLoading) return <LoadingSpinner message="Loading targets..." />;

  return (
    <div className="space-y-4">
      {/* Year Selector & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Calendar size={18} className="text-primary-400" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-white text-sm focus:outline-none focus:border-primary-500"
          >
            {Array.from(
              { length: 5 },
              (_, i) => new Date().getFullYear() - 2 + i,
            ).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <span className="text-xs text-surface-400 shrink-0">Quick Apply:</span>
          <button
            onClick={() => applyGrowthRate(10)}
            className="shrink-0 text-xs px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-white rounded-lg"
          >
            +10%/month
          </button>
          <button
            onClick={() => applyGrowthRate(5)}
            className="shrink-0 text-xs px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-white rounded-lg"
          >
            +5%/month
          </button>
          <button
            onClick={() => applyGrowthRate(0)}
            className="shrink-0 text-xs px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-white rounded-lg"
          >
            Flat
          </button>
          {hasChanges && (
            <button
              onClick={handleSaveAll}
              disabled={bulkUpdateMutation.isPending}
              className="shrink-0 flex items-center gap-2 px-4 py-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-xs rounded-lg"
            >
              <Save size={12} />
              Save All
            </button>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <Info size={16} className="text-blue-400 mt-0.5" />
        <div className="text-sm">
          <p className="text-blue-400 font-medium">Auto-Fallback Enabled</p>
          <p className="text-surface-400 text-xs mt-1">
            When targets are not set, the system automatically calculates them
            as:
            <span className="text-blue-400 font-medium">
              {" "}
              Previous Month Actual + 10%
            </span>
          </p>
        </div>
      </div>

      {/* Performance Thresholds */}
      <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-primary-400" />
          <h3 className="text-sm font-semibold text-white">Performance Thresholds</h3>
          <span className="text-xs text-surface-500">— global defaults used across dashboard alerts and pricing analysis</span>
        </div>

        <div className="flex items-start gap-6 flex-wrap">
          <div className="min-w-52">
            <label className={labelCls}>Gross Margin Target (%)</label>
            <div className="flex items-center gap-2">
              {gmEditing ? (
                <>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="0.5"
                    value={gmTarget}
                    onChange={(e) => setGmTarget(e.target.value)}
                    autoFocus
                    className="w-24 px-3 py-2 rounded-lg bg-surface-800 border border-primary-500 text-white text-sm focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleGmSave();
                      if (e.key === "Escape") setGmEditing(false);
                    }}
                  />
                  <button
                    onClick={handleGmSave}
                    disabled={updateSettings.isPending}
                    className="p-2 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white transition-colors"
                  >
                    {updateSettings.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                  <button
                    onClick={() => setGmEditing(false)}
                    className="p-2 rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-white">{savedGmTarget}%</span>
                  <button
                    onClick={() => { setGmTarget(savedGmTarget.toString()); setGmEditing(true); }}
                    className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                </>
              )}
            </div>
            <p className="text-xs text-surface-500 mt-1.5">
              Products priced below this threshold are flagged in the "Review Pricing" dashboard alert.
            </p>
          </div>
        </div>
      </div>

      {/* Targets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
          const target = editedTargets[month] || {};
          const isAutoGenerated = target.isAutoGenerated;
          const isCurrentMonth =
            month === new Date().getMonth() + 1 &&
            selectedYear === new Date().getFullYear();

          return (
            <div
              key={month}
              className={`bg-surface-800/30 border rounded-xl p-4 ${isCurrentMonth ? "border-primary-500/50 ring-1 ring-primary-500/20" : "border-surface-700/50"}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {MONTHS[month - 1]}
                  </span>
                  {isCurrentMonth && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary-500/20 text-primary-400 rounded">
                      Current
                    </span>
                  )}
                  {isAutoGenerated && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded"
                      title="Auto-calculated"
                    >
                      Auto
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleSaveMonth(month)}
                  disabled={saveTargetMutation.isPending}
                  className="p-1.5 text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 rounded transition-colors"
                >
                  <Save size={14} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-surface-400 flex items-center gap-1 mb-1">
                    <DollarSign size={12} />
                    Revenue Target (KES)
                  </label>
                  <input
                    type="text"
                    value={
                      target.target_revenue
                        ? formatCurrency(target.target_revenue)
                            .replace("KES", "")
                            .trim()
                        : ""
                    }
                    onChange={(e) =>
                      handleTargetChange(
                        month,
                        "target_revenue",
                        e.target.value,
                      )
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-400 flex items-center gap-1 mb-1">
                    <TrendingUp size={12} />
                    Gross Margin Target (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={target.target_gross_margin || 35}
                      onChange={(e) =>
                        handleTargetChange(
                          month,
                          "target_gross_margin",
                          e.target.value,
                        )
                      }
                      className="flex-1 px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-sm"
                    />
                    <span className="text-sm text-surface-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-surface-400 mb-1 block">
                    Cash Reserve (Days)
                  </label>
                  <input
                    type="number"
                    min="7"
                    max="90"
                    value={target.target_cash_reserve_days || 30}
                    onChange={(e) =>
                      handleTargetChange(
                        month,
                        "target_cash_reserve_days",
                        e.target.value,
                      )
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// 3. STAFF TARGETS TAB (New)
// ==========================================
export const StaffTargetsTab = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [staffOverrides, setStaffOverrides] = useState({});

  const queryClient = useQueryClient();
  const { data: users = EMPTY } = useUsers();
  const activeStaff = useMemo(
    () => users.filter((u) => u.active !== false && u.role?.toLowerCase() !== "owner"),
    [users],
  );

  const { data: staffTargets = EMPTY, isLoading: staffTargetsLoading } = useQuery({
    queryKey: ["user-targets", selectedYear, selectedMonth],
    queryFn: () => fetchAllUserTargets(selectedYear, selectedMonth),
  });

  const existingTargetsMap = useMemo(
    () => staffTargets.reduce((acc, t) => { acc[t.user_id] = t; return acc; }, {}),
    [staffTargets],
  );

  // Reset overrides when underlying data changes (adjust state during render)
  const [prevStaffTargets, setPrevStaffTargets] = useState(staffTargets);
  if (staffTargets !== prevStaffTargets) {
    setPrevStaffTargets(staffTargets);
    setStaffOverrides({});
  }

  // Derive base targets from fetched data + defaults, then merge overrides
  const editedStaffTargets = useMemo(() => {
    const result = {};
    activeStaff.forEach((user) => {
      const existing = existingTargetsMap[user.id];
      const base = {
        user_id: user.id,
        year: selectedYear,
        month: selectedMonth,
        target_revenue: existing?.target_revenue || 50000,
        target_bill_count: existing?.target_bill_count || "",
        target_avg_bill_value: existing?.target_avg_bill_value || "",
      };
      result[user.id] = { ...base, ...staffOverrides[user.id] };
    });
    return result;
  }, [activeStaff, existingTargetsMap, staffOverrides, selectedYear, selectedMonth]);

  const bulkUpdateStaffMutation = useMutation({
    mutationFn: ({ year, month, targets }) =>
      bulkUpdateUserTargets(year, month, targets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-targets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success("Staff targets saved successfully");
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message || "Failed to save staff targets",
      );
    },
  });

  const handleStaffTargetChange = (userId, field, value) => {
    setStaffOverrides((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]:
          field === "target_revenue" || field === "target_avg_bill_value"
            ? parseCurrency(value)
            : parseInt(value) || "",
      },
    }));
  };

  const handleApplyToAll = (field, value) => {
    const newOverrides = {};
    activeStaff.forEach((user) => {
      newOverrides[user.id] = {
        ...staffOverrides[user.id],
        [field]:
          field === "target_revenue"
            ? parseCurrency(value)
            : parseInt(value) || "",
      };
    });
    setStaffOverrides(newOverrides);
  };

  const handleSave = async () => {
    await bulkUpdateStaffMutation.mutateAsync({
      year: selectedYear,
      month: selectedMonth,
      targets: Object.values(editedStaffTargets),
    });
  };

  if (staffTargetsLoading)
    return <LoadingSpinner message="Loading staff targets..." />;

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col gap-3 bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
        {/* Date pickers */}
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={16} className="text-primary-400 shrink-0" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="flex-1 min-w-[90px] px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-white text-sm"
          >
            {Array.from(
              { length: 5 },
              (_, i) => new Date().getFullYear() - 2 + i,
            ).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="flex-1 min-w-[120px] px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-white text-sm"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Apply to all + Save */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-surface-700/30">
          <span className="text-xs text-surface-400 shrink-0">Apply revenue to all:</span>
          <input
            type="text"
            placeholder="e.g. 50,000"
            onChange={(e) => handleApplyToAll("target_revenue", e.target.value)}
            className="flex-1 px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-sm"
          />
          <button
            onClick={handleSave}
            disabled={bulkUpdateStaffMutation.isPending}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 active:scale-95 disabled:opacity-50 text-white text-sm rounded-lg transition-all shrink-0"
          >
            <Save size={14} />
            {bulkUpdateStaffMutation.isPending ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeStaff.map((user) => {
          const target = editedStaffTargets[user.id] || {};
          const hasExisting = existingTargetsMap[user.id];

          return (
            <div
              key={user.id}
              className={`bg-surface-800/30 border rounded-xl overflow-hidden ${hasExisting ? "border-surface-700/50" : "border-surface-700/30 opacity-75"}`}
            >
              {/* Card header */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-surface-700/40">
                <div className="w-9 h-9 rounded-full bg-primary-500/20 flex items-center justify-center shrink-0">
                  <span className="text-primary-400 font-semibold text-sm">
                    {user.name?.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-xs text-surface-500 capitalize">
                    {user.role || "Staff"}
                  </p>
                </div>
                {!hasExisting && (
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-surface-700 text-surface-400 rounded-md">
                    Default
                  </span>
                )}
              </div>

              {/* Inputs */}
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs text-surface-400 mb-1 block">
                    Revenue Target (KES)
                  </label>
                  <input
                    type="text"
                    value={
                      target.target_revenue
                        ? formatCurrency(target.target_revenue)
                            .replace("KES", "")
                            .trim()
                        : ""
                    }
                    onChange={(e) =>
                      handleStaffTargetChange(
                        user.id,
                        "target_revenue",
                        e.target.value,
                      )
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-surface-400 mb-1 block">
                      Bill Count
                    </label>
                    <input
                      type="number"
                      value={target.target_bill_count || ""}
                      onChange={(e) =>
                        handleStaffTargetChange(
                          user.id,
                          "target_bill_count",
                          e.target.value,
                        )
                      }
                      placeholder="Optional"
                      className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-surface-400 mb-1 block">
                      Avg Bill (KES)
                    </label>
                    <input
                      type="text"
                      value={
                        target.target_avg_bill_value
                          ? formatCurrency(target.target_avg_bill_value)
                              .replace("KES", "")
                              .trim()
                          : ""
                      }
                      onChange={(e) =>
                        handleStaffTargetChange(
                          user.id,
                          "target_avg_bill_value",
                          e.target.value,
                        )
                      }
                      placeholder="Optional"
                      className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// 4. ACCOUNT CLASSES TAB (Original)
// ==========================================
const MOBILE_CLASS_PAGE_SIZE = 5;

const AccountClassesTab = () => {
  const { data: classes, isLoading } = useAccountClasses();
  const createMutation = useCreateAccountClass();
  const updateMutation = useUpdateAccountClass();
  const deleteMutation = useDeleteAccountClass();
  const [adding, setAdding] = useState(false);
  const [editCode, setEditCode] = useState(null);
  const [form, setForm] = useState({
    code: "",
    label: "",
    category: "asset",
    sort_order: 0,
  });
  const [mobileClassPage, setMobileClassPage] = useState(1);

  useEffect(() => {
    setMobileClassPage(1);
  }, [classes]);

  const resetForm = () => {
    setForm({ code: "", label: "", category: "asset", sort_order: 0 });
    setAdding(false);
    setEditCode(null);
  };

  const handleAdd = () => createMutation.mutate(form, { onSuccess: resetForm });
  const handleUpdate = () =>
    updateMutation.mutate(
      { code: editCode, ...form },
      { onSuccess: resetForm },
    );
  const startEdit = (item) => {
    setEditCode(item.code);
    setForm({
      label: item.label,
      category: item.category,
      sort_order: item.sort_order,
    });
    setAdding(false);
    setMobileClassPage(1);
  };

  const allClasses = classes || [];
  const mobileTotalPages = Math.max(1, Math.ceil(allClasses.length / MOBILE_CLASS_PAGE_SIZE));
  const mobileSafePage = Math.min(mobileClassPage, mobileTotalPages);
  const mobileClasses = allClasses.slice(
    (mobileSafePage - 1) * MOBILE_CLASS_PAGE_SIZE,
    mobileSafePage * MOBILE_CLASS_PAGE_SIZE,
  );

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-surface-400" size={24} />
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-surface-400">
          Define account classifications used in the chart of accounts.
        </p>
        {!adding && !editCode && (
          <button
            onClick={() => {
              setAdding(true);
              setEditCode(null);
              setForm({ code: "", label: "", category: "asset", sort_order: 0 });
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white text-sm rounded-lg transition-all"
          >
            <Plus size={14} /> Add Class
          </button>
        )}
      </div>

      {/* Add / Edit form */}
      {(adding || editCode) && (
        <div className="bg-surface-800 border border-surface-600 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-surface-300 uppercase tracking-wide">
            {adding ? "New Account Class" : "Edit Account Class"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {adding && (
              <div>
                <label className={labelCls}>Code</label>
                <input
                  className={inputCls}
                  placeholder="e.g. current_asset"
                  value={form.code}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, code: e.target.value }))
                  }
                />
              </div>
            )}
            <div>
              <label className={labelCls}>Label</label>
              <input
                className={inputCls}
                placeholder="e.g. Current Asset"
                value={form.label}
                onChange={(e) =>
                  setForm((p) => ({ ...p, label: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select
                className={inputCls}
                value={form.category}
                onChange={(e) =>
                  setForm((p) => ({ ...p, category: e.target.value }))
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Sort Order</label>
              <input
                type="number"
                className={inputCls}
                value={form.sort_order}
                onChange={(e) =>
                  setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))
                }
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              onClick={adding ? handleAdd : handleUpdate}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 active:scale-95 text-white text-sm rounded-lg transition-all"
            >
              <Check size={14} /> {adding ? "Add Class" : "Save Changes"}
            </button>
            <button
              onClick={resetForm}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-surface-700 hover:bg-surface-600 active:scale-95 text-surface-300 text-sm rounded-lg transition-all"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700 text-surface-400 text-left">
              <th className="py-2 px-3 font-medium">Code</th>
              <th className="py-2 px-3 font-medium">Label</th>
              <th className="py-2 px-3 font-medium">Category</th>
              <th className="py-2 px-3 font-medium">Order</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allClasses.map((item) => (
              <tr
                key={item.code}
                className="border-b border-surface-800 hover:bg-surface-800/50"
              >
                <td className="py-2 px-3 text-white font-mono text-xs">
                  {item.code}
                </td>
                <td className="py-2 px-3 text-white">{item.label}</td>
                <td className="py-2 px-3 text-surface-300 capitalize">
                  {item.category}
                </td>
                <td className="py-2 px-3 text-surface-400">
                  {item.sort_order}
                </td>
                <td className="py-2 px-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${item.active ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}
                  >
                    {item.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(item)}
                      className="p-1 text-surface-400 hover:text-primary-400"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${item.label}"?`))
                          deleteMutation.mutate(item.code);
                      }}
                      className="p-1 text-surface-400 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      {allClasses.length === 0 ? (
        <div className="md:hidden text-center py-12 text-surface-400 text-sm">
          No account classes defined yet.
        </div>
      ) : (
        <div className="md:hidden space-y-3">
          {mobileClasses.map((item) => (
            <div
              key={item.code}
              className={`bg-surface-800/50 border rounded-xl overflow-hidden transition-colors ${
                editCode === item.code
                  ? "border-primary-500/50"
                  : "border-surface-700"
              }`}
            >
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white truncate">
                      {item.label}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                        item.active
                          ? "bg-green-900/40 text-green-400"
                          : "bg-red-900/40 text-red-400"
                      }`}
                    >
                      {item.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-surface-500 mt-0.5 block">
                    {item.code}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => startEdit(item)}
                    className="p-2 rounded-lg text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 active:scale-95 transition-all"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${item.label}"?`))
                        deleteMutation.mutate(item.code);
                    }}
                    className="p-2 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="px-4 pb-4 border-t border-surface-700/50 pt-3">
                <div className="flex items-center gap-3 text-xs text-surface-400">
                  <span className="capitalize bg-surface-700/60 px-2 py-0.5 rounded-md">
                    {item.category}
                  </span>
                  <span className="text-surface-500">Order: {item.sort_order}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {mobileTotalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setMobileClassPage((p) => Math.max(1, p - 1))}
                disabled={mobileSafePage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-surface-300 bg-surface-700 hover:bg-surface-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="text-xs text-surface-400">
                {mobileSafePage} / {mobileTotalPages}
                <span className="text-surface-600 ml-1">({allClasses.length} total)</span>
              </span>
              <button
                onClick={() => setMobileClassPage((p) => Math.min(mobileTotalPages, p + 1))}
                disabled={mobileSafePage === mobileTotalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-surface-300 bg-surface-700 hover:bg-surface-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 5. SYSTEM ROLES TAB (Original)
// ==========================================
export const SystemRolesTab = () => {
  const { data: roles, isLoading } = useSystemRoles();
  const createMutation = useCreateSystemRole();
  const updateMutation = useUpdateSystemRole();
  const deleteMutation = useDeleteSystemRole();
  const [adding, setAdding] = useState(false);
  const [editCode, setEditCode] = useState(null);
  const [permEditCode, setPermEditCode] = useState(null);
  const [permDraft, setPermDraft] = useState([]);
  const [form, setForm] = useState({ code: "", label: "", sort_order: 0 });

  const resetForm = () => {
    setForm({ code: "", label: "", sort_order: 0 });
    setAdding(false);
    setEditCode(null);
  };
  const handleAdd = () => createMutation.mutate(form, { onSuccess: resetForm });
  const handleUpdate = () =>
    updateMutation.mutate(
      { code: editCode, ...form },
      { onSuccess: resetForm },
    );
  const startEdit = (item) => {
    setEditCode(item.code);
    setForm({ label: item.label, sort_order: item.sort_order });
    setAdding(false);
    setPermEditCode(null);
  };
  const startPermEdit = (item) => {
    setPermEditCode(item.code);
    setPermDraft([...(item.permissions || [])]);
    setAdding(false);
    setEditCode(null);
  };
  const togglePerm = (key) =>
    setPermDraft((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  const savePerm = () =>
    updateMutation.mutate(
      { code: permEditCode, permissions: permDraft },
      {
        onSuccess: () => {
          setPermEditCode(null);
          setPermDraft([]);
        },
      },
    );

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-surface-400" size={24} />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-surface-400">
          Define roles and assign permissions for system users.
        </p>
        {!adding && !editCode && (
          <button
            onClick={() => {
              setAdding(true);
              setEditCode(null);
              setPermEditCode(null);
              setForm({ code: "", label: "", sort_order: 0 });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg"
          >
            <Plus size={14} /> Add Role
          </button>
        )}
      </div>

      {(adding || editCode) && (
        <div className="bg-surface-800 border border-surface-600 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {adding && (
              <div>
                <label className={labelCls}>Code</label>
                <input
                  className={inputCls}
                  placeholder="e.g. cashier"
                  value={form.code}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, code: e.target.value }))
                  }
                />
              </div>
            )}
            <div>
              <label className={labelCls}>Label</label>
              <input
                className={inputCls}
                placeholder="e.g. Cashier"
                value={form.label}
                onChange={(e) =>
                  setForm((p) => ({ ...p, label: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelCls}>Sort Order</label>
              <input
                type="number"
                className={inputCls}
                value={form.sort_order}
                onChange={(e) =>
                  setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))
                }
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={adding ? handleAdd : handleUpdate}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg"
            >
              <Check size={14} /> {adding ? "Add" : "Save"}
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-300 text-sm rounded-lg"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700 text-surface-400 text-left">
              <th className="py-2 px-3 font-medium">Code</th>
              <th className="py-2 px-3 font-medium">Label</th>
              <th className="py-2 px-3 font-medium">Permissions</th>
              <th className="py-2 px-3 font-medium">Order</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(roles || []).map((item) => (
              <tr
                key={item.code}
                className="border-b border-surface-800 hover:bg-surface-800/50"
              >
                <td className="py-2 px-3 text-white font-mono text-xs">
                  {item.code}
                </td>
                <td className="py-2 px-3 text-white">{item.label}</td>
                <td className="py-2 px-3">
                  {(item.permissions || []).length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {(item.permissions || []).map((p) => (
                        <span
                          key={p}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/15 text-primary-300 font-medium"
                        >
                          {CAPABILITIES.find((c) => c.key === p)?.label || p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-surface-500">None</span>
                  )}
                </td>
                <td className="py-2 px-3 text-surface-400">
                  {item.sort_order}
                </td>
                <td className="py-2 px-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${item.active ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}
                  >
                    {item.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => startPermEdit(item)}
                      className="p-1 text-surface-400 hover:text-primary-400"
                      title="Permissions"
                    >
                      <Shield size={14} />
                    </button>
                    <button
                      onClick={() => startEdit(item)}
                      className="p-1 text-surface-400 hover:text-primary-400"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${item.label}"?`))
                          deleteMutation.mutate(item.code);
                      }}
                      className="p-1 text-surface-400 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {(roles || []).map((item) => (
          <div key={item.code} className={`bg-surface-800/50 border rounded-xl overflow-hidden transition-colors ${permEditCode === item.code ? "border-primary-500/50" : "border-surface-700"}`}>
            {/* Card header */}
            <div className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{item.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${item.active ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}>
                    {item.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-surface-500 mt-0.5 block">{item.code}</span>
              </div>
              {permEditCode !== item.code && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => startPermEdit(item)}
                    className="p-2 rounded-lg text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 active:scale-95 transition-all"
                    title="Edit permissions"
                  >
                    <Shield size={15} />
                  </button>
                  <button
                    onClick={() => startEdit(item)}
                    className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 active:scale-95 transition-all"
                    title="Edit role"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => { if (window.confirm(`Delete "${item.label}"?`)) deleteMutation.mutate(item.code); }}
                    className="p-2 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* Inline permissions editor */}
            {permEditCode === item.code ? (
              <div className="border-t border-primary-500/30 p-4 space-y-3 bg-surface-900/30">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-primary-400 flex items-center gap-1.5">
                    <Shield size={12} /> Editing permissions · {permDraft.length} selected
                  </p>
                  <button
                    onClick={() => { setPermEditCode(null); setPermDraft([]); }}
                    className="p-1 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {CAPABILITIES.map(({ key, label, description }) => (
                    <label
                      key={key}
                      className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${permDraft.includes(key) ? "border-primary-500/40 bg-primary-500/10" : "border-surface-700 hover:border-surface-600"}`}
                    >
                      <input
                        type="checkbox"
                        checked={permDraft.includes(key)}
                        onChange={() => togglePerm(key)}
                        className="mt-0.5 accent-primary-500 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium">{label}</p>
                        <p className="text-xs text-surface-400 leading-relaxed">{description}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  onClick={savePerm}
                  disabled={updateMutation.isPending}
                  className="w-full flex justify-center items-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Check size={14} />
                  {updateMutation.isPending ? "Saving…" : "Save Permissions"}
                </button>
              </div>
            ) : (
              /* Permissions display */
              <div className="px-4 pb-4 border-t border-surface-700/50 pt-3">
                {(item.permissions || []).length > 0 ? (
                  <>
                    <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-2">
                      Permissions ({item.permissions.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(item.permissions || []).map((p) => (
                        <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/20 font-medium">
                          {CAPABILITIES.find((c) => c.key === p)?.label || p}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => startPermEdit(item)}
                    className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-surface-600 rounded-lg text-xs text-surface-400 hover:text-white hover:border-surface-500 transition-colors"
                  >
                    <Shield size={12} /> Tap to assign permissions
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {permEditCode && (
        <div className="bg-surface-800 border border-surface-600 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Shield size={15} className="text-primary-400" />
              Permissions —{" "}
              <span className="font-mono text-primary-300">{permEditCode}</span>
            </h4>
            <span className="text-xs text-surface-500">{permDraft.length} selected</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {CAPABILITIES.map(({ key, label, description }) => (
              <label
                key={key}
                className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${permDraft.includes(key) ? "border-primary-500/40 bg-primary-500/10" : "border-surface-700 hover:border-surface-600"}`}
              >
                <input
                  type="checkbox"
                  checked={permDraft.includes(key)}
                  onChange={() => togglePerm(key)}
                  className="mt-0.5 accent-primary-500 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium">{label}</p>
                  <p className="text-xs text-surface-400 leading-relaxed">{description}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              onClick={savePerm}
              disabled={updateMutation.isPending}
              className="flex justify-center items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
            >
              <Check size={14} /> Save Permissions
            </button>
            <button
              onClick={() => { setPermEditCode(null); setPermDraft([]); }}
              className="flex justify-center items-center gap-1.5 px-4 py-2 bg-surface-700 hover:bg-surface-600 text-surface-300 text-sm rounded-lg"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// MAIN SETTINGS PAGE - ALL TABS
// ==========================================
const SETTINGS_TABS = [
  { key: "organisation",       label: "Organisation",       short: "Org",       icon: Building2 },
  { key: "business-targets",   label: "Business Targets",   short: "Targets",   icon: BarChart3 },
  { key: "account-classes",    label: "Account Classes",    short: "Acct",      icon: BookOpen },
  { key: "inventory-policies", label: "Inventory Policies", short: "Inventory", icon: Package },
];

const SettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "organisation";

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-600/20 rounded-lg">
          <Building2 size={22} className="text-primary-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-sm text-surface-400">
            Manage organisation details, targets, account classes and inventory policies
          </p>
        </div>
      </div>

      {/* Tabs — desktop only; mobile uses contextual bottom nav */}
      <div className="hidden md:block overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 bg-surface-800/50 border border-surface-700 rounded-xl p-1 min-w-max">
          {SETTINGS_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSearchParams({ tab: key })}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === key
                  ? "bg-primary-500 text-white shadow-lg shadow-primary-500/25"
                  : "text-surface-400 hover:text-white hover:bg-surface-700/50"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "organisation"       && <OrganisationTab />}
        {activeTab === "business-targets"   && <BusinessTargetsTab />}
        {activeTab === "account-classes"    && <AccountClassesTab />}
        {activeTab === "inventory-policies" && <InventoryPoliciesTab />}
      </div>
    </div>
  );
};

/* ======================================================
   INVENTORY POLICIES TAB
   ====================================================== */

const SERVICE_LEVEL_OPTIONS = [
  { value: 0.90, label: "90% — Basic" },
  { value: 0.95, label: "95% — Standard" },
  { value: 0.975, label: "97.5% — High" },
  { value: 0.99, label: "99% — Premium" },
];

const formatNum = (v, decimals = 1) => {
  if (v == null || isNaN(v)) return "—";
  return Number(v).toFixed(decimals);
};

const InventoryPoliciesTab = () => {
  const { data: policies = [], isLoading: policiesLoading } = useReorderPolicies();
  const { data: settings, isLoading: settingsLoading } = useReorderSettings();
  const { data: categories = [] } = useCategories({ active: true });
  const updateSettings = useUpdateReorderSettings();
  const refreshLevels = useRefreshReorderLevels();
  const setManual = useSetManualReorderLevel();
  const clearOverride = useClearReorderOverride();

  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [policySearch, setPolicySearch] = useState("");
  const [policyPage, setPolicyPage] = useState(1);
  const policiesPerPage = 10;

  // Sync settings form
  useEffect(() => {
    if (settings) {
      setForm({
        default_service_level: settings.default_service_level ?? 0.95,
        default_lookback_days: settings.default_lookback_days ?? 90,
        default_lead_time_days: settings.default_lead_time_days ?? 3,
        default_reorder_level: settings.default_reorder_level ?? 5,
        auto_refresh_enabled: settings.auto_refresh_enabled ?? true,
        fast_moving_days: settings.fast_moving_days ?? 30,
        slow_moving_days: settings.slow_moving_days ?? 90,
        default_tot_size_ml: settings.default_tot_size_ml ?? 30,
        conversion_allowed_categories: settings.conversion_allowed_categories ?? [],
      });
    }
  }, [settings]);

  const handleSaveSettings = () => {
    updateSettings.mutate(form);
  };

  const handleStartOverride = (policy) => {
    setEditingId(policy.product_id);
    setEditValue(String(policy.reorder_level || 0));
  };

  const handleSaveOverride = (productId) => {
    setManual.mutate(
      { productId, reorder_level: Number(editValue) },
      { onSuccess: () => setEditingId(null) },
    );
  };

  const handleClearOverride = (productId) => {
    clearOverride.mutate(productId);
  };

  const filteredPolicies = useMemo(() => {
    if (!policySearch.trim()) return policies;
    const q = policySearch.toLowerCase();
    return policies.filter((p) => {
      const name = p.products?.name?.toLowerCase() ?? "";
      const supplier = p.suppliers?.name?.toLowerCase() ?? "";
      return name.includes(q) || supplier.includes(q);
    });
  }, [policies, policySearch]);

  const totalPolicyPages = Math.max(1, Math.ceil(filteredPolicies.length / policiesPerPage));
  const paginatedPolicies = filteredPolicies.slice(
    (policyPage - 1) * policiesPerPage,
    policyPage * policiesPerPage,
  );

  // Reset page when search changes
  useEffect(() => {
    setPolicyPage(1);
  }, [policySearch]);

  if (settingsLoading || policiesLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Global Configuration */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary-500/15 rounded-lg">
              <Target size={16} className="text-primary-400" />
            </div>
            <h2 className="font-semibold text-white">ROL Configuration</h2>
          </div>
          <button
            onClick={() => refreshLevels.mutate()}
            disabled={refreshLevels.isPending}
            className="flex justify-center sm:justify-start items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshLevels.isPending ? "animate-spin" : ""} />
            {refreshLevels.isPending ? "Calculating..." : "Recalculate All"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium">Service Level</label>
            <select
              className={inputCls}
              value={form.default_service_level ?? 0.95}
              onChange={(e) => setForm((f) => ({ ...f, default_service_level: Number(e.target.value) }))}
            >
              {SERVICE_LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-surface-500">Higher = more safety stock</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium">Lookback Period (days)</label>
            <input
              type="number"
              min="7"
              max="365"
              className={inputCls}
              value={form.default_lookback_days ?? 90}
              onChange={(e) => setForm((f) => ({ ...f, default_lookback_days: Number(e.target.value) }))}
            />
            <p className="text-[10px] text-surface-500">Days of sales history to analyse</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium">Default Lead Time (days)</label>
            <input
              type="number"
              min="1"
              max="90"
              className={inputCls}
              value={form.default_lead_time_days ?? 3}
              onChange={(e) => setForm((f) => ({ ...f, default_lead_time_days: Number(e.target.value) }))}
            />
            <p className="text-[10px] text-surface-500">Used when supplier has no lead time set</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium">Default ROL (new products)</label>
            <input
              type="number"
              min="0"
              className={inputCls}
              value={form.default_reorder_level ?? 5}
              onChange={(e) => setForm((f) => ({ ...f, default_reorder_level: Number(e.target.value) }))}
            />
            <p className="text-[10px] text-surface-500">Fallback for products with no sales data</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium">Auto-Refresh</label>
            <label className="flex items-center gap-2 mt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={form.auto_refresh_enabled ?? true}
                onChange={(e) => setForm((f) => ({ ...f, auto_refresh_enabled: e.target.checked }))}
                className="accent-primary-500"
              />
              <span className="text-sm text-surface-300">Daily at 2:00 AM</span>
            </label>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSaveSettings}
              disabled={updateSettings.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>

      {/* Movement Classification */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-orange-500/15 rounded-lg">
            <Package size={16} className="text-orange-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Stock Movement Classification</h2>
            <p className="text-[10px] text-surface-500 mt-0.5">
              Products are classified based on days since last sale
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium">Fast Moving (≤ days)</label>
            <input
              type="number"
              min="1"
              max="365"
              className={inputCls}
              value={form.fast_moving_days ?? 30}
              onChange={(e) => setForm((f) => ({ ...f, fast_moving_days: Number(e.target.value) }))}
            />
            <p className="text-[10px] text-surface-500">Last sale within this many days → <span className="text-green-400">FAST</span></p>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium">Slow Moving (≤ days)</label>
            <input
              type="number"
              min="1"
              max="730"
              className={inputCls}
              value={form.slow_moving_days ?? 90}
              onChange={(e) => setForm((f) => ({ ...f, slow_moving_days: Number(e.target.value) }))}
            />
            <p className="text-[10px] text-surface-500">Last sale within this many days → <span className="text-orange-400">SLOW</span></p>
          </div>

          <div className="bg-surface-800/30 rounded-lg p-3 border border-surface-700">
            <p className="text-xs text-surface-400 font-medium mb-2">Classification Rules</p>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                <span className="text-surface-300">FAST — last sale ≤ {form.fast_moving_days ?? 30} days</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                <span className="text-surface-300">SLOW — last sale ≤ {form.slow_moving_days ?? 90} days</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                <span className="text-surface-300">NON_MOVING — last sale &gt; {form.slow_moving_days ?? 90} days or never</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleSaveSettings}
            disabled={updateSettings.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {updateSettings.isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Tot Size Setting */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-blue-500/15 rounded-lg">
            <Package size={16} className="text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Product Conversions</h2>
            <p className="text-[10px] text-surface-500 mt-0.5">
              Settings for converting bulk products into smaller units (e.g. bottles → tots)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium">Default Tot Size (ml)</label>
            <select
              className={inputCls}
              value={form.default_tot_size_ml ?? 30}
              onChange={(e) => setForm((f) => ({ ...f, default_tot_size_ml: Number(e.target.value) }))}
            >
              <option value={25}>25ml</option>
              <option value={30}>30ml</option>
            </select>
            <p className="text-[10px] text-surface-500">Standard tot measure used for spirit conversions</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium">Allowed Categories for Bulk Breaking</label>
            <div className="bg-surface-900 border border-surface-600 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
              {categories.length === 0 ? (
                <p className="text-xs text-surface-500 py-1">No categories found</p>
              ) : (
                categories.map((cat) => {
                  const selected = (form.conversion_allowed_categories ?? []).includes(cat.id);
                  return (
                    <label
                      key={cat.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors ${
                        selected
                          ? "bg-primary-500/15 text-white"
                          : "text-surface-400 hover:bg-surface-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          setForm((f) => {
                            const prev = f.conversion_allowed_categories ?? [];
                            return {
                              ...f,
                              conversion_allowed_categories: selected
                                ? prev.filter((id) => id !== cat.id)
                                : [...prev, cat.id],
                            };
                          })
                        }
                        className="rounded border-surface-600 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                      />
                      {cat.name}
                    </label>
                  );
                })
              )}
            </div>
            <p className="text-[10px] text-surface-500">
              {(form.conversion_allowed_categories ?? []).length === 0
                ? "All categories allowed (none selected)"
                : `${(form.conversion_allowed_categories ?? []).length} selected — only these categories can be bulk-broken`}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleSaveSettings}
            disabled={updateSettings.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {updateSettings.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Policies Table */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-surface-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-semibold text-white shrink-0">Product Reorder Policies</h2>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-500" />
              <input
                type="text"
                placeholder="Search products..."
                value={policySearch}
                onChange={(e) => setPolicySearch(e.target.value)}
                className="w-full sm:w-48 pl-8 pr-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-xs text-white placeholder:text-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <span className="text-xs text-surface-400 shrink-0">{filteredPolicies.length} products</span>
          </div>
        </div>

        {policies.length === 0 ? (
          <div className="py-12 text-center text-surface-500">
            <Package size={32} className="mx-auto mb-2 text-surface-700" />
            <p>No policies calculated yet. Click &quot;Recalculate All&quot; to generate.</p>
          </div>
        ) : (
          <>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-surface-700/40">
            {paginatedPolicies.map((p) => {
              const product = p.products;
              const supplier = p.suppliers;
              const stock = product?.current_stock ?? 0;
              const isLow = stock > 0 && stock <= p.reorder_level;
              const isOut = stock <= 0;
              return (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-white text-sm">{product?.name || "Unknown"}</p>
                      {supplier && <p className="text-[10px] text-surface-500 mt-0.5">{supplier.name}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        p.source === "manual" ? "bg-blue-500/15 text-blue-400"
                        : p.source === "default" ? "bg-surface-700 text-surface-400"
                        : "bg-green-500/15 text-green-400"
                      }`}>{p.source}</span>
                      <span className={`font-mono font-semibold text-sm ${isOut ? "text-red-400" : isLow ? "text-orange-400" : "text-green-400"}`}>
                        {stock}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-surface-800/50 rounded-lg px-3 py-2">
                      <p className="text-surface-500 mb-0.5">Demand/day</p>
                      <p className="text-white font-mono">{formatNum(p.avg_daily_demand)}</p>
                    </div>
                    <div className="bg-surface-800/50 rounded-lg px-3 py-2">
                      <p className="text-surface-500 mb-0.5">Lead Time</p>
                      <p className="text-white font-mono">{formatNum(p.lead_time_days, 0)}d</p>
                    </div>
                    <div className="bg-surface-800/50 rounded-lg px-3 py-2">
                      <p className="text-surface-500 mb-0.5">Safety Stock</p>
                      <p className="text-white font-mono">{formatNum(p.safety_stock)}</p>
                    </div>
                    <div className="bg-surface-800/50 rounded-lg px-3 py-2">
                      <p className="text-surface-500 mb-0.5">ROL</p>
                      {editingId === p.product_id ? (
                        <div className="flex items-center gap-1">
                          <input type="number" min="0" value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-14 px-1.5 py-0.5 bg-surface-900 border border-surface-600 rounded text-white text-xs focus:outline-none"
                            autoFocus />
                          <button onClick={() => handleSaveOverride(p.product_id)} disabled={setManual.isPending}
                            className="p-1 text-green-400 hover:bg-surface-700 rounded"><Check size={11} /></button>
                          <button onClick={() => setEditingId(null)}
                            className="p-1 text-surface-400 hover:bg-surface-700 rounded"><X size={11} /></button>
                        </div>
                      ) : (
                        <p className="text-white font-mono font-semibold">{formatNum(p.reorder_level, 0)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId !== p.product_id && (
                      <button onClick={() => handleStartOverride(p)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-300 rounded-lg text-xs">
                        <Pencil size={12} /> Set ROL
                      </button>
                    )}
                    {p.manual_override && (
                      <button onClick={() => handleClearOverride(p.product_id)} disabled={clearOverride.isPending}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg text-xs">
                        <RefreshCw size={12} /> Clear Override
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700 bg-surface-800/30">
                  <th className="text-left px-4 py-3 text-surface-400 font-medium">Product</th>
                  <th className="text-right px-4 py-3 text-surface-400 font-medium">Avg Demand/day</th>
                  <th className="text-right px-4 py-3 text-surface-400 font-medium">Lead Time</th>
                  <th className="text-right px-4 py-3 text-surface-400 font-medium">Safety Stock</th>
                  <th className="text-right px-4 py-3 text-surface-400 font-medium">ROL</th>
                  <th className="text-right px-4 py-3 text-surface-400 font-medium">Current Stock</th>
                  <th className="text-center px-4 py-3 text-surface-400 font-medium">Source</th>
                  <th className="text-center px-4 py-3 text-surface-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/40">
                {paginatedPolicies.map((p) => {
                  const product = p.products;
                  const supplier = p.suppliers;
                  const stock = product?.current_stock ?? 0;
                  const isLow = stock > 0 && stock <= p.reorder_level;
                  const isOut = stock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-surface-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{product?.name || "Unknown"}</p>
                        {supplier && (
                          <p className="text-[10px] text-surface-500">Supplier: {supplier.name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-surface-300">
                        {formatNum(p.avg_daily_demand)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-surface-300">
                        {formatNum(p.lead_time_days, 0)}d
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-surface-300">
                        {formatNum(p.safety_stock)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingId === p.product_id ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-16 px-1.5 py-1 bg-surface-900 border border-surface-600 rounded text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary-500"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveOverride(p.product_id)}
                              disabled={setManual.isPending}
                              className="p-1 text-green-400 hover:bg-surface-700 rounded"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-surface-400 hover:bg-surface-700 rounded"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <span className="font-mono font-semibold text-white">
                            {formatNum(p.reorder_level, 0)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-mono font-semibold ${
                            isOut ? "text-red-400" : isLow ? "text-orange-400" : "text-green-400"
                          }`}
                        >
                          {stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            p.source === "manual"
                              ? "bg-blue-500/15 text-blue-400"
                              : p.source === "default"
                                ? "bg-surface-700 text-surface-400"
                                : "bg-green-500/15 text-green-400"
                          }`}
                        >
                          {p.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {editingId !== p.product_id && (
                            <button
                              onClick={() => handleStartOverride(p)}
                              className="p-1.5 text-surface-400 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
                              title="Set manual override"
                            >
                              <Pencil size={12} />
                            </button>
                          )}
                          {p.manual_override && (
                            <button
                              onClick={() => handleClearOverride(p.product_id)}
                              disabled={clearOverride.isPending}
                              className="p-1.5 text-orange-400 hover:text-orange-300 hover:bg-surface-700 rounded-lg transition-colors"
                              title="Clear override (return to auto-calculated)"
                            >
                              <RefreshCw size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Pagination */}
        {totalPolicyPages > 1 && (
          <div className="px-4 py-3 border-t border-surface-700 flex items-center justify-between">
            <p className="text-xs text-surface-500">
              Showing {(policyPage - 1) * policiesPerPage + 1}–{Math.min(policyPage * policiesPerPage, filteredPolicies.length)} of {filteredPolicies.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPolicyPage((p) => Math.max(1, p - 1))}
                disabled={policyPage === 1}
                className="p-1.5 text-surface-400 hover:text-white hover:bg-surface-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPolicyPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setPolicyPage(pg)}
                  className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${
                    pg === policyPage
                      ? "bg-primary-600 text-white"
                      : "text-surface-400 hover:text-white hover:bg-surface-700"
                  }`}
                >
                  {pg}
                </button>
              ))}
              <button
                onClick={() => setPolicyPage((p) => Math.min(totalPolicyPages, p + 1))}
                disabled={policyPage === totalPolicyPages}
                className="p-1.5 text-surface-400 hover:text-white hover:bg-surface-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Formula explanation */}
      <div className="bg-surface-800/30 border border-surface-700 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <Info size={14} className="text-primary-400 mt-0.5 shrink-0" />
          <div className="text-xs text-surface-400 space-y-1">
            <p className="font-medium text-surface-300">How Reorder Levels are Calculated</p>
            <p>
              <strong>ROL</strong> = (Avg Daily Demand x Lead Time) + Safety Stock
            </p>
            <p>
              <strong>Safety Stock</strong> = Z-score x Demand Std Dev x sqrt(Lead Time)
            </p>
            <p>
              Demand is calculated from completed sales over the lookback period.
              Lead time comes from the supplier&apos;s configured lead time.
              Products with no sales history use the default ROL.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
