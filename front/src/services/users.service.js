import api from "./api";

export const fetchUsersApi = async () => {
  try {
    const response = await api.get("/users");
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Error fetching users." };
  }
};

export const fetchUserByIdApi = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Error fetching user." };
  }
};

export const createUserApi = async ({ name, pin, role }) => {
  try {
    const user = await api.post("/users", { name, pin, role });
    return user.data;
  } catch (error) {
    throw error.response?.data || { error: "Error in creating user." };
  }
};

// Update User
export const updateUserApi = async (userId, { name, pin, role }) => {
  try {
    const response = await api.patch(`/users/${userId}`, { name, pin, role });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Error updating user." };
  }
};

// Delete User
export const deleteUserApi = async (userId, payload) => {
  try {
    const response = await api.delete(`/users/${userId}`, { data: payload });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Error deleting user." };
  }
};
