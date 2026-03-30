import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchStatements,
  fetchStatement,
  importStatement,
  autoMatch,
  manualMatch,
  unmatchLine,
  fetchReconciliationReport,
  finalizeReconciliation,
  fetchBankGlDetails,
  fetchSuggestedMatches,
} from "@/services/bankReconciliation.service";

export const useStatements = (params = {}) => {
  return useQuery({
    queryKey: ["bank-statements", params],
    queryFn: () => fetchStatements(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const useStatement = (id) => {
  return useQuery({
    queryKey: ["bank-statement", id],
    queryFn: () => fetchStatement(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000,
  });
};

export const useImportStatement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importStatement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-statements"] });
      toast.success("Statement imported successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to import statement");
    },
  });
};

export const useAutoMatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, opts }) => autoMatch(id, opts),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bank-statement", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliation-report", variables.id] });
      toast.success(`Auto-matched ${data.matched || 0} lines`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to auto-match");
    },
  });
};

export const useManualMatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lineId, payload }) => manualMatch(id, lineId, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bank-statement", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliation-report", variables.id] });
      toast.success("Line matched");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to match line");
    },
  });
};

export const useUnmatchLine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lineId }) => unmatchLine(id, lineId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bank-statement", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliation-report", variables.id] });
      toast.success("Line unmatched");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to unmatch line");
    },
  });
};

export const useReconciliationReport = (id) => {
  return useQuery({
    queryKey: ["bank-reconciliation-report", id],
    queryFn: () => fetchReconciliationReport(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000,
  });
};

export const useFinalizeReconciliation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => finalizeReconciliation(id, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bank-statements"] });
      queryClient.invalidateQueries({ queryKey: ["bank-statement", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliation-report", variables.id] });
      toast.success("Reconciliation finalized");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to finalize reconciliation");
    },
  });
};

export const useBankGlDetails = (accountId, params = {}) => {
  return useQuery({
    queryKey: ["bank-gl-details", accountId, params],
    queryFn: () => fetchBankGlDetails(accountId, params),
    enabled: !!accountId,
    staleTime: 1 * 60 * 1000,
  });
};

export const useSuggestedMatches = (id, lineId) => {
  return useQuery({
    queryKey: ["suggested-matches", id, lineId],
    queryFn: () => fetchSuggestedMatches(id, lineId),
    enabled: !!id && !!lineId,
    staleTime: 30 * 1000,
  });
};
