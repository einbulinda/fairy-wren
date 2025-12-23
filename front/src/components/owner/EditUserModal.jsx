import { Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { useUsers } from "../../hooks/useUsers";

const EditUserModal = ({
  editingUser,
  userData,
  setUserData,
  closeModal,
  users,
}) => {
  const { updateUser, createUser } = useUsers();
  console.log("User Data:", userData);

  const handleSaveUser = async () => {
    // Validations
    if (!userData.name.trim()) {
      toast.error("Please enter the user name.");
      return;
    }

    if (!userData.pin || userData.pin.length < 4 || userData.pin.length > 6) {
      toast.error("PIN must be between 4 to 6 digits.");
      return;
    }

    if (!/^\d+$/.test(userData.pin)) {
      toast.error("PIN must contain only numbers");
      return;
    }

    // Check for duplicate PIN (excluding current user if editing)
    const isDuplicatePin = users.find(
      (user) =>
        user.pin === userData.pin &&
        (!editingUser || user.id !== editingUser.id)
    );

    if (isDuplicatePin) {
      toast.error("This PIN is already in use. Please choose a different one.");
      return;
    }

    try {
      if (editingUser) {
        // Update existing user
        await updateUser(editingUser.id, userData);
        toast.success("User updated successfully");
      } else {
        // Create new user
        await createUser(userData);
        toast.success("User created successfully");
      }
      closeModal();
    } catch (error) {
      toast.error(
        editingUser ? "Failed to update user" : "Failed to save user"
      );
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border-2 border-pink-500">
        <h3 className="text-2xl font-bold text-pink-500 mb-4">
          {editingUser ? "Edit User" : "Add New User"}
        </h3>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={userData.name}
              onChange={(e) =>
                setUserData({ ...userData, name: e.target.value })
              }
              placeholder="e.g., John Doe"
              className="w-full px-4 py-2 bg-gray-700 border border-purple-500 rounded-lg text-white focus:outline-none focus:border-pink-500"
            />
          </div>
          {/* End: Name */}

          {/* PIN */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              PIN (4-6 digits) *
            </label>
            <input
              type="text"
              maxLength="6"
              value={userData.pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setUserData({ ...userData, pin: value });
              }}
              placeholder="e.g., 1234"
              className="w-full px-4 py-2 bg-gray-700 border border-purple-500 rounded-lg text-white font-mono text-center text-xl tracking-widest focus:outline-none focus:border-pink-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Numbers only. This will be used for login.
            </p>
          </div>
          {/* End: PIN */}

          {/* Role */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Role *</label>
            <select
              value={userData.role}
              onChange={(e) =>
                setUserData({ ...userData, role: e.target.value })
              }
              className="w-full px-4 py-2 bg-gray-700 border border-purple-500 rounded-lg text-white focus:outline-none focus:border-pink-500"
            >
              <option value="waitress">💁‍♀️ Waitress</option>
              <option value="bartender">🍺 Bartender</option>
              <option value="manager">📊 Manager</option>
              <option value="owner">👑 Owner</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {userData?.role === "waitress" &&
                "Can create bills and take orders"}
              {userData?.role === "bartender" &&
                "Can take orders and confirm payments"}
              {userData?.role === "manager" &&
                "Can manage inventory and approve requests"}
              {userData?.role === "owner" &&
                "Full system access including reports"}
            </p>
          </div>
          {/* End: Role */}

          {/* Buttons */}
          <div className="flex space-x-2 pt-4">
            <button
              onClick={handleSaveUser}
              className="flex-1 py-3 bg-green-600 rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center"
            >
              <Save size={18} className="mr-2" />
              {editingUser ? "Update User" : "Create User"}
            </button>
            <button
              onClick={closeModal}
              className="flex-1 py-3 bg-gray-600 rounded-lg font-semibold hover:bg-gray-700 flex items-center justify-center"
            >
              <X size={18} className="mr-2" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;
