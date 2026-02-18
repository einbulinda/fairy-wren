import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJournals, fetchJournal, createJournal, voidJournal } from "@/services/journals.service";
import toast from "react-hot-toast";

export const useJournals = (params = {}) => {
  return useQuery({
    queryKey: ["journals", params],
    queryFn: () => fetchJournals(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const useJournal = (id) => {
  return useQuery({
    queryKey: ["journal", id],
    queryFn: () => fetchJournal(id),
    enabled: !!id,
  });
};

export const useCreateJournal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createJournal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      toast.success("Journal entry created");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to create journal entry");
    },
  });
};

export const useVoidJournal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: voidJournal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      toast.success("Journal entry voided");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to void journal entry");
    },
  });
};
