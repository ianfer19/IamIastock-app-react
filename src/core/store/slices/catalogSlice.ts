import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PosService } from '@/infrastructure/services/posService';

interface CatalogState {
  products: any[];
  ingredients: any[];
  additions: any[];
  categories: any[];
  loading: boolean;
  lastFetched: number;
}

const initialState: CatalogState = {
  products: [],
  ingredients: [],
  additions: [],
  categories: [],
  loading: false,
  lastFetched: 0,
};

// Catalog data changes less frequently than POS status
const CACHE_TIMEOUT = 15 * 60 * 1000; 

/**
 * THUNK: Centralized Catalog Loader
 * --------------------------------
 * Fetches all product-related data in a single pass if stale.
 */
export const fetchCatalog = createAsyncThunk(
  'catalog/fetchAll',
  async (options: { force?: boolean } | undefined, { getState }) => {
    const { catalog } = getState() as { catalog: CatalogState };
    
    // Efficiency: Check if we already have valid data (unless forced)
    if (!options?.force && Date.now() - catalog.lastFetched < CACHE_TIMEOUT && catalog.products.length > 0) {
      return null; 
    }
    
    console.log('📦 [Catalog] Hidratando catálogo global...');
    const [products, ingredients, additions, categories] = await Promise.all([
      PosService.getProducts(),
      PosService.getIngredients(),
      PosService.getAdditions(),
      PosService.getCategories()
    ]);

    return { products, ingredients, additions, categories };
  }
);

export const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    /**
     * REAL-TIME: Inventory Sync from WebSocket
     */
    updateStockFromSocket: (state, action: PayloadAction<{ id: string; type: string; new_stock: number }>) => {
      const { id, type, new_stock } = action.payload;
      
      if (type === 'PROD') {
        const prod = state.products.find(p => p.id === id);
        if (prod) prod.stock = new_stock;
      } else if (type === 'INGR') {
        const ingr = state.ingredients.find(i => i.id === id);
        if (ingr) ingr.stock = new_stock;
      } else if (type === 'ADDN') {
        const addn = state.additions.find(a => a.id === id);
        if (addn) addn.stock = new_stock;
      }
    },
    /**
     * RESET: Clear cached products when switching store
     */
    clearCatalog: (state) => {
      state.products = [];
      state.ingredients = [];
      state.additions = [];
      state.categories = [];
      state.lastFetched = 0;
      state.loading = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCatalog.pending, (state) => { state.loading = true; })
      .addCase(fetchCatalog.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.products = action.payload.products;
          state.ingredients = action.payload.ingredients;
          state.additions = action.payload.additions;
          state.categories = action.payload.categories;
          state.lastFetched = Date.now();
        }
      });
  }
});

export const { updateStockFromSocket, clearCatalog } = catalogSlice.actions;
export default catalogSlice.reducer;
