export const fmt = (n) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(n ?? 0);

export const fmtPeriod = (period) => {
  if (!period) return "—";
  const d = new Date(period);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
};

export const inputCls =
  "w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

export const labelCls = "block text-xs font-medium text-surface-400 mb-1";

export const EMPTY_SALARY = {
  full_name: "",
  id_number: "",
  date_of_employment: "",
  basic_pay: "",
  housing_allowance: "",
  transport_allowance: "",
  other_allowances: "",
  paye: "",
  nssf: "",
  shif: "",
  housing_levy: "",
  other_deductions: "",
  payment_method: "cash",
  bank_name: "",
  account_number: "",
  mpesa_number: "",
};

// Supabase returns employee_salary_structures as a single object (not array)
// when the FK has a UNIQUE constraint. Handle both cases defensively.
export const getStruct = (emp) => {
  const s = emp?.employee_salary_structures;
  return Array.isArray(s) ? (s[0] ?? null) : (s ?? null);
};
