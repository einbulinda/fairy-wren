import { useState } from "react";
import { useCategories } from "../../hooks/useCategories";
import LoadingSpinner from "../shared/LoadingSpinner";
import { Edit2, Eye, EyeOff, Folder, Plus, X } from "lucide-react";
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
          <h2 className="text-xl sm:text-2xl font-bold text-pink-500">
            Categories Management
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Organize and control product categories
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 sm:py-2 bg-linear-to-r from-pink-500 to-purple-500 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 flex items-center justify-center sm:justify-start transition-all active:scale-95 text-sm sm:text-base"
        >
          <Plus size={18} className="mr-2" /> Add Category
        </button>
      </div>

      {/* ================= Stats ================= */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-linear-to-br from-blue-600 to-blue-700 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-blue-200">
            Total Categories
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {totalCategories}
          </div>
        </div>

        <div className="bg-linear-to-br from-green-600 to-green-700 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-green-200">Active</div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {activeCategories}
          </div>
        </div>

        <div className="bg-linear-to-br from-red-600 to-red-700 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-red-200">Inactive</div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {inactiveCategories}
          </div>
        </div>
      </div>

      {/* ================= Categories Grid ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-gray-800 rounded-lg border border-gray-700 p-3 sm:p-4 flex flex-col justify-between hover:border-pink-500 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg sm:text-xl"
                  style={{ backgroundColor: category.color }}
                >
                  {category.name.charAt(0).toUpperCase()}
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    category.active ? "bg-green-600" : "bg-red-600"
                  }`}
                >
                  {category.active ? "Active" : "Inactive"}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold truncate">
                {category.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Created: {new Date(category.created_at).toLocaleDateString()}
              </p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 mt-3 sm:mt-4">
              <button
                onClick={() => openEditModal(category)}
                className="px-2 sm:px-3 py-2 bg-blue-600 rounded hover:bg-blue-700 flex items-center justify-center text-xs sm:text-sm transition-all active:scale-95"
              >
                <Edit2 size={14} className="sm:*:mr-1" />
                <span className="hidden sm:inline ml-1">Edit</span>
              </button>

              <button
                onClick={() => handleToggleStatus(category)}
                className={`px-2 sm:px-3 py-2 rounded flex items-center justify-center text-xs sm:text-sm transition-all active:scale-95 ${
                  category.active
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {category.active ? (
                  <EyeOff size={14} className="sm:mr-1" />
                ) : (
                  <Eye size={14} className="sm:mr-1" />
                )}
                <span className="hidden sm:inline ml-1">
                  {category.active ? "Hide" : "Show"}
                </span>
              </button>
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-12 sm:py-16 text-gray-500">
            <Folder
              size={48}
              className="sm:w-16 sm:h-16 mx-auto mb-4 opacity-50"
            />
            <p className="text-lg sm:text-xl font-medium">
              No categories found
            </p>
            <p className="text-xs sm:text-sm mt-2">
              Create categories to organize your products
            </p>
          </div>
        )}
      </div>

      {/* ================= Modal ================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-gray-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border-2 border-pink-500 max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-700 flex-shrink-0">
              <h3 className="text-xl sm:text-2xl font-bold text-pink-500">
                {editingCategory ? "Edit Category" : "New Category"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
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
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700 border-2 border-purple-500 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-pink-500 placeholder-gray-500"
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
                    className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-700 rounded-lg cursor-pointer border-2 border-gray-600"
                  />
                  <div className="flex-1">
                    <div
                      className="w-full h-16 sm:h-20 rounded-lg flex items-center justify-center text-white font-bold text-2xl sm:text-3xl"
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
                          ? "border-white ring-2 ring-pink-500"
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
            <div className="p-4 sm:p-6 border-t border-gray-700 shrink-0">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 sm:py-3 bg-gray-600 rounded-lg hover:bg-gray-700 transition-all active:scale-95 text-sm sm:text-base font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="flex-1 py-2.5 sm:py-3 bg-linear-to-r from-pink-500 to-purple-500 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 text-sm sm:text-base"
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
