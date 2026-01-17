import { useState } from "react";
import { X, Building2, Mail, Phone, MapPin, User, Save } from "lucide-react";
import toast from "react-hot-toast";

const AddSupplierModal = ({ onClose, onSuccess, onAddSupplier }) => {
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }

    setLoading(true);

    try {
      const { data } = await onAddSupplier(formData);
      if (data.success) toast.success("Supplier created successfully");

      onSuccess(data.supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      toast.error("Failed to create supplier");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-60 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border-2 border-purple-500/30 w-full max-w-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20 bg-gray-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/20 border border-purple-500/30">
              <Building2 className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Add New Supplier</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Create a new supplier record
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800/60 text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Supplier Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Supplier Name *
            </label>
            <div className="relative">
              <Building2
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400"
                size={18}
              />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-900/60 border-2 border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                placeholder="ABC Distributors Ltd"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Contact Person */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contact Person
            </label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400"
                size={18}
              />
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => handleChange("contact_person", e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-900/60 border-2 border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                placeholder="John Doe"
              />
            </div>
          </div>

          {/* Email and Phone in Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400"
                  size={18}
                />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-900/60 border-2 border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  placeholder="supplier@example.com"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400"
                  size={18}
                />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-900/60 border-2 border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  placeholder="+254 700 000 000"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Address
            </label>
            <div className="relative">
              <MapPin
                className="absolute left-3 top-3 text-purple-400"
                size={18}
              />
              <textarea
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                rows={3}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-900/60 border-2 border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                placeholder="Shooters - Eastern Bypass, Nairobi"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg bg-gray-800/60 hover:bg-gray-800 text-gray-300 hover:text-white font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold text-white shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2"
            >
              <Save size={18} />
              {loading ? "Creating..." : "Create Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSupplierModal;
