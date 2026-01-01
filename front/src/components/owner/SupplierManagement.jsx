import { useState } from "react";
import { useSuppliers } from "../../hooks/useSuppliers";
import LoadingSpinner from "../shared/LoadingSpinner";
import toast from "react-hot-toast";
import {
  Building2,
  Check,
  Edit2,
  Mail,
  Phone,
  Plus,
  Save,
  Search,
  ToggleLeft,
  ToggleRight,
  User,
  Users,
  X,
} from "lucide-react";

const SupplierManagement = () => {
  const { suppliers, addSupplier, isLoading, reload, updateSupplier } =
    useSuppliers();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const handleAdd = async () => {
    if (!form.name) {
      toast.error("Supplier name is required");
      return;
    }

    // Email validation
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      const response = await addSupplier(form);
      if (response) toast.success("Supplier added successfully");
      reload();
      setForm({ name: "", phone: "", email: "" });
    } catch (error) {
      toast.error(error.message || "Failed to add supplier");
    }
  };

  const startEdit = (supplier) => {
    setEditingId(supplier.id);
    setEditForm({
      name: supplier.name,
      phone: supplier.phone || "",
      email: supplier.email || "",
      active: supplier.active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleUpdate = async (id) => {
    if (!editForm.name) {
      toast.error("Supplier name is required");
      return;
    }

    // Email validation
    if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      const response = await updateSupplier(id, editForm);
      if (response) toast.success("Supplier updated successfully");
      reload();
      setEditingId(null);
      setEditForm({});
    } catch (error) {
      toast.error(error.message || "Failed to update supplier");
    }
  };

  const toggleActive = async (supplier) => {
    try {
      const response = await updateSupplier(supplier.id, {
        active: !supplier.active,
      });
      if (response)
        toast.success(
          `Supplier ${!supplier.active ? "activated" : "deactivated"}`
        );
      reload();
    } catch (error) {
      toast.error(error.message || "Failed to update supplier status");
    }
  };

  // Filter and search logic
  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.phone &&
        supplier.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (supplier.email &&
        supplier.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesActive = showInactive || supplier.active;
    return matchesSearch && matchesActive;
  });

  // Statistics
  const activeCount = suppliers.filter((s) => s.active).length;
  const inactiveCount = suppliers.filter((s) => !s.active).length;
  const withEmailCount = suppliers.filter((s) => s.email && s.active).length;
  const withPhoneCount = suppliers.filter((s) => s.phone && s.active).length;

  if (isLoading) return <LoadingSpinner />;
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Supplier Management
            </h1>
            <p className="text-gray-400 mt-1 text-sm md:text-base">
              Manage your supplier relationships
            </p>
          </div>

          {/* Stats Summary */}
          <div className="bg-linear-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Users size={16} />
              <span>Active Suppliers</span>
            </div>
            <div className="text-2xl font-bold text-pink-500">
              {activeCount}
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 hover:border-gray-600 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-linear-to-br from-green-500 to-emerald-500 bg-opacity-10 rounded-lg">
                <Check size={20} className="text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {activeCount}
                </div>
                <div className="text-xs text-gray-400">Active</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 hover:border-gray-600 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-linear-to-br from-red-500 to-orange-500 bg-opacity-10 rounded-lg">
                <X size={20} className="text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {inactiveCount}
                </div>
                <div className="text-xs text-gray-400">Inactive</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 hover:border-gray-600 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-linear-to-br from-blue-500 to-cyan-500 bg-opacity-10 rounded-lg">
                <Mail size={20} className="text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {withEmailCount}
                </div>
                <div className="text-xs text-gray-400">With Email</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 hover:border-gray-600 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-linear-to-br from-purple-500 to-pink-500 bg-opacity-10 rounded-lg">
                <Phone size={20} className="text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {withPhoneCount}
                </div>
                <div className="text-xs text-gray-400">With Phone</div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Supplier Form Card */}

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 md:p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-linear-to-br from-pink-500 to-purple-500 rounded-lg">
              <Plus size={20} className="text-white" />
            </div>
            <h2 className="text-lg md:text-xl font-semibold text-white">
              Add New Supplier
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Supplier Name */}

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Building2 size={16} className="text-pink-500" />
                Supplier Name *
              </label>
              <input
                type="text"
                placeholder="e.g., ABC Supplies Ltd"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Phone */}

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Phone size={16} className="text-purple-500" />
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="e.g., +254 712 345 678"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Mail size={16} className="text-pink-500" />
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g., supplier@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleAdd}
              className="px-6 py-3 bg-linear-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-lg font-semibold text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 transition-all duration-200 flex items-center gap-2"
            >
              <Plus size={18} />
              Add Supplier
            </button>
          </div>
        </div>

        {/* Search and Filter Section */}

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Show Inactive Toggle */}
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all ${
                showInactive
                  ? "bg-linear-to-r from-pink-500 to-purple-500 text-white"
                  : "bg-gray-900/50 border border-gray-600 text-gray-300 hover:bg-gray-900"
              }`}
            >
              {showInactive ? (
                <ToggleRight size={18} />
              ) : (
                <ToggleLeft size={18} />
              )}
              <span className="hidden sm:inline">Show Inactive</span>
            </button>
          </div>
        </div>

        {/* Suppliers List */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 md:p-6 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-semibold text-white">
                Suppliers
              </h2>
              <div className="text-sm text-gray-400">
                {filteredSuppliers.length}{" "}
                {filteredSuppliers.length === 1 ? "supplier" : "suppliers"}
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-700/50">
            {filteredSuppliers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700/50 rounded-full mb-4">
                  <Building2 size={32} className="text-gray-500" />
                </div>
                <p className="text-gray-400">No suppliers found</p>
                <p className="text-gray-500 text-sm mt-1">
                  {searchTerm
                    ? "Try adjusting your search"
                    : "Add your first supplier to get started"}
                </p>
              </div>
            ) : (
              filteredSuppliers.map((supplier) => {
                const isEditing = editingId === supplier.id;

                return (
                  <div
                    key={supplier.id}
                    className={`p-4 md:p-5 transition-colors duration-150 ${
                      supplier.active
                        ? "hover:bg-gray-700/30"
                        : "bg-gray-700/20 opacity-60"
                    }`}
                  >
                    {isEditing ? (
                      // Edit Mode

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                            placeholder="Supplier Name"
                            className="px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                          />
                          <input
                            type="tel"
                            value={editForm.phone}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                phone: e.target.value,
                              })
                            }
                            placeholder="Phone Number"
                            className="px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          />
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                email: e.target.value,
                              })
                            }
                            placeholder="Email Address"
                            className="px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                          />
                        </div>

                        {/* Active Toggle in Edit Mode */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              setEditForm({
                                ...editForm,
                                active: !editForm.active,
                              })
                            }
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              editForm.active
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {editForm.active ? (
                              <Check size={16} />
                            ) : (
                              <X size={16} />
                            )}
                            {editForm.active ? "Active" : "Inactive"}
                          </button>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 justify-end">
                          <button
                            onClick={() => handleUpdate(supplier.id)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-colors"
                          >
                            <Save size={16} />
                            Save Changes
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-colors"
                          >
                            <X size={16} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                          {/* Icon */}
                          <div className="p-2 md:p-3 bg-linear-to-br from-pink-500 to-purple-500 bg-opacity-10 border border-pink-500/30 rounded-xl shrink-0">
                            <Building2 size={20} className="text-pink-500" />
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                              <h3 className="font-semibold text-white text-base md:text-lg truncate">
                                {supplier.name}
                              </h3>
                              <span
                                className={`flex items-center gap-1 text-xs ${
                                  supplier.active
                                    ? "text-green-500"
                                    : "text-red-500"
                                } w-fit`}
                              >
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    supplier.active
                                      ? "bg-green-500"
                                      : "bg-red-500"
                                  }`}
                                ></div>
                                {supplier.active ? "Active" : "Inactive"}
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {supplier.phone && (
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                  <Phone
                                    size={14}
                                    className="text-purple-500 shrink-0"
                                  />
                                  <span className="truncate">
                                    {supplier.phone}
                                  </span>
                                </div>
                              )}
                              {supplier.email && (
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                  <Mail
                                    size={14}
                                    className="text-pink-500 shrink-0"
                                  />
                                  <span className="truncate">
                                    {supplier.email}
                                  </span>
                                </div>
                              )}
                              {!supplier.phone && !supplier.email && (
                                <p className="text-sm text-gray-500 italic">
                                  No contact information
                                </p>
                              )}
                            </div>

                            {/* Metadata */}
                            <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                              <User size={12} />
                              <span>
                                Added{" "}
                                {new Date(
                                  supplier.created_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => toggleActive(supplier)}
                            className={`p-2 md:p-2.5 rounded-lg transition-colors ${
                              supplier.active
                                ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                                : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                            }`}
                            title={supplier.active ? "Deactivate" : "Activate"}
                          >
                            {supplier.active ? (
                              <ToggleRight size={16} />
                            ) : (
                              <ToggleLeft size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => startEdit(supplier)}
                            className="p-2 md:p-2.5 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} className="text-gray-300" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierManagement;
