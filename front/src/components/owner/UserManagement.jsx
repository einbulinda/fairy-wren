import { useState } from "react";
import { UserPlus, Edit2, Eye, EyeOff } from "lucide-react";
import { useUsers } from "../../hooks/useUsers";
import toast from "react-hot-toast";
import EditUserModal from "./EditUserModal";
import LoadingSpinner from "../shared/LoadingSpinner";

const UserManagement = () => {
  const { users, isLoading, reload, deactivateUser } = useUsers();
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userData, setUserData] = useState({
    name: "",
    pin: "",
    role: "waitress",
  });
  const [showPin, setShowPin] = useState({});

  const handleAddUser = () => {
    setEditingUser(null);
    setUserData({
      name: "",
      pin: "",
      role: "waitress",
    });
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserData({
      name: user.name,
      pin: user.pin,
      role: user.role,
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId, currentStatus) => {
    const action = currentStatus ? "deactivate" : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this user?`
    );

    if (!confirmed) return;

    try {
      await deactivateUser(userId, !currentStatus);
      toast.success(`User ${action}d successfully`);
      reload();
    } catch (error) {
      toast.error(`Failed to ${action} user`);
      console.error(error);
    }
  };

  const togglePinVisibility = (userId) => {
    setShowPin((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "owner":
        return "bg-purple-600";
      case "manager":
        return "bg-blue-600";
      case "bartender":
        return "bg-green-600";
      case "waitress":
        return "bg-pink-600";
      default:
        return "bg-gray-600";
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "owner":
        return "👑";
      case "manager":
        return "📊";
      case "bartender":
        return "🍺";
      case "waitress":
        return "💁‍♀️";
      default:
        return "👤";
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      {/* Start: Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-pink-500">User Management</h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage system users and their access levels
          </p>
        </div>
        <button
          onClick={handleAddUser}
          className="px-4 py-2 bg-linear-to-r from-pink-500 to-purple-500 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 flex items-center"
        >
          <UserPlus size={18} className="mr-2" />
          Add User
        </button>
      </div>
      {/* End: Header */}
      {/* Start: Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-purple-600 to-purple-700 p-4 rounded-lg">
          <div className="text-sm text-purple-200">Total Users</div>
          <div className="text-3xl font-bold text-white">{users.length}</div>
        </div>
        <div className="bg-linear-to-br from-pink-600 to-pink-700 p-4 rounded-lg">
          <div className="text-sm text-pink-200">Waitresses</div>
          <div className="text-3xl font-bold text-white">
            {users.filter((u) => u.role === "waitress").length}
          </div>
        </div>
        <div className="bg-linear-to-br from-green-600 to-green-700 p-4 rounded-lg">
          <div className="text-sm text-green-200">Bartenders</div>
          <div className="text-3xl font-bold text-white">
            {users.filter((u) => u.role === "bartender").length}
          </div>
        </div>

        <div className="bg-linear-to-br from-green-600 to-emerald-600 p-4 rounded-lg">
          <div className="text-sm text-green-200">Active Users</div>
          <div className="text-3xl font-bold text-white">
            {users.filter((u) => u.active).length}
          </div>
        </div>
      </div>
      {/* End: Stats Cards */}

      {/* Start: Users Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-750">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  PIN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-750 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-2xl mr-3">
                        {getRoleIcon(user.role)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          ID: {user.id.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono text-gray-300">
                        {showPin[user.id] ? user.pin : "••••"}
                      </span>
                      <button
                        onClick={() => togglePinVisibility(user.id)}
                        className="text-gray-400 hover:text-white"
                      >
                        {showPin[user.id] ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.active
                          ? "bg-green-600 text-white"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {user.active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 flex items-center"
                        title="Edit user"
                      >
                        <Edit2 size={14} className="mr-1" />
                        Edit
                      </button>
                      {user.role !== "owner" && (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.active)}
                          className={`px-3 py-1 rounded flex items-center ${
                            user.active
                              ? "bg-orange-600 hover:bg-orange-700"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                          title={user.active ? "Deactivate" : "Activate"}
                        >
                          {user.active ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <UserPlus size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-xl">No users found</p>
            <p className="text-sm mt-2">Add your first user to get started</p>
          </div>
        )}
      </div>
      {/* Add/Edit User Modal */}
      {showUserModal && (
        <EditUserModal
          editingUser={editingUser}
          userData={userData}
          users={users}
          setUserData={setUserData}
          closeModal={() => {
            setShowUserModal(false);
            setEditingUser(null);
            setUserData({ name: "", pin: "", role: "waitress" });
            reload();
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;
