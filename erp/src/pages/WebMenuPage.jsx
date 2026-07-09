import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "react-qr-code";
import toast from "react-hot-toast";
import { Upload, Trash2, Download, QrCode, ImageOff } from "lucide-react";
import { fetchProducts } from "@/services/products.service";
import { fetchCategories } from "@/services/categories.service";
import { uploadProductImage, removeProductImage } from "@/services/products.service";

const MENU_URL = `${import.meta.env.VITE_WEB_URL ?? "http://localhost:5175"}/menu`;

function downloadQR() {
  const svg = document.getElementById("menu-qr-svg");
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = () => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 256, 256);
    ctx.drawImage(img, 0, 0, 256, 256);
    const a = document.createElement("a");
    a.download = "menu-qr.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  };
  img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
}

function ProductCard({ product, categoryName, onUpdated }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      await uploadProductImage(product.id, file);
      toast.success(`Image updated for ${product.name}`);
      onUpdated();
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await removeProductImage(product.id);
      toast.success("Image removed");
      onUpdated();
    } catch {
      toast.error("Failed to remove image");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden flex flex-col">
      {/* Image area */}
      <div className="relative h-36 bg-surface-900 flex items-center justify-center group">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageOff className="w-8 h-8 text-surface-600" />
        )}
        {/* Overlay actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-3 h-3" />
            )}
            {product.image_url ? "Replace" : "Upload"}
          </button>
          {product.image_url && (
            <button
              onClick={handleRemove}
              disabled={removing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {removing ? (
                <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-0.5 flex-1">
        <p className="text-sm font-medium text-white leading-snug">{product.name}</p>
        {product.unit && (
          <p className="text-xs text-surface-500 capitalize">{product.unit}</p>
        )}
        <p className="mt-auto pt-1 text-sm font-semibold text-primary-400">
          Ksh {Number(product.price).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default function WebMenuPage() {
  const qc = useQueryClient();

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts({ active: true }),
  });

  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const loading = loadingProducts || loadingCats;

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const grouped = products.reduce((acc, p) => {
    const key = p.category_id || "__none__";
    const name = catMap[key] || "Uncategorized";
    if (!acc[key]) acc[key] = { name, products: [] };
    acc[key].products.push(p);
    return acc;
  }, {});

  const sortedGroups = Object.values(grouped).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  function onUpdated() {
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <div className="space-y-6">
      {/* QR Code panel */}
      <div className="bg-surface-800 border border-surface-700 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-6">
        <div className="bg-white p-3 rounded-xl">
          <QRCode id="menu-qr-svg" value={MENU_URL} size={140} />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary-400" />
            <h3 className="font-semibold text-white text-sm">Menu QR Code</h3>
          </div>
          <p className="text-xs text-surface-400">
            Customers can scan this code to view the live menu on their phone.
          </p>
          <p className="text-xs text-surface-500 font-mono break-all">{MENU_URL}</p>
          <button
            onClick={downloadQR}
            className="mt-1 self-start flex items-center gap-2 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 border border-surface-600 text-surface-200 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-3 h-3" />
            Download QR
          </button>
        </div>
      </div>

      {/* Product grid by category */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <span className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && sortedGroups.length === 0 && (
        <div className="text-center py-16 text-surface-500">
          No active products found.
        </div>
      )}

      {!loading && sortedGroups.map((group) => (
        <section key={group.name}>
          <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-3 pb-2 border-b border-surface-700">
            {group.name}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {group.products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                categoryName={group.name}
                onUpdated={onUpdated}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
