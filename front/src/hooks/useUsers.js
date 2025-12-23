import { useCallback, useEffect, useState } from "react";
import {
  createUserApi,
  fetchUserByIdApi,
  fetchUsersApi,
  updateUserApi,
  deleteUserApi,
} from "../services/users.service";

/**
 * useUsers
 * Centralized state & business logic for user management
 */

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load all users
   */
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchUsersApi();
      setUsers(data);
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create a new user
   */
  const createUser = async (payload) => {
    setIsLoading(true);
    setError(null);

    try {
      const newUser = await createUserApi(payload);
      setUsers((prev) => [newUser, ...prev]);
      return newUser;
    } catch (err) {
      setError(err.message || "Failed to create user");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update an existing user
   */
  const updateUser = async (userId, payload) => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedUser = await updateUserApi(userId, payload);
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? updatedUser : user))
      );
      return updatedUser;
    } catch (err) {
      setError(err.message || "Failed to update user");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetch a user by ID
   */
  const fetchUserById = async (userId) => {
    setIsLoading(true);
    setError(null);

    try {
      const user = await fetchUserByIdApi(userId);
      return user;
    } catch (err) {
      setError(err.message || "Failed to fetch user");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Deactivate a user
   */
  const deactivateUser = async (userId, status) => {
    setIsLoading(true);
    setError(null);

    try {
      await deleteUserApi(userId, { status });
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (err) {
      setError(err.message || "Failed to deactivate user");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load Users on hook init
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /** Return state and actions */
  return {
    users,
    isLoading,
    error,
    reload: loadUsers,
    createUser,
    updateUser,
    fetchUserById,
    deactivateUser,
  };
};
