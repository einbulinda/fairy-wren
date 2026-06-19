import { useSearchParams } from "react-router";
import { FolderTree, Package } from "lucide-react";
import ProductsTab from "@/components/products/ProductsTab";
import CategoriesTab from "@/components/products/CategoriesTab";

const TABS = [
  { id: "products", label: "Products", icon: Package },
  { id: "categories", label: "Categories", icon: FolderTree },
];

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "products";

  return (
    <div className="space-y-4">
      {/* Tab bar — desktop only; mobile uses contextual bottom nav */}
      <div className="hidden md:flex gap-1 border-b border-surface-700">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSearchParams({ tab: id })}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative ${
              activeTab === id
                ? "text-primary-400"
                : "text-surface-400 hover:text-surface-200"
            }`}
          >
            <Icon size={15} />
            {label}
            {activeTab === id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
        ))}
      </div>

      {activeTab === "products" && <ProductsTab />}
      {activeTab === "categories" && <CategoriesTab />}
    </div>
  );
};

export default ProductsPage;
