import api from "./api";

export const fetchUsersApi = async () => {
  try {
    const response = await api.get("/users");
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Error fetching users." };
  }
};

export const createUserApi = async ({ name, pin, role }) => {
  try {
    const user = await api.post("/", { name, pin, role });
    return user.data;
  } catch (error) {
    throw error.response?.data || { error: "Error in creating user." };
  }
};
