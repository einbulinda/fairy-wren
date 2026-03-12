import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchSystemRoles,
  createSystemRole,
  updateSystemRole,
  deleteSystemRole,
} from "@/services/systemRoles.service";

export const useSystemRoles = () => {
  return useQuery({
    queryKey: ["systemRoles"],
    queryFn: fetchSystemRoles,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateSystemRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSystemRole,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["systemRoles"] });
      toast.success("System role created");
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || err.message;
      toast.error(msg === "CODE_ALREADY_EXISTS" ? "That code already exists" : "Failed to create system role");
    },
  });
};

export const useUpdateSystemRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateSystemRole,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["systemRoles"] });
      toast.success("System role updated");
    },
    onError: () => toast.error("Failed to update system role"),
  });
};

export const useDeleteSystemRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSystemRole,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["systemRoles"] });
      toast.success("System role deleted");
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || err.message;
      toast.error(msg === "SYSTEM_ROLE_IN_USE" ? "Cannot delete: role is assigned to users" : "Failed to delete system role");
    },
  });
};
