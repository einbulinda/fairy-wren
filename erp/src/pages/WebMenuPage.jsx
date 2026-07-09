import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "react-qr-code";
import { Download, QrCode, ExternalLink } from "lucide-react";
import { fetchProducts } from "@/services/products.service";
import { fetchCategories } from "@/services/categories.service";

const MENU_URL = `${import.meta.env.VITE_WEB_URL ?? "http://localhost:5175"}/menu`;

const SIZE = 300;
const LOGO_RATIO = 0.22; // logo covers ~22% of QR width — safe with level H error correction

function downloadQR() {
  const svg = document.getElementById("menu-qr-svg");
  if (!svg) return;

  const svgData = new XMLSerializer().serializeToString(svg);
  // btoa requires Latin-1; encode URI components first to handle any unicode
  const b64 = btoa(unescape(encodeURIComponent(svgData)));

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");

  const qrImg = new Image();
  qrImg.onload = () => {
    // Draw QR code
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(qrImg, 0, 0, SIZE, SIZE);

    // Overlay logo in the centre
    const logo = new Image();
    logo.onload = () => {
      const logoSize = SIZE * LOGO_RATIO;
      const pad = 5;
      const x = (SIZE - logoSize) / 2;
      const y = (SIZE - logoSize) / 2;
      // White rounded background behind the logo
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2, 6);
      ctx.fill();
      ctx.drawImage(logo, x, y, logoSize, logoSize);
      trigger();
    };
    logo.onerror = trigger; // download plain QR if logo fails
    logo.src = "/fairy-logo-only.png";

    function trigger() {
      const a = document.createElement("a");
      a.download = "menu-qr.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    }
  };
  qrImg.src = `data:image/svg+xml;base64,${b64}`;
}

/* Four-corner bracket accent */
function CornerBrackets({ color = "border-warning/30" }) {
  const base = `absolute w-5 h-5 ${color}`;
  return (
    <>
      <span className={`${base} top-0 left-0 border-t border-l`} />
      <span className={`${base} top-0 right-0 border-t border-r`} />
      <span className={`${base} bottom-0 left-0 border-b border-l`} />
      <span className={`${base} bottom-0 right-0 border-b border-r`} />
    </>
  );
}

function MenuItem({ product }) {
  return (
    <div className="group flex items-baseline gap-2 py-2.5 border-b border-surface-700/50 last:border-0">
      <div className="min-w-0 shrink-0">
        <span className="text-white/85 text-[13px] tracking-wide font-medium group-hover:text-white transition-colors duration-200">
          {product.name}
        </span>
        {product.unit && (
          <span className="ml-2 text-[10px] text-primary-400/60 uppercase tracking-widest font-light">
            {product.unit}
          </span>
        )}
      </div>
      {/* Dotted leader */}
      <div className="flex-1 border-b border-dotted border-surface-600/40 mb-[3px]" />
      {/* Price */}
      <span className="shrink-0 text-[13px] font-semibold text-warning tracking-wide">
        {Number(product.price).toLocaleString()}
      </span>
    </div>
  );
}

function CategorySection({ cat, index }) {
  return (
    <div
      className="transition-all duration-500"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Category divider heading */}
      <div className="flex items-center gap-3 mb-1 mt-7 first:mt-0">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary-500/35 to-transparent" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.35em] text-primary-400/70 px-1">
          {cat.name}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary-500/35 to-transparent" />
      </div>

      {/* Two-column item grid */}
      <div className="grid md:grid-cols-2 gap-x-8">
        {cat.products.map((p) => (
          <MenuItem key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

export default function WebMenuPage() {
  const [activeCategory, setActiveCategory] = useState(null);

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
    if (!acc[key]) acc[key] = { id: key, name, products: [] };
    acc[key].products.push(p);
    return acc;
  }, {});

  const sortedGroups = Object.values(grouped).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const displayed =
    activeCategory === null
      ? sortedGroups
      : sortedGroups.filter((g) => g.id === activeCategory);

  const totalProducts = products.length;

  return (
    <div className="space-y-6">

      {/* ── QR Code panel ── */}
      <div className="relative bg-surface-800 border border-surface-700 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-6 overflow-hidden">
        <CornerBrackets color="border-primary-500/20" />

        {/* Faint logo in QR panel */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-end pr-6 opacity-[0.04]">
          <img src="/fairy-wren-logo-removebg.png" alt="" aria-hidden="true" className="h-full w-auto" draggable={false} />
        </div>

        <div className="relative z-10 bg-white p-3 rounded-lg shrink-0 inline-block">
          {/* level="H" gives 30% error correction — enough headroom for the logo overlay */}
          <QRCode id="menu-qr-svg" value={MENU_URL} size={130} level="H" />
          {/* Logo centred over the QR code */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded p-[3px]">
              <img
                src="/fairy-logo-only.png"
                alt="Fairy Wren"
                className="w-7 h-7 object-contain"
                draggable={false}
              />
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary-400" />
            <h3 className="font-semibold text-white text-sm tracking-wide">Menu QR Code</h3>
          </div>
          <p className="text-xs text-surface-400 leading-relaxed">
            Customers scan this code to view the live menu on their phone.
          </p>
          <p className="text-[11px] text-surface-500 font-mono break-all">{MENU_URL}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <button
              onClick={downloadQR}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 border border-surface-600 text-surface-200 rounded-lg text-xs font-medium transition-colors"
            >
              <Download className="w-3 h-3" />
              Download QR
            </button>
            <a
              href={MENU_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 border border-surface-600 text-surface-200 rounded-lg text-xs font-medium transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Preview Live
            </a>
          </div>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <span className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && sortedGroups.length === 0 && (
        <div className="text-center py-20 text-surface-500 text-sm tracking-wide">
          No active products found. Add products to populate the menu.
        </div>
      )}

      {/* ── Menu preview card ── */}
      {!loading && sortedGroups.length > 0 && (
        <div className="space-y-4">

          {/* Label */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.25em] text-surface-500 font-semibold">
              ◈ &nbsp;Customer View
            </p>
            {totalProducts > 0 && (
              <p className="text-[11px] text-surface-500">
                {totalProducts} items · {sortedGroups.length} {sortedGroups.length === 1 ? "category" : "categories"}
              </p>
            )}
          </div>

          {/* Category tabs */}
          {sortedGroups.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {[{ id: null, name: "All" }, ...sortedGroups].map((g) => (
                <button
                  key={g.id ?? "__all__"}
                  onClick={() => setActiveCategory(g.id)}
                  className={`px-4 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 border ${
                    activeCategory === g.id
                      ? "bg-primary-600 border-primary-600 text-white"
                      : "border-surface-600 text-surface-400 hover:border-primary-500/50 hover:text-surface-200 bg-transparent"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}

          {/* Menu card — matches web look */}
          <div className="relative bg-surface-800/50 backdrop-blur border border-surface-700/60 rounded-2xl px-6 sm:px-10 py-8 overflow-hidden">
            <CornerBrackets />

            {/* Logo watermark */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <img
                src="/fairy-logo-only.png"
                alt=""
                aria-hidden="true"
                className="h-52 w-auto opacity-[0.035] select-none"
                draggable={false}
              />
            </div>

            {/* Content */}
            <div className="relative z-10">
              {/* Ksh label */}
              <p className="text-right text-[10px] text-surface-600 uppercase tracking-[0.3em] mb-4">
                Prices in Ksh
              </p>

              {displayed.map((group, i) => (
                <CategorySection key={group.id} cat={group} index={i} />
              ))}
            </div>

            {/* Bottom signature */}
            <div className="relative z-10 mt-8 flex items-center justify-center gap-3 opacity-20">
              <div className="h-px w-10 bg-warning/80" />
              <span className="text-[9px] uppercase tracking-[0.4em] text-warning font-semibold">Fairy Wren</span>
              <div className="h-px w-10 bg-warning/80" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
