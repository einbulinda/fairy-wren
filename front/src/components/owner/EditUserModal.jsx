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
    // Consider the hashing used. The check should be at the back end
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

  const getRoleDescription = (role) => {
    const descriptions = {
      waitress: "Can create bills and take orders",
      bartender: "Can take orders and confirm payments",
      manager: "Can manage inventory and approve requests",
      owner: "Full system access including reports",
    };
    return descriptions[role] || "";
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-gray-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border-2 border-pink-500 max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-700 shrink-0">
          <h3 className="text-xl sm:text-2xl font-bold text-pink-500">
            {editingUser ? "Edit User" : "Add New User"}
          </h3>
          <button
            onClick={closeModal}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={24} className="text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs sm:text-sm text-gray-400 mb-2 font-medium">
              Full Name <span className="text-pink-500">*</span>
            </label>
            <input
              type="text"
              value={userData.name}
              onChange={(e) =>
                setUserData({ ...userData, name: e.target.value })
              }
              placeholder="e.g., John Doe"
              autoFocus
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700 border-2 border-purple-500 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-pink-500 placeholder-gray-500"
            />
          </div>

          {/* PIN */}
          <div>
            <label className="block text-xs sm:text-sm text-gray-400 mb-2 font-medium">
              PIN (4-6 digits) <span className="text-pink-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength="6"
              value={userData.pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setUserData({ ...userData, pin: value });
              }}
              placeholder="••••••"
              className="w-full px-3 sm:px-4 py-3 sm:py-4 bg-gray-700 border-2 border-purple-500 rounded-lg text-white font-mono text-center text-xl sm:text-2xl tracking-widest focus:outline-none focus:border-pink-500 placeholder-gray-600"
            />
            <p className="text-xs text-gray-500 mt-2">
              📱 Numbers only. This PIN will be used for secure login.
            </p>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs sm:text-sm text-gray-400 mb-2 font-medium">
              Role <span className="text-pink-500">*</span>
            </label>
            <select
              value={userData.role}
              onChange={(e) =>
                setUserData({ ...userData, role: e.target.value })
              }
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700 border-2 border-purple-500 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-pink-500"
            >
              <option value="waitress">💁‍♀️ Waitress</option>
              <option value="bartender">🍺 Bartender</option>
              <option value="manager">📊 Manager</option>
              <option value="owner">👑 Owner</option>
            </select>

            {/* Role Description Card */}
            <div className="mt-3 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              <p className="text-xs sm:text-sm text-purple-300">
                <span className="font-semibold">Permissions: </span>
                {getRoleDescription(userData.role)}
              </p>
            </div>
          </div>

          {/* Role Permissions Info */}
          <div className="bg-gray-700/50 rounded-lg p-3 sm:p-4">
            <h4 className="text-xs sm:text-sm font-semibold text-pink-500 mb-2">
              Role Permissions Overview:
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-lg">💁‍♀️</span>
                <div>
                  <span className="font-semibold text-pink-400">Waitress:</span>
                  <span className="text-gray-400 ml-1">POS, Bills</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">🍺</span>
                <div>
                  <span className="font-semibold text-green-400">
                    Bartender:
                  </span>
                  <span className="text-gray-400 ml-1">
                    POS, Bills, Confirm Payments
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">📊</span>
                <div>
                  <span className="font-semibold text-blue-400">Manager:</span>
                  <span className="text-gray-400 ml-1">
                    Inventory, Approvals, Bills
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">👑</span>
                <div>
                  <span className="font-semibold text-purple-400">Owner:</span>
                  <span className="text-gray-400 ml-1">
                    Full Access (All Features)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="p-4 sm:p-6 border-t border-gray-700 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={handleSaveUser}
              className="flex-1 py-3 sm:py-3.5 bg-linear-to-r from-green-600 to-emerald-600 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 flex items-center justify-center transition-all active:scale-95 text-sm sm:text-base"
            >
              <Save size={18} className="mr-2" />
              {editingUser ? "Update User" : "Create User"}
            </button>
            <button
              onClick={closeModal}
              className="flex-1 py-3 sm:py-3.5 bg-gray-600 rounded-lg font-semibold hover:bg-gray-700 flex items-center justify-center transition-all active:scale-95 text-sm sm:text-base"
            >
              <X size={18} className="mr-2" />
              Cancel
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default EditUserModal;
