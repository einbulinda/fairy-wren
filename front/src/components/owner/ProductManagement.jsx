import { useMemo, useState } from "react";
import {
  Plus,
  Edit2,
  Eye,
  EyeOff,
  Search,
  ChevronRight,
  ChevronLeft,
  X,
  Package,
} from "lucide-react";
import { useProducts } from "../../hooks/useProducts";
import { useCategories } from "../../hooks/useCategories";
import LoadingSpinner from "../shared/LoadingSpinner";
import EditProductModal from "./EditProductModal";
import toast from "react-hot-toast";

const ITEMS_PER_PAGE = 15;

const ProductManagement = () => {
  const {
    products,
    isLoading: productsLoading,
    updateProduct,
    addProduct,
    reload: reloadProducts,
    deactivateProduct,
  } = useProducts();
  const { categories, isLoading: categoriesLoading } = useCategories();

  // Component States
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showProductModal, setShowProductModal] = useState(null);
  const [editingProduct, setEditingProduct] = useState("");
  const [productData, setProductData] = useState({
    name: "",
    price: "",
    categoryId: "",
    stock: "",
  });

  // Statistics
  const activeProductsCount = products.filter((p) => p.active).length;
  const totalStockValue = products.reduce(
    (sum, p) => sum + p.price * p.stock,
    0
  );
  const lowStockCount = products.filter((p) => p.stock < 20).length;

  // Filter and Search Logic
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];

    return products.filter((product) => {
      // Category Filter
      let categoryMatch =
        filterCategory === "all" ||
        filterCategory === "" ||
        product.category_id === filterCategory;

      // Status Filter
      let statusMatch =
        filterStatus === "all" ||
        filterStatus === "" ||
        (filterStatus === "active" && product.active) ||
        (filterStatus === "inactive" && !product.active);

      // Search Filter
      const searchMatch =
        searchQuery === "" ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.price.toString().includes(searchQuery);

      return categoryMatch && statusMatch && searchMatch;
    });
  }, [products, filterCategory, filterStatus, searchQuery]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredProducts?.length / ITEMS_PER_PAGE);

  const paginatedProducts = useMemo(() => {
    if (!filteredProducts.length) return [];

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredProducts?.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage]);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Helper to get category color and name
  const getCategoryInfo = (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    return {
      name: category?.name || "Unknown",
      color: category?.color || "#666",
    };
  };

  // Logic
  const handleAddProduct = () => {
    setEditingProduct(null);
    setProductData({
      name: "",
      price: "",
      categoryId: categories[0]?.id || "",
      stock: "",
    });

    setShowProductModal(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductData({
      name: product.name,
      price: product.price,
      categoryId: product.category_id,
      stock: product.stock,
    });
    setShowProductModal(true);
  };

  const handleToggleStatus = async (productId, currentStatus) => {
    const action = currentStatus ? "deactivate" : "activate";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} this product?`
    );

    if (!confirmed) return;

    try {
      await deactivateProduct(productId, !currentStatus);
      toast.success(`Product ${action}d successfully`);

      reloadProducts();
    } catch (error) {
      toast.error(`Failed to ${action} product`);
      console.error(error);
    }
  };

  const handleSaveProduct = async () => {
    // Validation
    if (!productData.name.trim()) {
      toast.error("Please enter product name");
      return;
    }

    if (!productData.price || parseFloat(productData.price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    if (!productData.categoryId) {
      toast.error("Please select a category");
      return;
    }

    if (productData.stock === "" || parseInt(productData.stock) < 0) {
      toast.error("Please enter valid stock quantity");
      return;
    }

    try {
      const productPayload = {
        name: productData.name.trim(),
        price: parseFloat(productData.price),
        category_id: productData.categoryId,
        stock: parseInt(productData.stock),
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: productPayload.name,
          price: productPayload.price,
          category_id: productPayload.categoryId,
          stock: productPayload.stock,
        });
        toast.success("Product updated successfully");
      } else {
        const response = await addProduct(productPayload);

        if (!response) {
          toast.error("Product creation failed");
        } else {
          toast.success("Product created successfully");
        }
      }

      setShowProductModal(false);
      setProductData({
        name: "",
        price: "",
        categoryId: categories[0]?.id || "",
        stock: "",
      });
      reloadProducts();
    } catch (error) {
      toast.error(
        editingProduct ? "Failed to update product" : "Failed to create product"
      );
      console.error(error);
    }
  };

  // Loading State
  if (productsLoading || categoriesLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-pink-500">
            Product Management
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Manage products, pricing, and inventory
          </p>
        </div>

        <button
          onClick={handleAddProduct}
          className="px-4 py-2.5 sm:py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 
          flex items-center justify-center sm:justify-start transition-all active:scale-95 text-sm sm:text-base"
        >
          <Plus size={18} className="mr-2" />
          Add Product
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-blue-200">Total Products</div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {products.length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-green-700 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-green-200">
            Active Products
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {activeProductsCount}
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-purple-200">Stock Value</div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
            KSh. {totalStockValue.toLocaleString()}
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-600 to-red-700 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-red-200">Low Stock</div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {lowStockCount}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-700 space-y-3 sm:space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search products by name or price..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-10 py-2.5 bg-gray-700 border border-purple-500 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-pink-500 placeholder-gray-400"
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

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm text-gray-400 mb-2">
              Category
            </label>
            <select
              value={filterCategory}
              onChange={handleFilterChange(setFilterCategory)}
              className="w-full px-3 sm:px-4 py-2 bg-gray-700 border border-purple-500 rounded-lg text-white focus:outline-none focus:border-pink-500 text-sm sm:text-base"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm text-gray-400 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={handleFilterChange(setFilterStatus)}
              className="w-full px-3 sm:px-4 py-2 bg-gray-700 border border-purple-500 rounded-lg text-white focus:outline-none focus:border-pink-500 text-sm sm:text-base"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        {(searchQuery || filterCategory || filterStatus) && (
          <div className="text-xs sm:text-sm text-gray-400">
            Showing {filteredProducts?.length} of {products?.length} products
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-750">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {paginatedProducts?.map((product) => {
                const categoryInfo = getCategoryInfo(product.category_id);
                return (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-750 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-2xl mr-3">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-10 h-10 object-contain rounded"
                            />
                          ) : (
                            <span>{product.image || "📦"}</span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {product.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            ID: {product.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: categoryInfo.color }}
                      >
                        {categoryInfo.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-pink-500">
                        KSh. {product.price.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-gray-400" />
                        <span
                          className={`text-sm font-bold ${
                            product.stock < 20
                              ? "text-red-500"
                              : product.stock < 50
                              ? "text-yellow-500"
                              : "text-green-500"
                          }`}
                        >
                          {product.stock}
                        </span>
                        {product.stock < 20 && (
                          <span className="text-xs text-red-400">(Low)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          product.active
                            ? "bg-green-600 text-white"
                            : "bg-red-600 text-white"
                        }`}
                      >
                        {product.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 flex items-center transition-all active:scale-95"
                          title="Edit product"
                        >
                          <Edit2 size={14} className="mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            handleToggleStatus(product.id, product.active)
                          }
                          className={`px-3 py-1 rounded flex items-center transition-all active:scale-95 ${
                            product.active
                              ? "bg-orange-600 hover:bg-orange-700"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                          title={product.active ? "Deactivate" : "Activate"}
                        >
                          {product.active ? (
                            <>
                              <EyeOff size={14} className="mr-1" />
                              Hide
                            </>
                          ) : (
                            <>
                              <Eye size={14} className="mr-1" />
                              Show
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Package size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-xl">No products found</p>
            <p className="text-sm mt-2">
              {searchQuery || filterCategory || filterStatus
                ? "Try adjusting your search or filters"
                : "Add your first product to get started"}
            </p>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {paginatedProducts?.map((product) => {
          const categoryInfo = getCategoryInfo(product.category_id);
          return (
            <div
              key={product.id}
              className="bg-gradient-to-br from-gray-800 to-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden hover:border-pink-500 transition-all shadow-lg"
            >
              {/* Header with gradient */}
              <div
                className="h-2"
                style={{
                  background: `linear-gradient(to right, ${categoryInfo.color}, ${categoryInfo.color}80)`,
                }}
              />

              <div className="p-4 space-y-3">
                {/* Product Name & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-white truncate mb-1">
                      {product.name}
                    </h3>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: categoryInfo.color }}
                    >
                      {categoryInfo.name}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        product.active
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {product.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Price & Stock - Prominent Display */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Price Card */}
                  <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Price</div>
                    <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
                      {product.price.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">KSh.</div>
                  </div>

                  {/* Stock Card */}
                  <div
                    className={`rounded-lg p-3 border ${
                      product.stock < 20
                        ? "bg-red-500/10 border-red-500/30"
                        : product.stock < 50
                        ? "bg-yellow-500/10 border-yellow-500/30"
                        : "bg-green-500/10 border-green-500/30"
                    }`}
                  >
                    <div className="text-xs text-gray-400 mb-1">Stock</div>
                    <div
                      className={`text-lg font-bold ${
                        product.stock < 20
                          ? "text-red-400"
                          : product.stock < 50
                          ? "text-yellow-400"
                          : "text-green-400"
                      }`}
                    >
                      {product.stock}
                    </div>
                    <div className="text-xs text-gray-500">
                      {product.stock < 20 ? "Low Stock" : "Units"}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      handleToggleStatus(product.id, product.active)
                    }
                    className={`px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
                      product.active
                        ? "bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 shadow-orange-500/20"
                        : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-green-500/20"
                    }`}
                  >
                    {product.active ? (
                      <>
                        <EyeOff size={16} />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye size={16} />
                        Show
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredProducts?.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-xl border border-gray-700">
            <Package size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm mt-2">
              {searchQuery || filterCategory || filterStatus
                ? "Try adjusting your search or filters"
                : "Add your first product to get started"}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredProducts?.length > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-700">
          <div className="text-xs sm:text-sm text-gray-400">
            Page {currentPage} of {totalPages} ({filteredProducts.length} total
            products)
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

      <EditProductModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setProductData({
            name: "",
            price: "",
            categoryId: categories[0]?.id || "",
            stock: "",
          });
          setEditingProduct(null);
        }}
        productData={productData}
        setProductData={setProductData}
        categories={categories}
        handleSaveProduct={handleSaveProduct}
        editingProduct={editingProduct}
      />
    </div>
  );
};

export default ProductManagement;
