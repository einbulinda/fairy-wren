import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPayrollEmployees,
  upsertSalaryStructure,
  fetchPayrollRuns,
  processPayrollRun,
  fetchPayrollRunDetail,
  markRunPaid,
  markLinePaid,
} from "@/services/payroll.service";
import toast from "react-hot-toast";

export const usePayrollEmployees = () => {
  return useQuery({
    queryKey: ["payroll-employees"],
    queryFn: fetchPayrollEmployees,
  });
};

export const useUpsertSalaryStructure = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertSalaryStructure,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-employees"] });
      toast.success("Salary structure saved");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to save salary structure");
    },
  });
};

export const usePayrollRuns = () => {
  return useQuery({
    queryKey: ["payroll-runs"],
    queryFn: fetchPayrollRuns,
  });
};

export const useProcessPayrollRun = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: processPayrollRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
      toast.success("Payroll run processed and journal entry posted");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to process payroll run");
    },
  });
};

export const usePayrollRunDetail = (id) => {
  return useQuery({
    queryKey: ["payroll-run", id],
    queryFn: () => fetchPayrollRunDetail(id),
    enabled: !!id,
  });
};

export const useMarkRunPaid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markRunPaid,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-run", id] });
      toast.success("Payroll run marked as paid");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to mark run as paid");
    },
  });
};

export const useMarkLinePaid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markLinePaid,
    onSuccess: (_, { runId }) => {
      queryClient.invalidateQueries({ queryKey: ["payroll-run", runId] });
      toast.success("Payment recorded");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to record payment");
    },
  });
};
