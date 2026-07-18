import { useState, useEffect, useCallback } from 'react';
import { PosService } from '../../../infrastructure/services/posService';
import { Product, ProductCategory, Ingredient, Addition } from '../../../domain/entities/Product';

export const usePosData = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Fetch data concurrently
      const [rawProducts, rawCategories, ingredients, additions] = await Promise.all([
        PosService.getProducts(),
        PosService.getCategories(),
        PosService.getIngredients(),
        PosService.getAdditions()
      ]);

      // 2. Hydrate
      const hydratedProducts = PosService.hydrateProducts(
        rawProducts,
        ingredients,
        additions
      );

      setProducts(hydratedProducts);
      setCategories(rawCategories);
      
      // Cache
      PosService.saveToCache('pos_cache_products', hydratedProducts);
      PosService.saveToCache('pos_cache_categories', rawCategories);

    } catch (e: any) {
      console.error('Error in usePosData', e);
      setError(e.message || 'Error al cargar los datos del POS');
      
      const cachedProducts = await PosService.getFromCache('pos_cache_products');
      const cachedCategories = await PosService.getFromCache('pos_cache_categories');
      
      if (cachedProducts) setProducts(cachedProducts);
      if (cachedCategories) setCategories(cachedCategories);
      
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    products,
    categories,
    isLoading,
    error,
    refresh: () => loadData(true)
  };
};
