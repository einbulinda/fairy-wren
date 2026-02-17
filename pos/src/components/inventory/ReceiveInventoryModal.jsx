import { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Search,
  Building2,
  Package,
  Calendar,
  FileText,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";
import AddSupplierModal from "../suppliers/AddSupplierModal";

const ReceiveInventoryModal = ({
  onClose,
  onSuccess,
  products,
  suppliers,
  onAddSupplier,
  onReceiveInventory,
  onReloadSuppliers,
}) => {
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: "",
    invoice_number: "",
    purchase_date: new Date().toISOString().split("T")[0],
  });

  const [lineItems, setLineItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter products for search
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !lineItems.find((item) => item.product_id === p.id)
  );

  // Calculate totals
  const totals = lineItems.reduce(
    (acc, item) => {
      const itemTotal = (item.cost_price || 0) * (item.quantity || 0);
      return {
        totalItems: acc.totalItems + (item.quantity || 0),
        totalCost: acc.totalCost + itemTotal,
      };
    },
    { totalItems: 0, totalCost: 0 }
  );

  // Add product to line items
  const handleAddProduct = (product) => {
    setLineItems([
      ...lineItems,
      {
        product_id: product.id,
        product_name: product.name,
        cost_price: product.cost_price || 0,
        quantity: 1,
      },
    ]);
    setSearchTerm("");
    setShowProductSearch(false);
  };

  // Update line item
  const handleUpdateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      [field]:
        field === "quantity" ? parseInt(value) || 0 : parseFloat(value) || 0,
    };
    setLineItems(updated);
  };

  // Remove line item
  const handleRemoveLineItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.supplier_id) {
      toast.error("Please select a supplier");
      return;
    }

    if (!formData.invoice_number.trim()) {
      toast.error("Please enter an invoice number");
      return;
    }

    if (lineItems.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    // Validate line items
    const invalidItems = lineItems.filter(
      (item) => !item.quantity || item.quantity <= 0 || !item.cost_price
    );

    if (invalidItems.length > 0) {
      toast.error("Please ensure all items have valid quantities and costs");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        line_items: lineItems,
        total_amount: totals.totalCost,
      };

      await onReceiveInventory(payload);

      toast.success("Inventory received successfully!");
      onSuccess();
    } catch (error) {
      console.error("Error receiving inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle supplier added
  const handleSupplierAdded = async (newSupplier) => {
    await onReloadSuppliers();
    setFormData({ ...formData, supplier_id: newSupplier.id });
    setShowAddSupplier(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-gray-900 rounded-2xl border-2 border-purple-500/30 w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-purple-500/20 bg-gray-900/60 backdrop-blur-md">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-lg bg-purple-500/20 border border-purple-500/30">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Receive Inventory
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-0.5 hidden sm:block">
                  Record incoming stock from supplier
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-800/60 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Content */}
          <form
            onSubmit={handleSubmit}
            className="overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-180px)]"
          >
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Purchase Details Section */}
              <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-purple-500/10">
                <h3 className="text-base sm:text-lg font-semibold text-purple-300 mb-3 sm:mb-4 flex items-center gap-2">
                  <FileText size={16} className="sm:w-[18px] sm:h-[18px]" />
                  Purchase Details
                </h3>

                <div className="space-y-4">
                  {/* Supplier Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Supplier *
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Building2
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400"
                          size={18}
                        />
                        <select
                          value={formData.supplier_id}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              supplier_id: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-900/60 border-2 border-purple-500/30 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm sm:text-base"
                          required
                        >
                          <option value="">Select Supplier</option>
                          {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddSupplier(true)}
                        className="px-3 sm:px-4 py-2.5 bg-purple-600/20 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 text-purple-300 font-medium transition-all flex items-center gap-2"
                      >
                        <Plus size={18} />
                        <span className="hidden sm:inline">New</span>
                      </button>
                    </div>
                  </div>

                  {/* Invoice Number and Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Invoice Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Invoice Number *
                      </label>
                      <div className="relative">
                        <FileText
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400"
                          size={18}
                        />
                        <input
                          type="text"
                          value={formData.invoice_number}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              invoice_number: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-900/60 border-2 border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm sm:text-base"
                          placeholder="INV-2024-001"
                          required
                        />
                      </div>
                    </div>

                    {/* Purchase Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Purchase Date *
                      </label>
                      <div className="relative">
                        <Calendar
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400"
                          size={18}
                        />
                        <input
                          type="date"
                          value={formData.purchase_date}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              purchase_date: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-900/60 border-2 border-purple-500/30 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm sm:text-base"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items Section */}
              <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-purple-500/10">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-purple-300 flex items-center gap-2">
                    <Package size={16} className="sm:w-[18px] sm:h-[18px]" />
                    Products ({lineItems.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowProductSearch(!showProductSearch)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all"
                  >
                    <Plus size={14} className="sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Add</span>
                  </button>
                </div>

                {/* Product Search */}
                {showProductSearch && (
                  <div className="mb-4 relative">
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400"
                        size={18}
                      />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search products..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-900/60 border-2 border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm sm:text-base"
                        autoFocus
                      />
                    </div>

                    {/* Search Results */}
                    {searchTerm && (
                      <div className="absolute z-10 w-full mt-2 max-h-60 overflow-y-auto bg-gray-900 border-2 border-purple-500/30 rounded-lg shadow-xl">
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => handleAddProduct(product)}
                              className="w-full px-4 py-3 text-left hover:bg-gray-800/60 transition-colors border-b border-purple-500/10 last:border-b-0"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-white text-sm truncate">
                                    {product.name}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    Stock: {product.current_stock}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs sm:text-sm font-mono text-purple-400">
                                    KSh{" "}
                                    {product.cost_price?.toFixed(2) || "0.00"}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-gray-400">
                            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No products found</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Line Items Table - Desktop */}
                {lineItems.length > 0 ? (
                  <>
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-900/60 border-b border-purple-500/20">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-purple-400 uppercase">
                              Product
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-purple-400 uppercase">
                              Quantity
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-purple-400 uppercase">
                              Cost Price
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-purple-400 uppercase">
                              Total
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-purple-400 uppercase">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-500/10">
                          {lineItems.map((item, index) => (
                            <tr
                              key={index}
                              className="hover:bg-gray-800/40 transition-colors"
                            >
                              <td className="px-4 py-3">
                                <span className="font-medium text-white text-sm">
                                  {item.product_name}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      handleUpdateLineItem(
                                        index,
                                        "quantity",
                                        e.target.value
                                      )
                                    }
                                    className="w-20 px-2 py-1.5 rounded-lg bg-gray-900/60 border border-purple-500/30 text-white text-right text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.cost_price}
                                    onChange={(e) =>
                                      handleUpdateLineItem(
                                        index,
                                        "cost_price",
                                        e.target.value
                                      )
                                    }
                                    className="w-24 px-2 py-1.5 rounded-lg bg-gray-900/60 border border-purple-500/30 text-white text-right font-mono text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="font-mono font-semibold text-pink-400 text-sm">
                                  KSh{" "}
                                  {(item.quantity * item.cost_price).toFixed(2)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLineItem(index)}
                                    className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Line Items - Mobile Cards */}
                    <div className="sm:hidden space-y-3">
                      {lineItems.map((item, index) => (
                        <div
                          key={index}
                          className="bg-gray-900/40 rounded-lg p-3 border border-purple-500/10"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <span className="font-medium text-white text-sm flex-1">
                              {item.product_name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(index)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all ml-2"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">
                                Quantity
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateLineItem(
                                    index,
                                    "quantity",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1.5 rounded-lg bg-gray-900/60 border border-purple-500/30 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">
                                Cost Price
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.cost_price}
                                onChange={(e) =>
                                  handleUpdateLineItem(
                                    index,
                                    "cost_price",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1.5 rounded-lg bg-gray-900/60 border border-purple-500/30 text-white font-mono text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                              />
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-purple-500/10 flex items-center justify-between">
                            <span className="text-xs text-gray-400">Total</span>
                            <span className="font-mono font-semibold text-pink-400 text-sm">
                              KSh {(item.quantity * item.cost_price).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="py-8 sm:py-12 text-center">
                    <Package className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-3 text-gray-600" />
                    <p className="text-gray-400 mb-1 text-sm sm:text-base">
                      No products added yet
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Click "Add" to start adding items
                    </p>
                  </div>
                )}

                {/* Totals Summary */}
                {lineItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-purple-500/20">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between">
                      <div className="flex items-center justify-between sm:justify-start gap-2 px-3 sm:px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Package className="text-purple-400" size={16} />
                          <span className="text-xs sm:text-sm text-gray-400">
                            Total Items:
                          </span>
                        </div>
                        <span className="font-bold text-white text-sm sm:text-base">
                          {totals.totalItems}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-start gap-2 px-3 sm:px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-lg">
                        <span className="text-xs sm:text-sm text-gray-400">
                          Total Cost:
                        </span>
                        <span className="font-mono font-bold text-lg sm:text-xl text-pink-400">
                          KSh {totals.totalCost.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-purple-500/20 bg-gray-900/60 backdrop-blur-md">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 rounded-lg bg-gray-800/60 hover:bg-gray-800 text-gray-300 hover:text-white font-medium transition-all text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || lineItems.length === 0}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold text-white shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Save size={16} className="sm:w-[18px] sm:h-[18px]" />
                {loading ? "Receiving..." : "Receive Inventory"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Add Supplier Modal */}
      {showAddSupplier && (
        <AddSupplierModal
          onClose={() => setShowAddSupplier(false)}
          onSuccess={handleSupplierAdded}
          onAddSupplier={onAddSupplier}
        />
      )}
    </>
  );
};

export default ReceiveInventoryModal;
