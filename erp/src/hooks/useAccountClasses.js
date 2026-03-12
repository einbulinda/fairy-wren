import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchAccountClasses,
  createAccountClass,
  updateAccountClass,
  deleteAccountClass,
} from "@/services/accountClasses.service";

export const useAccountClasses = () => {
  return useQuery({
    queryKey: ["accountClasses"],
    queryFn: fetchAccountClasses,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateAccountClass = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAccountClass,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accountClasses"] });
      toast.success("Account class created");
    },
    onError: (err) => {
      const msg = err?.response?.data?.error?.message || err.message;
      toast.error(msg);
    },
  });
};

export const useUpdateAccountClass = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateAccountClass,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accountClasses"] });
      toast.success("Account class updated");
    },
    onError: () => toast.error("Failed to update account class"),
  });
};

export const useDeleteAccountClass = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAccountClass,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accountClasses"] });
      toast.success("Account class deleted");
    },
    onError: (err) => {
      const msg = err?.response?.data?.error?.message || err.message;
      toast.error(msg);
    },
  });
};
