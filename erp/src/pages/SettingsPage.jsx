import { useState, useEffect, useMemo } from "react";
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
      <div className="flex justify-between items-center">
        <p className="text-sm text-surface-400">
          Configure your organisation details used across the system.
        </p>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
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

  const queryClient = useQueryClient();

  const { data: yearlyTargets = [], isLoading: targetsLoading } = useQuery({
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
      <div className="flex flex-wrap items-center justify-between gap-4">
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

        <div className="flex items-center gap-2">
          <span className="text-xs text-surface-400">Quick Apply:</span>
          <button
            onClick={() => applyGrowthRate(10)}
            className="text-xs px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-white rounded-lg"
          >
            +10%/month
          </button>
          <button
            onClick={() => applyGrowthRate(5)}
            className="text-xs px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-white rounded-lg"
          >
            +5%/month
          </button>
          <button
            onClick={() => applyGrowthRate(0)}
            className="text-xs px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-white rounded-lg"
          >
            Flat
          </button>
          {hasChanges && (
            <button
              onClick={handleSaveAll}
              disabled={bulkUpdateMutation.isPending}
              className="flex items-center gap-2 px-4 py-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-xs rounded-lg"
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
const StaffTargetsTab = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [staffOverrides, setStaffOverrides] = useState({});

  const queryClient = useQueryClient();
  const { data: users = [] } = useUsers();
  const activeStaff = useMemo(
    () => users.filter((u) => u.active !== false && u.role?.toLowerCase() !== "owner"),
    [users],
  );

  const { data: staffTargets = [], isLoading: staffTargetsLoading } = useQuery({
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Calendar size={18} className="text-primary-400" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-white text-sm"
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
            className="px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-white text-sm"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-surface-400">Apply to all:</span>
          <input
            type="text"
            placeholder="Revenue target"
            onChange={(e) => handleApplyToAll("target_revenue", e.target.value)}
            className="w-32 px-2 py-1.5 bg-surface-800 border border-surface-600 rounded text-white text-xs"
          />
          <button
            onClick={handleSave}
            disabled={bulkUpdateStaffMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-xs rounded-lg"
          >
            <Save size={12} />
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
              className={`bg-surface-800/30 border rounded-xl p-4 ${hasExisting ? "border-surface-700/50" : "border-surface-700/30 opacity-75"}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                  <span className="text-primary-400 font-semibold">
                    {user.name?.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-surface-500">
                    {user.role || "Staff"}
                  </p>
                </div>
                {!hasExisting && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-surface-700 text-surface-400 rounded">
                    Default
                  </span>
                )}
              </div>

              <div className="space-y-3">
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
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-surface-400" size={24} />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-surface-400">
          Define account classifications used in the chart of accounts.
        </p>
        {!adding && !editCode && (
          <button
            onClick={() => {
              setAdding(true);
              setEditCode(null);
              setForm({
                code: "",
                label: "",
                category: "asset",
                sort_order: 0,
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg"
          >
            <Plus size={14} /> Add Class
          </button>
        )}
      </div>

      {(adding || editCode) && (
        <div className="bg-surface-800 border border-surface-600 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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

      <div className="overflow-x-auto">
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
            {(classes || []).map((item) => (
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
    </div>
  );
};

// ==========================================
// 5. SYSTEM ROLES TAB (Original)
// ==========================================
const SystemRolesTab = () => {
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
      <div className="flex justify-between items-center">
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

      <div className="overflow-x-auto">
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

      {permEditCode && (
        <div className="bg-surface-800 border border-surface-600 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield size={15} className="text-primary-400" />
            Permissions for{" "}
            <span className="font-mono text-primary-300">{permEditCode}</span>
          </h4>
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
                  className="mt-0.5 accent-primary-500"
                />
                <div>
                  <p className="text-sm text-white font-medium">{label}</p>
                  <p className="text-xs text-surface-400">{description}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={savePerm}
              disabled={updateMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg"
            >
              <Check size={14} /> Save Permissions
            </button>
            <button
              onClick={() => {
                setPermEditCode(null);
                setPermDraft([]);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-300 text-sm rounded-lg"
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
const TABS = [
  { key: "organisation", label: "Organisation", icon: Building2 },
  { key: "business-targets", label: "Business Targets", icon: BarChart3 },
  { key: "staff-targets", label: "Staff Targets", icon: UserCircle },
  { key: "account-classes", label: "Account Classes", icon: BookOpen },
  { key: "system-roles", label: "System Roles", icon: Shield },
];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("organisation");

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
            Manage organisation details, targets, account classes, and system
            roles
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 bg-surface-800/50 border border-surface-700 rounded-xl p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
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

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "organisation" && <OrganisationTab />}
        {activeTab === "business-targets" && <BusinessTargetsTab />}
        {activeTab === "staff-targets" && <StaffTargetsTab />}
        {activeTab === "account-classes" && <AccountClassesTab />}
        {activeTab === "system-roles" && <SystemRolesTab />}
      </div>
    </div>
  );
};

export default SettingsPage;
