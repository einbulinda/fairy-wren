import { useState } from "react";
import { UserPlus, Edit2, Trash2, Eye, EyeOff, Save, X } from "lucide-react";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [userData, setUserData] = useState({
    name: "",
    pin: "",
    role: "waitress",
  });
  const [showPin, setShowPin] = useState({});

  const handleAddUser = () => {
    console.log("Add User clicked");
  };

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
      User Management Loading ...
    </div>
  );
};

export default UserManagement;
