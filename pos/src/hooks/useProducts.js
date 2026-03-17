import { useEffect, useState, useCallback } from "react";
import { ProductsService } from "@/services/products.service";
import { useAppStore } from "@/store/app.store";

/**
 * Hook to fetch and cache products
 * Uses Zustand store for caching unfiltered product catalog
 * @param {Object} params - Filter parameters
 * @returns {Object} { products, loading, refetch }
 */
export const useProducts = (params = {}) => {
  const hasFilters = Object.keys(params).length > 0;

  const cachedProducts = useAppStore((s) => s.productCatalog);
  const catalogLoaded = useAppStore((s) => s.productCatalogLoaded);
  const setProductCatalog = useAppStore((s) => s.setProductCatalog);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    ProductsService.list(params)
      .then(({ data }) => {
        setProducts(data);
        if (!hasFilters) {
          setProductCatalog(data);
        }
      })
      .finally(() => setLoading(false));
  }, [JSON.stringify(params)]);

  useEffect(() => {
    // Case 1: No filters + cache exists - use cached data
    if (!hasFilters && catalogLoaded) {
      setProducts(cachedProducts);
      setLoading(false);
      return;
    }

    // Case 2: Fetch from server
    fetchProducts();
  }, [JSON.stringify(params)]);

  return { products, loading, refetch: fetchProducts };
};
