export { fmt } from "@/utils/formatters";

export const fmtPeriod = (period) => {
  if (!period) return "—";
  return new Date(period).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });
};

export { inputCls } from "@/utils/constants";

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
