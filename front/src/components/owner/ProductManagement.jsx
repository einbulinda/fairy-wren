import { useMemo, useState } from "react";
import {
  Plus,
  Edit2,
  Eye,
  EyeOff,
  ImageIcon,
  Search,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { useProducts } from "../../hooks/useProducts";
import { useCategories } from "../../hooks/useCategories";
import LoadingSpinner from "../shared/LoadingSpinner";
import EditProductModal from "./EditProductModal";
import toast from "react-hot-toast";

const ITEMS_PER_PAGE = 12;

const ProductManagement = () => {
  const {
    products,
    isLoading: productsLoading,
    uploadProductImage,
    deleteProductImage,
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [productData, setProductData] = useState({
    name: "",
    price: "",
    categoryId: "",
    stock: "",
    image: "📦",
    imageUrl: "",
    imagePath: "",
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

  // Helper to get category color
  const getCategoryColor = (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || "#666";
  };

  // Logic
  const handleAddProduct = () => {
    setEditingProduct(null);
    setProductData({
      name: "",
      price: "",
      categoryId: categories[0]?.id || "",
      stock: "",
      image: "📦",
      imageUrl: "",
      imagePath: "",
    });
    setImagePreview(null);
    setSelectedFile(null);
    setShowProductModal(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductData({
      name: product.name,
      price: product.price,
      categoryId: product.category_id,
      stock: product.stock,
      image: product.image || "📦",
      imageUrl: product.image_url || "",
      imagePath: product.image_path || "",
    });
    setImagePreview(product.image_url || null);
    setSelectedFile(null);
    setShowProductModal(true);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
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
      let imageUrl = productData.imageUrl;
      let imagePath = productData.imagePath;

      // Upload new image if selected
      if (selectedFile) {
        setUploadingImage(true);

        // Creating Form Data
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("productName", productData.name.trim());

        const { image_url, image_path } = await uploadProductImage(formData);

        imageUrl = image_url;
        imagePath = image_path;

        // Delete old image if updating
        if (editingProduct && editingProduct.image_path) {
          try {
            await deleteProductImage(editingProduct.image_path);
          } catch (error) {
            console.error("Failed to delete old image:", error);
          }
        }
      }

      const productPayload = {
        name: productData.name.trim(),
        price: parseFloat(productData.price),
        category_id: productData.categoryId,
        stock: parseInt(productData.stock),
        image: productData.image,
        image_url: imageUrl,
        image_path: imagePath,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: productPayload.name,
          price: productPayload.price,
          category_id: productPayload.categoryId,
          stock: productPayload.stock,
          image: productPayload.image,
          image_url: imageUrl,
          image_path: imagePath,
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
        image: "📦",
        imageUrl: "",
        imagePath: "",
      });
      setImagePreview(null);
      setSelectedFile(null);
      reloadProducts();
    } catch (error) {
      toast.error(
        editingProduct ? "Failed to update product" : "Failed to create product"
      );
      console.error(error);
    } finally {
      setUploadingImage(false);
    }
  };

  // Loading State
  if (productsLoading || categoriesLoading) {
    return <LoadingSpinner />;
  }
  return (
    <div className="space-y-4 pb-6">
      {/* Start: Header */}
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
          className="px-4 py-2.5 sm:py-2 bg-linear-to-r from-pink-500 to-purple-500 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 
          flex items-center justify-center sm:justify-start transition-all active:scale-95 text-sm sm:text-base"
        >
          <Plus size={18} className="mr-2" />
          Add Product
        </button>
      </div>
      {/* End: Header */}

      {/* Start: Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-linear-to-br from-blue-600 to-blue-700 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-blue-200">Total Products</div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {products.length}
          </div>
        </div>
        <div className="bg-linear-to-br from-green-600 to-green-700 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-green-200">
            Active Products
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {activeProductsCount}
          </div>
        </div>
        <div className="bg-linear-to-br from-purple-600 to-purple-700 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-purple-200">Stock Value</div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            Ksh.{" "}
            {
              totalStockValue.toLocaleString()
              // .toFixed(0)
              // .toString()
              // .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
          </div>
        </div>
        <div className="bg-linear-to-br from-red-600 to-red-700 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-red-200">Low Stock</div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {lowStockCount}
          </div>
        </div>
      </div>
      {/* End: Stats Cards */}

      {/* Start: Search and Filters */}
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
            className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-purple-500 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-pink-500 placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X
                size={20}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
            </button>
          )}
        </div>

        {/* Start: Filters */}
        <div className="bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-700">
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

        {/* Start: Products Grid */}
        <div className="grid grid-cols-1  sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {paginatedProducts?.map((product) => (
            <div
              key={product.id}
              className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-pink-500 transition-all"
            >
              {/* Product Image */}
              <div className="relative h-32 sm:h-40 bg-gray-900 flex items-center justify-center">
                {product.image_url ? (
                  <div className="w-full h-full flex items-center justify-center p-2">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-5xl sm:text-6xl">{product.image}</div>
                )}

                {/* Status Badge */}
                <div
                  className={`absolute top-2 right-2 px-2 py-0.5 sm:py-1 rounded text-xs font-semibold ${
                    product.active ? "bg-green-600" : "bg-red-600"
                  }`}
                >
                  {product.active ? "Active" : "Inactive"}
                </div>

                {/* Category Badge */}
                <div
                  className="absolute top-2 left-2 px-2 py-0.5 sm:py-1 rounded text-xs font-semibold text-white truncate max-2-[50%]"
                  style={{
                    backgroundColor: getCategoryColor(product.category_id),
                  }}
                >
                  {categories.find((c) => c.id === product.category_id)?.name}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-3 sm:p-4">
                <h3
                  className="font-bold text-base sm:text-lg mb-2 truncate"
                  title={product.name}
                >
                  {product.name}
                </h3>
                <div className="space-y-1 text-xs sm:text-sm mb-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Price:</span>
                    <span className="font-semibold text-pink-500">
                      KSh. {product.price.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Stock:</span>
                    <span
                      className={`font-semibold ${
                        product.stock < 20
                          ? "text-red-500"
                          : product.stock < 50
                          ? "text-yellow-500"
                          : "text-green-500"
                      }`}
                    >
                      {product.stock}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="px-2 sm:px-3 py-2 bg-blue-600 rounded hover:bg-blue-700 flex items-center justify-center text-xs sm:text-sm transition-all active:scale-95"
                  >
                    <Edit2 size={16} className="sm:mr-1" />
                    <span className="hidden sm:inline ml-1">Edit</span>
                  </button>
                  <button
                    onClick={() =>
                      handleToggleStatus(product.id, product.active)
                    }
                    className={`px-2 sm:px-3 py-2 rounded flex items-center justify-center text-xs sm:text-sm transition-all active:scale-95 ${
                      product.active
                        ? "bg-orange-600 hover:bg-orange-700"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {product.active ? (
                      <EyeOff size={14} className="sm:mr-1" />
                    ) : (
                      <Eye size={14} className="sm:mr-1" />
                    )}
                    <span className="hidden sm:inline ml-1">
                      {product.active ? "Hide" : "Show"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredProducts?.length === 0 && (
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-12 sm:py-16 text-gray-500">
              <ImageIcon
                size={48}
                className="sm:w-16 sm:h-16 mx-auto mb-4 opacity-50"
              />
              <p className="text-lg sm:text-xl font-medium">
                No products found
              </p>
              <p className="text-xs sm:text-sm mt-2">
                {searchQuery || filterCategory || filterStatus
                  ? "Try adjusting your filters"
                  : "Add your first product to get started"}
              </p>
            </div>
          )}
        </div>
        {/* End: Products Grid */}

        {/* Start Pagination */}
        {filteredProducts?.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-700">
            <div className="text-xs sm:text-sm text-gray-400">
              Page {currentPage} of {totalPages} ({filteredProducts.length}{" "}
              total products)
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
                          ? "bg-linear-to-r from-pink-500 to-purple-500 text-white font-bold"
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
        {/* End: Pagination */}

        <EditProductModal
          isOpen={showProductModal}
          onClose={() => {
            setShowProductModal(false);
            setProductData({
              name: "",
              price: "",
              categoryId: categories[0]?.id || "",
              stock: "",
              image: "📦",
              imageUrl: "",
              imagePath: "",
            });
            setImagePreview(null);
            setSelectedFile(null);
            setEditingProduct(null);
          }}
          productData={productData}
          setProductData={setProductData}
          categories={categories}
          imagePreview={imagePreview}
          handleImageSelect={handleImageSelect}
          handleSaveProduct={handleSaveProduct}
          uploadingImage={uploadingImage}
          editingProduct={editingProduct}
        />
      </div>
    </div>
  );
};

export default ProductManagement;
