import { useState } from "react";
import { Plus, Edit2, Eye, EyeOff, ImageIcon } from "lucide-react";
import { useProducts } from "../../hooks/useProducts";
import { useCategories } from "../../hooks/useCategories";
import LoadingSpinner from "../shared/LoadingSpinner";
import EditProductModal from "./EditProductModal";
import toast from "react-hot-toast";

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

  const filteredProducts = products.filter((product) => {
    let categoryMatch =
      filterCategory === "all" ||
      filterCategory === "" ||
      product.category_id === parseInt(filterCategory);

    let statusMatch =
      filterStatus === "all" ||
      filterStatus === "" ||
      (filterStatus === "active" && product.active) ||
      (filterStatus === "inactive" && !product.active);

    return categoryMatch && statusMatch;
  });

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

        if (!response) toast.error("Product creation failed");
        toast.success("Product created successfully");
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
    <div className="space-y-4">
      {/* Start: Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-pink-500">
            Product Management
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage products, pricing, and inventory
          </p>
        </div>

        <button
          onClick={handleAddProduct}
          className="px-4 py-2 bg-linear-to-r from-pink-500 to-purple-500 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 flex items-center"
        >
          <Plus size={18} className="mr-2" />
          Add Product
        </button>
      </div>
      {/* End: Header */}
      {/* Start: Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-blue-600 to-blue-700 p-4 rounded-lg">
          <div className="text-sm text-blue-200">Total Products</div>
          <div className="text-3xl font-bold text-white">{products.length}</div>
        </div>
        <div className="bg-linear-to-br from-green-600 to-green-700 p-4 rounded-lg">
          <div className="text-sm text-green-200">Active Products</div>
          <div className="text-3xl font-bold text-white">
            {activeProductsCount}
          </div>
        </div>
        <div className="bg-linear-to-br from-purple-600 to-purple-700 p-4 rounded-lg">
          <div className="text-sm text-purple-200">Stock Value</div>
          <div className="text-3xl font-bold text-white">
            Ksh.{" "}
            {totalStockValue
              .toFixed(0)
              .toString()
              .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          </div>
        </div>
        <div className="bg-linear-to-br from-red-600 to-red-700 p-4 rounded-lg">
          <div className="text-sm text-red-200">Low Stock</div>
          <div className="text-3xl font-bold text-white">{lowStockCount}</div>
        </div>
      </div>
      {/* End: Stats Cards */}
      {/* Start: Filters */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-purple-500 rounded-lg text-white focus:outline-none focus:border-pink-500"
            >
              {" "}
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-purple-500 rounded-lg text-white focus:outline-none focus:border-pink-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>
      {/* End: Filters */}
      {/* Start: Products Grid */}
      <div className="grid grid-cols-4 gap-4">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
          >
            {/* Product Image */}
            <div className="relative h-40 bg-gray-900 flex items-center justify-center">
              {product.image_url ? (
                <div className="w-full h-32 flex items-center justify-center mb-2 bg-gray-900 rounded">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="text-6xl">{product.image}</div>
              )}

              {/* Status Badge */}
              <div
                className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold ${
                  product.active ? "bg-green-600" : "bg-red-600"
                }`}
              >
                {product.active ? "Active" : "Inactive"}
              </div>

              {/* Category Badge */}
              <div
                className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold text-white"
                style={{
                  backgroundColor: getCategoryColor(product.category_id),
                }}
              >
                {categories.find((c) => c.id === product.category_id)?.name}
              </div>
            </div>

            {/* Product Info */}
            <div className="p-4">
              <h3 className="font-bold text-lg mb-2">{product.name}</h3>
              <div className="space-y-1 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Price:</span>
                  <span className="font-semibold text-pink-500">
                    {product.price} KES
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
                  className="px-3 py-2 bg-blue-600 rounded hover:bg-blue-700 flex items-center justify-center text-sm"
                >
                  <Edit2 size={16} className="mr-2" /> Edit
                </button>
                <button
                  onClick={() => handleToggleStatus(product.id, product.active)}
                  className={`px-3 py-2 rounded flex items-center justify-center text-sm ${
                    product.active
                      ? "bg-orange-600 hover:bg-orange-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {product.active ? (
                    <EyeOff size={14} className="mr-1" />
                  ) : (
                    <Eye size={14} className="mr-1" />
                  )}
                  {product.active ? "Deactivate" : "Activate"}
                </button>
              </div>
              {/* <button
                onClick={() => setShowDeleteConfirm(product.id)}
                className="w-full mt-2 px-3 py-2 bg-red-600 rounded hover:bg-red-700 flex items-center justify-center text-sm"
              >
                <Trash2 size={14} className="mr-1" />
                Delete
              </button> */}
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="col-span-4 text-center py-12 text-gray-500">
            <ImageIcon size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-xl">No products found</p>
            <p className="text-sm mt-2">
              Add your first product to get started
            </p>
          </div>
        )}
      </div>
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
  );
};

export default ProductManagement;
