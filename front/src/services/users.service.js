import api from "@/api";

export const fetchUsersApi = async () => {
  try {
    const response = await api.get("/users");
    return response.data.data || response.data;
  } catch (error) {
    throw error.response?.data || { error: "Error fetching users." };
  }
};

export const fetchUserByIdApi = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data.data || response.data;
  } catch (error) {
    throw error.response?.data || { error: "Error fetching user." };
  }
};

export const createUserApi = async ({ name, pin, role }) => {
  try {
    const user = await api.post("/users", { name, pin, role });
    return user.data.data || user.data;
  } catch (error) {
    throw error.response?.data || { error: "Error in creating user." };
  }
};

// Update User
export const updateUserApi = async (userId, { name, role }) => {
  try {
    const response = await api.put(`/users/${userId}`, { name, role });
    return response.data.data || response.data;
  } catch (error) {
    throw error.response?.data || { error: "Error updating user." };
  }
};

// Update User Status
export const deleteUserApi = async (userId, { active }) => {
  try {
    const response = await api.patch(`/users/${userId}/status`, { active });
    return response.data.data || response.data;
  } catch (error) {
    throw error.response?.data || { error: "Error updating user status." };
  }
};
