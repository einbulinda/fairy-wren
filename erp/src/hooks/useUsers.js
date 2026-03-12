import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchUsers,
  createUser,
  updateUser,
  toggleUserStatus,
} from "@/services/users.service";

export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully");
    },
    onError: (err) => {
      const msg = err?.response?.data?.error?.message || err.message;
      toast.error(msg);
    },
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated successfully");
    },
    onError: (err) => {
      const msg = err?.response?.data?.error?.message || err.message;
      toast.error(msg);
    },
  });
};

export const useToggleUserStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: toggleUserStatus,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(variables.active ? "User activated" : "User deactivated");
    },
    onError: () => toast.error("Failed to update user status"),
  });
};
