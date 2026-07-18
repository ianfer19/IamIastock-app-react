import apiClient from '../../core/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Env } from '../../core/config/env';
import { SecureStorage } from '../../core/storage/secureStorage';
import { Product, Ingredient, Addition, ProductCategory } from '../../domain/entities/Product';

const CACHE_KEYS = {
  PRODUCTS: 'pos_cache_products',
  CATEGORIES: 'pos_cache_categories',
  INGREDIENTS: 'pos_cache_ingredients',
  ADDITIONS: 'pos_cache_additions',
};

// Helper to handle AWS Lambda response formats (Items or stringified body)
const parseLambdaResponse = (response: any) => {
  if (!response) return [];
  
  // Case 1: Direct array
  if (Array.isArray(response)) return response;
  
  // Case 2: Response contains Items (DynamoDB format)
  if (response.Items && Array.isArray(response.Items)) return response.Items;
  
  // Case 3: Response contains a stringified body (Lambda Proxy format)
  if (typeof response.body === 'string') {
    try {
      const parsedBody = JSON.parse(response.body);
      return parsedBody.Items || parsedBody || [];
    } catch (e) {
      console.error('Error parsing Lambda stringified body', e);
      return [];
    }
  }
  
  return response.data || [];
};

export const PosService = {
  async getProducts(): Promise<Product[]> {
    try {
      const response = await apiClient.get(`${Env.API_URL}/products`);
      const items = parseLambdaResponse(response.data);
      return items.filter((i: any) => i.estado !== 'ELIMINADO');
    } catch (e) {
      console.error('Error fetching products', e);
      throw e;
    }
  },

  async getIngredients(): Promise<Ingredient[]> {
    try {
      const response = await apiClient.get(`${Env.API_URL}/ingredients`);
      const items = parseLambdaResponse(response.data);
      return items.filter((i: any) => i.estado !== 'ELIMINADO');
    } catch (e) {
      console.error('Error fetching ingredients', e);
      throw e;
    }
  },

  async getAdditions(): Promise<Addition[]> {
    try {
      const response = await apiClient.get(`${Env.API_URL}/additions`);
      const items = parseLambdaResponse(response.data);
      return items.filter((i: any) => i.estado !== 'ELIMINADO');
    } catch (e) {
      console.error('Error fetching additions', e);
      throw e;
    }
  },

  async getCategories(): Promise<ProductCategory[]> {
    try {
      const response = await apiClient.get(`${Env.ADMIN_URL}/product-categories`);
      const items = parseLambdaResponse(response.data);
      return items.filter((i: any) => i.estado !== 'ELIMINADO');
    } catch (e) {
      console.error('Error fetching categories', e);
      throw e;
    }
  },

  /**
   * Hydrates products by mapping ingredient and addition IDs to their full objects.
   */
  hydrateProducts(
    products: Product[],
    ingredients: Ingredient[],
    additions: Addition[]
  ): Product[] {
    const ingredientsMap = new Map(ingredients.map(i => [i.id, i]));
    const additionsMap = new Map(additions.map(a => [a.id, a]));

    return products.map(product => ({
      ...product,
      ingredientes: (product.ingredientes_ids || [])
        .map(id => ingredientsMap.get(id))
        .filter((i): i is Ingredient => !!i),
      adiciones: (product.adiciones_ids || [])
        .map(id => additionsMap.get(id))
        .filter((a): a is Addition => !!a),
    }));
  },

  async getTables(): Promise<any[]> {
    try {
      const response = await apiClient.get(`${Env.ADMIN_URL}/tables`);
      const items = parseLambdaResponse(response.data);
      return items
        .filter((i: any) => i.estado !== 'ELIMINADO')
        .map((i: any) => ({
          ...i,
          id: i.id ? String(i.id).replace('MESA#', '') : (i.PK ? String(i.PK).replace('MESA#', '') : i.id),
          zone_id: i.zone_id ? String(i.zone_id).replace('ZONE#', '') : i.zone_id,
          zona_id: i.zona_id ? String(i.zona_id).replace('ZONE#', '') : i.zona_id,
        }));
    } catch (e) {
      console.error('Error fetching tables', e);
      throw e;
    }
  },

  async getTablesStatus(tenantId: string): Promise<Record<string, any>> {
    try {
      const response = await apiClient.get(`${Env.API_URL}/store/${tenantId}/tables/status`);
      let data = response.data;
      
      if (data && data.body && typeof data.body === 'string') {
        data = JSON.parse(data.body);
      }
      
      // The backend might return { detailedStatuses: { ... } } or just the map
      return data?.detailedStatuses || data || {};
    } catch (e) {
      console.error('Error fetching tables status', e);
      return {};
    }
  },

  async getFloors(): Promise<any[]> {
    try {
      const response = await apiClient.get(`${Env.ADMIN_URL}/floors`);
      const items = parseLambdaResponse(response.data);
      return items
        .filter((i: any) => i.estado !== 'ELIMINADO')
        .map((i: any) => ({
          ...i,
          id: i.id ? String(i.id).replace('FLOOR#', '') : (i.PK ? String(i.PK).replace('FLOOR#', '') : i.id)
        }));
    } catch (e) {
      console.error('Error fetching floors', e);
      return [];
    }
  },

  async getZones(): Promise<any[]> {
    try {
      const response = await apiClient.get(`${Env.ADMIN_URL}/zones`);
      const items = parseLambdaResponse(response.data);
      return items
        .filter((i: any) => i.estado !== 'ELIMINADO')
        .map((i: any) => ({
          ...i,
          id: i.id ? String(i.id).replace('ZONE#', '') : (i.PK ? String(i.PK).replace('ZONE#', '') : i.id),
          floor_id: i.floor_id ? String(i.floor_id).replace('FLOOR#', '') : i.floor_id
        }));
    } catch (e) {
      console.error('Error fetching zones', e);
      return [];
    }
  },

  async getPaymentMethods(): Promise<any[]> {
    try {
      const response = await apiClient.get(`${Env.ADMIN_URL}/payment-methods`);
      const items = parseLambdaResponse(response.data);
      return items.filter((i: any) => i.estado !== 'ELIMINADO');
    } catch (e) {
      console.error('Error fetching payment methods', e);
      return [];
    }
  },

  // Cache Operations
  async saveToCache(key: string, data: any) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving to cache', e);
    }
  },

  async getFromCache(key: string) {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error getting from cache', e);
      return null;
    }
  }
};
