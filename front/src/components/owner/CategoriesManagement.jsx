import React, { useState } from "react";
import { useCategories } from "../../hooks/useCategories";
import LoadingSpinner from "../shared/LoadingSpinner";
import { Edit2, Eye, EyeOff, Folder, Plus } from "lucide-react";
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
      await statusUpdate(category.id, { active: !category.active });
      toast.success(`Category ${action}d successfully`);
      reload();
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
        await saveCategory({
          name: name.trim(),
          color,
        });
        toast.success("Category created successfully");
      }

      setShowModal(false);
      setEditingCategory(null);
      setName("");
      reload();
    } catch (error) {
      toast.error("Failed to save category");
      console.error(error);
    }
  };

  /* ----------------Loading ---------------- */
  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* ================= Header ================= */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-pink-500">
            Categories Management
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Organize and control product categories
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-linear-to-r from-pink-500 to-purple-500 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 flex items-center"
        >
          <Plus size={18} className="mr-2" /> Add Category
        </button>
      </div>

      {/* ================= Stats ================= */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-linear-to-br from-blue-600 to-blue-700 p-4 rounded-lg">
          <div className="text-sm text-blue-200">Total Categories</div>
          <div className="text-3xl font-bold text-white">{totalCategories}</div>
        </div>

        <div className="bg-linear-to-br from-green-600 to-green-700 p-4 rounded-lg">
          <div className="text-sm text-green-200">Active</div>
          <div className="text-3xl font-bold text-white">
            {activeCategories}
          </div>
        </div>

        <div className="bg-linear-to-br from-red-600 to-red-700 p-4 rounded-lg">
          <div className="text-sm text-red-200">Inactive</div>
          <div className="text-3xl font-bold text-white">
            {inactiveCategories}
          </div>
        </div>
      </div>

      {/* ================= Categories Grid ================= */}
      <div className="grid grid-cols-4 gap-4">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-gray-800 rounded-lg border border-gray-700 p-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
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

              <h3 className="text-lg font-bold">{category.name}</h3>
              <p className="text-xs text-gray-500 mt-1">
                Created: {new Date(category.created_at).toLocaleDateString()}
              </p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => openEditModal(category)}
                className="px-3 py-2 bg-blue-600 rounded hover:bg-blue-700 flex items-center justify-center text-sm"
              >
                <Edit2 size={14} className="mr-1" />
                Edit
              </button>

              <button
                onClick={() => handleToggleStatus(category)}
                className={`px-3 py-2 rounded flex items-center justify-center text-sm ${
                  category.active
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {category.active ? (
                  <EyeOff size={14} className="mr-1" />
                ) : (
                  <Eye size={14} className="mr-1" />
                )}
                {category.active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="col-span-4 text-center py-12 text-gray-500">
            <Folder size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-xl">No categories found</p>
            <p className="text-sm mt-2">
              Create categories to organize your products
            </p>
          </div>
        )}
      </div>

      {/* ================= Modal ================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-md p-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-pink-500">
              {editingCategory ? "Edit Category" : "New Category"}
            </h3>

            <label className="block text-sm text-gray-400 mb-2">
              Category Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-purple-500 rounded-lg text-white focus:outline-none focus:border-pink-500"
              placeholder="e.g. Beverages"
            />

            {/* Advanced Picker */}
            <label className="block text-sm text-gray-400 mt-4 mb-2">
              Category Color
            </label>
            <input
              type="color"
              value={color.slice(0, 7)}
              onChange={(e) => setColor(`${e.target.value}ff`)}
              className="w-full h-10 bg-gray-700 rounded cursor-pointer"
            />

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-linear-to-r from-pink-500 to-purple-500 rounded font-semibold hover:from-pink-600 hover:to-purple-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesManagement;
