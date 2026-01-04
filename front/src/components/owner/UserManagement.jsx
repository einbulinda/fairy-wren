import { useState } from "react";
import {
  UserPlus,
  Edit2,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useUsers } from "../../hooks/useUsers";
import toast from "react-hot-toast";
import EditUserModal from "./EditUserModal";
import LoadingSpinner from "../shared/LoadingSpinner";

const ITEMS_PER_PAGE = 10;

const UserManagement = () => {
  const { users, isLoading, reload, deactivateUser } = useUsers();
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [userData, setUserData] = useState({
    name: "",
    pin: "",
    role: "waitress",
  });

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, users]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

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
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-pink-500">
            User Management
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Manage system users and their access levels
          </p>
        </div>
        <button
          onClick={handleAddUser}
          className="px-4 py-2.5 sm:py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 flex items-center justify-center sm:justify-start transition-all active:scale-95 text-sm sm:text-base"
        >
          <UserPlus size={18} className="mr-2" />
          Add User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-purple-200">Total Users</div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {users.length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-pink-600 to-pink-700 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-pink-200">Waitresses</div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {users.filter((u) => u.role === "waitress").length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-green-700 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-green-200">Bartenders</div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {users.filter((u) => u.role === "bartender").length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-emerald-600 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-green-200">Active Users</div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {users.filter((u) => u.active).length}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={20}
        />
        <input
          type="text"
          placeholder="Search by name or role..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-10 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-pink-500 placeholder-gray-500"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery("");
              setCurrentPage(1);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
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
              {paginatedUsers.map((user) => (
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
                        className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 flex items-center transition-all active:scale-95"
                        title="Edit user"
                      >
                        <Edit2 size={14} className="mr-1" />
                        Edit
                      </button>
                      {user.role !== "owner" && (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.active)}
                          className={`px-3 py-1 rounded flex items-center transition-all active:scale-95 ${
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
        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <UserPlus size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-xl">No users found</p>
            <p className="text-sm mt-2">
              {searchQuery
                ? "Try adjusting your search"
                : "Add your first user to get started"}
            </p>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {paginatedUsers.map((user) => (
          <div
            key={user.id}
            className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-pink-500 transition-all"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-3xl flex-shrink-0">
                  {getRoleIcon(user.role)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate">{user.name}</h3>
                  <p className="text-xs text-gray-400">
                    ID: {user.id.slice(0, 8)}
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                  user.active ? "bg-green-600" : "bg-red-600"
                }`}
              >
                {user.active ? "Active" : "Inactive"}
              </span>
            </div>

            {/* Details */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Role:</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${getRoleBadgeColor(
                    user.role
                  )}`}
                >
                  {user.role}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Created:</span>
                <span className="text-xs text-gray-300">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleEditUser(user)}
                className="px-3 py-2 bg-blue-600 rounded hover:bg-blue-700 flex items-center justify-center text-sm transition-all active:scale-95"
              >
                <Edit2 size={14} className="mr-1" />
                Edit
              </button>
              {user.role !== "owner" && (
                <button
                  onClick={() => handleDeleteUser(user.id, user.active)}
                  className={`px-3 py-2 rounded flex items-center justify-center text-sm transition-all active:scale-95 ${
                    user.active
                      ? "bg-orange-600 hover:bg-orange-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {user.active ? "Deactivate" : "Activate"}
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <UserPlus size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No users found</p>
            <p className="text-sm mt-2">
              {searchQuery
                ? "Try adjusting your search"
                : "Add your first user to get started"}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredUsers.length > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-700">
          <div className="text-xs sm:text-sm text-gray-400">
            Page {currentPage} of {totalPages} ({filteredUsers.length} total
            users)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-1 text-sm"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Page Numbers */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg transition-all text-sm sm:text-base ${
                      currentPage === pageNum
                        ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-1 text-sm"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

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
