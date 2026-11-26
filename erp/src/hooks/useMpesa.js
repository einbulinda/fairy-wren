import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  apiErrorMessage,
  fetchMpesaOpen,
  fetchMpesaRegister,
  fetchMpesaSummary,
  fetchMpesaTransaction,
  fetchTipPayouts,
  payTips,
  reverseMpesaAllocation,
} from "@/services/mpesa.service";

const LEDGER_KEYS = ["balance-sheet", "trial-balance", "account-ledger"];

/** Everything M-Pesa-related plus the financial reports that read 2300 / 2200 / cash. */
const invalidateAll = (qc) => {
  ["mpesa-register", "mpesa-summary", "mpesa-open", "mpesa-transaction", "mpesa-payouts", "z-report", ...LEDGER_KEYS].forEach(
    (key) => qc.invalidateQueries({ queryKey: [key] }),
  );
};

export const useMpesaRegister = (params) =>
  useQuery({
    queryKey: ["mpesa-register", params],
    queryFn: () => fetchMpesaRegister(params),
    staleTime: 60 * 1000,
  });

export const useMpesaSummary = () =>
  useQuery({
    queryKey: ["mpesa-summary"],
    queryFn: fetchMpesaSummary,
    staleTime: 60 * 1000,
  });

export const useMpesaOpen = () =>
  useQuery({
    queryKey: ["mpesa-open"],
    queryFn: () => fetchMpesaOpen(),
    staleTime: 60 * 1000,
  });

export const useMpesaTransaction = (id) =>
  useQuery({
    queryKey: ["mpesa-transaction", id],
    queryFn: () => fetchMpesaTransaction(id),
    enabled: !!id,
  });

export const useTipPayouts = (recipientId) =>
  useQuery({
    queryKey: ["mpesa-payouts", recipientId ?? "all"],
    queryFn: () => fetchTipPayouts(recipientId ? { recipientId } : {}),
    staleTime: 60 * 1000,
  });

export const useReverseMpesaAllocation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reverseMpesaAllocation,
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Match reversed. The money is back on the M-Pesa payment.");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Failed to reverse")),
  });
};

export const usePayTips = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: payTips,
    onSuccess: (res) => {
      invalidateAll(qc);
      toast.success(`Paid ${res.recipient_name} KSh ${Number(res.amount).toLocaleString()}`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Failed to pay out tips")),
  });
};
