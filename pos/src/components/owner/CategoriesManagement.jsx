import { useState, useMemo } from "react";
import { useCategories } from "../../hooks/useCategories";
import LoadingSpinner from "../shared/LoadingSpinner";
import { Edit2, Eye, EyeOff, Folder, Plus, X, Grid, List } from "lucide-react";
import toast from "react-hot-toast";

const CategoriesManagement = () => {
  const {
    categories,
    statusUpdate,
    isLoading,
    reload,
    saveCategory,
    updateCategoryDtls,
  } = useCategories();

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6b7280ff");
  const [viewMode, setViewMode] = useState("table"); // 'grid' or 'table'
  const [searchTerm, setSearchTerm] = useState("");

  /* ---------------- Filtered Categories ---------------- */
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;

    return categories.filter((category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  /* ---------------- Stats ---------------- */
  const totalCategories = categories.length;
  const activeCategories = categories.filter((c) => c.active).length;
  const inactiveCategories = totalCategories - activeCategories;

  /*---------------Actions----------------- */
  const openCreateModal = () => {
    setEditingCategory(null);
    setName("");
    setColor("#6b7280ff");
    setShowModal(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setName(category.name);
    setColor(category.color || "#6b7280ff");
    setShowModal(true);
  };

  const handleToggleStatus = async (category) => {
    const action = category.active ? "deactivate" : "activate";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} this category?`
    );

    if (!confirmed) return;

    try {
      const response = await statusUpdate(category.id, {
        active: !category.active,
      });
      if (response) {
        toast.success(`Category ${action}d successfully`);
        reload();
      }
    } catch (error) {
      toast.error(`Failed to ${action} category`);
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      if (editingCategory) {
        await updateCategoryDtls(editingCategory.id, {
          name: name.trim(),
          color,
        });
        toast.success("Category updated successfully");
        setShowModal(false);
        setEditingCategory(null);
        setName("");
        reload();
      } else {
        const response = await saveCategory({
          name: name.trim(),
          color,
        });
        if (response) {
          toast.success("Category created successfully");
          setShowModal(false);
          setEditingCategory(null);
          setName("");
          reload();
        }
      }
    } catch (error) {
      toast.error("Failed to save category");
      console.error(error);
    }
  };

  /* ----------------Loading ---------------- */
  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 pb-6">
      {/* ================= Header ================= */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold bg-linear-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Categories Management
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Organize and control product categories
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 sm:py-2 bg-linear-to-r from-pink-500 to-purple-500 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 flex items-center justify-center sm:justify-start transition-all active:scale-95 text-sm sm:text-base shadow-lg shadow-pink-500/30"
        >
          <Plus size={18} className="mr-2" /> Add Category
        </button>
      </div>

      {/* ================= Stats ================= */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="relative overflow-hidden bg-linear-to-br from-blue-900/30 to-blue-900/10 backdrop-blur-md border border-blue-500/20 p-3 sm:p-4 rounded-xl shadow-lg shadow-blue-500/5">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="text-xs sm:text-sm text-gray-400 mb-1">
              Total Categories
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {totalCategories}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-linear-to-br from-green-900/30 to-green-900/10 backdrop-blur-md border border-green-500/20 p-3 sm:p-4 rounded-xl shadow-lg shadow-green-500/5">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="text-xs sm:text-sm text-gray-400 mb-1">Active</div>
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {activeCategories}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-linear-to-br from-red-900/30 to-red-900/10 backdrop-blur-md border border-red-500/20 p-3 sm:p-4 rounded-xl shadow-lg shadow-red-500/5">
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="text-xs sm:text-sm text-gray-400 mb-1">
              Inactive
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {inactiveCategories}
            </div>
          </div>
        </div>
      </div>

      {/* ================= Search and View Toggle ================= */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="
              w-full pl-10 pr-4 py-2.5 rounded-lg
              bg-gray-900/40 backdrop-blur-md
              border border-purple-500/20
              text-white placeholder-gray-400
              focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
              transition-all duration-200
            "
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 bg-gray-900/40 backdrop-blur-md border border-purple-500/20 rounded-lg p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`
              px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-2
              ${
                viewMode === "grid"
                  ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                  : "text-gray-400 hover:text-white"
              }
            `}
          >
            <Grid size={18} />
            <span className="hidden sm:inline text-sm font-medium">Grid</span>
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`
              px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-2
              ${
                viewMode === "table"
                  ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                  : "text-gray-400 hover:text-white"
              }
            `}
          >
            <List size={18} />
            <span className="hidden sm:inline text-sm font-medium">Table</span>
          </button>
        </div>
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between text-sm text-gray-400 px-1">
        <span>
          Showing {filteredCategories.length} of {totalCategories}{" "}
          {totalCategories === 1 ? "category" : "categories"}
        </span>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Clear search
          </button>
        )}
      </div>

      {/* ================= Grid View ================= */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredCategories.map((category) => (
            <div
              key={category.id}
              className="bg-gray-900/40 backdrop-blur-md rounded-xl border border-purple-500/20 p-3 sm:p-4 flex flex-col justify-between hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.name.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                      category.active
                        ? "bg-green-500/20 text-green-300 border border-green-500/30"
                        : "bg-red-500/20 text-red-300 border border-red-500/30"
                    }`}
                  >
                    {category.active ? "Active" : "Inactive"}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white truncate">
                  {category.name}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Created: {new Date(category.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 mt-3 sm:mt-4">
                <button
                  onClick={() => openEditModal(category)}
                  className="px-2 sm:px-3 py-2 bg-blue-600/80 hover:bg-blue-600 rounded-lg flex items-center justify-center text-xs sm:text-sm transition-all active:scale-95 border border-blue-500/30"
                >
                  <Edit2 size={14} />
                  <span className="hidden sm:inline ml-1">Edit</span>
                </button>

                <button
                  onClick={() => handleToggleStatus(category)}
                  className={`px-2 sm:px-3 py-2 rounded-lg flex items-center justify-center text-xs sm:text-sm transition-all active:scale-95 border ${
                    category.active
                      ? "bg-orange-600/80 hover:bg-orange-600 border-orange-500/30"
                      : "bg-green-600/80 hover:bg-green-600 border-green-500/30"
                  }`}
                >
                  {category.active ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span className="hidden sm:inline ml-1">
                    {category.active ? "Hide" : "Show"}
                  </span>
                </button>
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-12 sm:py-16 text-gray-400">
              <Folder
                size={48}
                className="sm:w-16 sm:h-16 mx-auto mb-4 opacity-50"
              />
              <p className="text-lg sm:text-xl font-medium">
                {searchTerm ? "No categories found" : "No categories yet"}
              </p>
              <p className="text-xs sm:text-sm mt-2">
                {searchTerm
                  ? "Try adjusting your search"
                  : "Create categories to organize your products"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ================= Table View ================= */}
      {viewMode === "table" && (
        <div className="bg-gray-900/20 backdrop-blur-sm rounded-xl border border-purple-500/10 overflow-hidden">
          {/* Table Header */}
          <div className="bg-linear-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm px-4 py-3 grid grid-cols-12 gap-4 text-sm font-semibold text-purple-200">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-4 sm:col-span-3">Category</div>
            <div className="hidden sm:block sm:col-span-2">Created</div>
            <div className="col-span-3 sm:col-span-2 text-center">Status</div>
            <div className="col-span-4 sm:col-span-4 text-right">Actions</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-purple-500/10">
            {filteredCategories.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Folder
                  size={48}
                  className="w-16 h-16 mx-auto mb-4 opacity-50"
                />
                <p className="text-lg font-medium">
                  {searchTerm ? "No categories found" : "No categories yet"}
                </p>
                <p className="text-sm mt-2">
                  {searchTerm
                    ? "Try adjusting your search"
                    : "Create categories to organize your products"}
                </p>
              </div>
            ) : (
              filteredCategories.map((category, index) => (
                <div
                  key={category.id}
                  className={`
                    px-4 py-4 grid grid-cols-12 gap-4 items-center
                    transition-colors duration-200
                    ${index % 2 === 0 ? "bg-gray-900/20" : "bg-gray-900/5"}
                    hover:bg-purple-500/10
                  `}
                >
                  {/* Index */}
                  <div className="col-span-1 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-sm">
                      {index + 1}
                    </span>
                  </div>

                  {/* Category Info */}
                  <div className="col-span-4 sm:col-span-3 flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0"
                      style={{ backgroundColor: category.color }}
                    >
                      {category.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">
                        {category.name}
                      </p>
                      <p className="text-xs text-gray-400 sm:hidden">
                        {new Date(category.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Created Date */}
                  <div className="hidden sm:block sm:col-span-2 text-gray-300 text-sm">
                    {new Date(category.created_at).toLocaleDateString()}
                  </div>

                  {/* Status */}
                  <div className="col-span-3 sm:col-span-2 flex justify-center">
                    <span
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        category.active
                          ? "bg-green-500/20 text-green-300 border border-green-500/30"
                          : "bg-red-500/20 text-red-300 border border-red-500/30"
                      }`}
                    >
                      {category.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-4 sm:col-span-4 flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(category)}
                      className="px-3 py-2 bg-blue-600/80 hover:bg-blue-600 rounded-lg flex items-center gap-1 text-sm transition-all active:scale-95 border border-blue-500/30"
                      title="Edit category"
                    >
                      <Edit2 size={14} />
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    <button
                      onClick={() => handleToggleStatus(category)}
                      className={`px-3 py-2 rounded-lg flex items-center gap-1 text-sm transition-all active:scale-95 border ${
                        category.active
                          ? "bg-orange-600/80 hover:bg-orange-600 border-orange-500/30"
                          : "bg-green-600/80 hover:bg-green-600 border-green-500/30"
                      }`}
                      title={category.active ? "Deactivate" : "Activate"}
                    >
                      {category.active ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} />
                      )}
                      <span className="hidden sm:inline">
                        {category.active ? "Hide" : "Show"}
                      </span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================= Modal ================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-gray-900/95 backdrop-blur-md border-2 border-purple-500/30 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up shadow-2xl shadow-purple-500/20">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-purple-500/20 shrink-0">
              <h3 className="text-xl sm:text-2xl font-bold bg-linear-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                {editingCategory ? "Edit Category" : "New Category"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X size={24} className="text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Category Name */}
              <div>
                <label className="block text-xs sm:text-sm text-gray-400 mb-2 font-medium">
                  Category Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-800/50 backdrop-blur-sm border-2 border-purple-500/30 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 placeholder-gray-500 transition-all duration-200"
                  placeholder="e.g. Beverages, Snacks, Beers"
                  autoFocus
                />
              </div>

              {/* Category Color */}
              <div>
                <label className="block text-xs sm:text-sm text-gray-400 mb-2 font-medium">
                  Category Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color.slice(0, 7)}
                    onChange={(e) => setColor(`${e.target.value}ff`)}
                    className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-800/50 rounded-lg cursor-pointer border-2 border-purple-500/30"
                  />
                  <div className="flex-1">
                    <div
                      className="w-full h-16 sm:h-20 rounded-lg flex items-center justify-center text-white font-bold text-2xl sm:text-3xl shadow-lg"
                      style={{ backgroundColor: color }}
                    >
                      {name ? name.charAt(0).toUpperCase() : "?"}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This color will be used to identify the category throughout
                  the app
                </p>
              </div>

              {/* Color Presets */}
              <div>
                <label className="block text-xs sm:text-sm text-gray-400 mb-2 font-medium">
                  Quick Presets
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {[
                    "#ef4444ff", // Red
                    "#f97316ff", // Orange
                    "#f59e0bff", // Amber
                    "#eab308ff", // Yellow
                    "#84cc16ff", // Lime
                    "#22c55eff", // Green
                    "#14b8a6ff", // Teal
                    "#06b6d4ff", // Cyan
                    "#0ea5e9ff", // Sky
                    "#3b82f6ff", // Blue
                    "#6366f1ff", // Indigo
                    "#8b5cf6ff", // Violet
                    "#a855f7ff", // Purple
                    "#d946efff", // Fuchsia
                    "#ec4899ff", // Pink
                    "#f43f5eff", // Rose
                  ].map((presetColor) => (
                    <button
                      key={presetColor}
                      onClick={() => setColor(presetColor)}
                      className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 ${
                        color === presetColor
                          ? "border-white ring-2 ring-purple-500"
                          : "border-gray-600"
                      }`}
                      style={{ backgroundColor: presetColor }}
                      aria-label={`Select color ${presetColor}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-6 border-t border-purple-500/20 shrink-0">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 sm:py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg hover:bg-gray-800 transition-all active:scale-95 text-sm sm:text-base font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="flex-1 py-2.5 sm:py-3 bg-linear-to-r from-pink-500 to-purple-500 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 text-sm sm:text-base shadow-lg shadow-pink-500/30 border border-pink-500/30"
                >
                  {editingCategory ? "Update" : "Create"} Category
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
      )}
    </div>
  );
};

export default CategoriesManagement;
