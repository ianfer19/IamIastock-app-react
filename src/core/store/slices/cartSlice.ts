import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Product, Ingredient, Addition } from '@/domain/entities/Product';
import { OrderService } from '@/infrastructure/services/orderService';
import { AuthService } from '@/infrastructure/services/authService';

/**
 * ARCHITECTURE: Senior Lead Global Cart & Orders
 * ---------------------------------------------
 * Decouples the active shopping cart from parked/table orders.
 */

export type OrderType = 'MESA' | 'DOMICILIO' | 'RECOGER' | 'MOSTRADOR';

export interface CartItem {
  cartId: string;
  product: Product;
  quantity: number;
  selectedIngredients: Ingredient[];
  selectedAdditions: Addition[];
  notes?: string;
  price_override?: number;
  discount?: {
    type: 'FIXED' | 'PERCENTAGE';
    value: number;
  };
  para_llevar?: boolean;
}

export interface PendingOrder {
  id: string;
  items: CartItem[];
  total: number;
  timestamp: number;
  customerName?: string;
  mesa_id?: string | null;
  status?: string;
  order_type?: string;
}

interface CartState {
  cart: CartItem[];
  orderType: OrderType;
  locationId: string | null;
  activeOrderId: string | null;
  total: number;
  discount: {
    type: 'FIXED' | 'PERCENTAGE';
    value: number;
  } | null;
  pendingOrders: PendingOrder[];
  tableOrders: PendingOrder[];
  loading: {
    orders: boolean;
  };
}

const initialState: CartState = {
  cart: [],
  orderType: 'MESA',
  locationId: null,
  activeOrderId: null,
  total: 0,
  discount: null,
  pendingOrders: [],
  tableOrders: [],
  loading: {
    orders: false,
  },
};

/**
 * THUNKS: Hydrate Orders from Backend
 */
export const fetchTableOrders = createAsyncThunk(
  'cart/fetchTableOrders',
  async (_, { rejectWithValue }) => {
    try {
      return await OrderService.listOrders('MESA');
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchPendingOrders = createAsyncThunk(
  'cart/fetchPendingOrders',
  async (_, { rejectWithValue }) => {
    try {
      return await OrderService.listOrders('MOSTRADOR');
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const parkOrder = createAsyncThunk(
  'cart/parkOrder',
  async (deliveryInfo: any, { getState, dispatch, rejectWithValue }) => {
    const state = (getState() as any).cart;
    if (state.cart.length === 0) return;

    try {
      const userProfile = await AuthService.getCurrentUser();
      const store_id = userProfile?.tenant_id || (userProfile as any)?.user?.tenant_id || (userProfile as any)?.commerce?.id || '';
      
      const payload = {
        store_id,
        order_id: state.activeOrderId || undefined,
        mesa_id: state.locationId || undefined,
        order_type: state.orderType,
        delivery_info: deliveryInfo,
        items: state.cart.map((item: any) => ({
          product_id: item.product.id,
          nombre: item.product.nombre,
          precio: item.product.precio,
          cantidad: item.quantity,
          ingredientes: item.selectedIngredients.map((i: any) => ({ id: i.id, nombre: i.nombre, cantidad: 1 })),
          adiciones: item.selectedAdditions.map((a: any) => ({ id: a.id, nombre: a.nombre, precio: a.precio, cantidad: 1 })),
          notas: item.notes
        }))
      };

      await OrderService.appendOrder(payload as any);
      dispatch(cartSlice.actions.clearCart());
      dispatch(fetchTableOrders());
      dispatch(fetchPendingOrders());
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const finalizeOrder = createAsyncThunk(
  'cart/finalizeOrder',
  async (paymentPayload: any, { getState, dispatch, rejectWithValue }) => {
    const state = (getState() as any).cart;
    
    try {
      const userProfile = await AuthService.getCurrentUser();
      const store_id = userProfile?.tenant_id || (userProfile as any)?.user?.tenant_id || (userProfile as any)?.commerce?.id || '';
      
      let orderId = state.activeOrderId;
      
      // If there is an active order AND items in the cart, append them first before closing
      if (orderId && state.cart.length > 0) {
        const appendPayload = {
          store_id,
          order_id: orderId,
          order_type: state.orderType,
          mesa_id: state.locationId || undefined,
          items: state.cart.map((item: any) => ({
            product_id: item.product.id,
            nombre: item.product.nombre,
            precio: item.product.precio,
            cantidad: item.quantity,
            ingredientes: item.selectedIngredients.map((i: any) => ({ id: i.id, nombre: i.nombre, cantidad: 1 })),
            adiciones: item.selectedAdditions.map((a: any) => ({ id: a.id, nombre: a.nombre, precio: a.precio, cantidad: 1 })),
            notas: item.notes
          }))
        };
        await OrderService.appendOrder(appendPayload as any);
      } else if (!orderId) {
        // If no active order, create one first before closing (Mostrador/Direct flow)
        const appendPayload = {
          store_id,
          order_type: state.orderType,
          mesa_id: state.locationId || undefined,
          items: state.cart.map((item: any) => ({
            product_id: item.product.id,
            nombre: item.product.nombre,
            precio: item.product.precio,
            cantidad: item.quantity,
            ingredientes: item.selectedIngredients.map((i: any) => ({ id: i.id, nombre: i.nombre, cantidad: 1 })),
            adiciones: item.selectedAdditions.map((a: any) => ({ id: a.id, nombre: a.nombre, precio: a.precio, cantidad: 1 })),
          }))
        };
        orderId = await OrderService.appendOrder(appendPayload as any);
      }

      await OrderService.closeOrder(orderId, {
        ...paymentPayload,
        store_id 
      });
      
      dispatch(cartSlice.actions.clearCart());
      dispatch(fetchTableOrders());
      dispatch(fetchPendingOrders());
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    /**
     * CART: Core Mutations
     */
    addToCart: (state, action: PayloadAction<Product>) => {
      const product = action.payload;
      const cartId = `${product.id}-${Date.now()}`;
      state.cart.push({
        cartId,
        product,
        quantity: 1,
        selectedIngredients: product.ingredientes ? product.ingredientes.map(i => ({ ...i, cantidad: 1 })) : [],
        selectedAdditions: product.adiciones ? product.adiciones.map(a => ({ ...a, cantidad: 0 })) : [],
      });
      cartSlice.caseReducers.calculateTotals(state);
    },

    updateQuantity: (state, action: PayloadAction<{ cartId: string; delta: number }>) => {
      const { cartId, delta } = action.payload;
      const item = state.cart.find(i => i.cartId === cartId);
      if (item) {
        item.quantity = Math.max(1, item.quantity + delta);
      }
      cartSlice.caseReducers.calculateTotals(state);
    },

    removeFromCart: (state, action: PayloadAction<string>) => {
      state.cart = state.cart.filter(i => i.cartId !== action.payload);
      cartSlice.caseReducers.calculateTotals(state);
    },

    setOrderType: (state, action: PayloadAction<OrderType>) => {
      if (state.orderType !== action.payload) {
        state.locationId = null;
        state.activeOrderId = null;
        state.orderType = action.payload;
      }
    },

    setLocation: (state, action: PayloadAction<string | null>) => {
      const mesaId = action.payload;
      if (state.locationId !== mesaId) {
        state.locationId = mesaId;
        state.orderType = 'MESA';
        
        // Lookup if this table has an active order
        const existingOrder = state.tableOrders.find(o => o.mesa_id === mesaId);
        state.activeOrderId = existingOrder ? existingOrder.id : null;
      }
    },

    clearCart: (state) => {
      state.cart = [];
      state.total = 0;
      state.locationId = null;
      state.activeOrderId = null;
      state.discount = null;
    },

    updateOrderDiscount: (state, action: PayloadAction<{ type: 'FIXED' | 'PERCENTAGE'; value: number } | null>) => {
      state.discount = action.payload;
    },

    setActiveOrderId: (state, action: PayloadAction<string | null>) => {
      state.activeOrderId = action.payload;
    },

    restoreOrder: (state, action: PayloadAction<PendingOrder>) => {
      const order = action.payload;
      state.orderType = order.order_type as any;
      state.locationId = order.mesa_id || null;
      state.activeOrderId = order.id;
      
      // Load items into cart with fresh cartIds
      state.cart = (order.items || []).map(item => ({
        cartId: `restore-${Math.random().toString(36).substring(7)}`,
        product: item.product || { 
          id: (item as any).product_id, 
          nombre: (item as any).nombre || 'Producto', 
          precio: (item as any).precio || 0,
          categoria: 'General',
          imagen_url: '',
          stock: 0
        },
        quantity: (item as any).cantidad || item.quantity || 1,
        selectedIngredients: (item as any).ingredientes || [],
        selectedAdditions: (item as any).aditions || (item as any).adiciones || []
      }));
      
      // Re-calculate totals for the loaded cart
      const total = state.cart.reduce((sum, item) => {
        const basePrice = item.product.precio || 0;
        const additionsTotal = item.selectedAdditions.reduce((s: number, a: any) => s + (a.precio || 0), 0);
        return sum + (basePrice + additionsTotal) * item.quantity;
      }, 0);
      state.total = total;
    },

    toggleParaLlevar: (state, action: PayloadAction<string>) => {
      const cartId = action.payload;
      const item = state.cart.find(i => i.cartId === cartId);
      if (item) {
        item.para_llevar = !item.para_llevar;
      }
    },

    updateItemPriceOverride: (state, action: PayloadAction<{ cartId: string; price_override: number | null }>) => {
      const { cartId, price_override } = action.payload;
      const item = state.cart.find(i => i.cartId === cartId);
      if (item) {
        item.price_override = price_override === null ? undefined : price_override;
      }
      cartSlice.caseReducers.calculateTotals(state);
    },

    updateItemDiscount: (state, action: PayloadAction<{ cartId: string; discount: { type: 'FIXED' | 'PERCENTAGE'; value: number } | null }>) => {
      const { cartId, discount } = action.payload;
      const item = state.cart.find(i => i.cartId === cartId);
      if (item) {
        item.discount = discount === null ? undefined : discount;
      }
      cartSlice.caseReducers.calculateTotals(state);
    },

    updateCartItemCustomization: (state, action: PayloadAction<{ 
      cartId: string; 
      selectedIngredients: Ingredient[]; 
      selectedAdditions: Addition[]; 
      notes?: string; 
      price_override?: number;
      discount?: { type: 'FIXED' | 'PERCENTAGE'; value: number } | null;
      para_llevar?: boolean;
    }>) => {
      const { cartId, selectedIngredients, selectedAdditions, notes, price_override, discount, para_llevar } = action.payload;
      const item = state.cart.find(i => i.cartId === cartId);
      if (item) {
        if (selectedIngredients !== undefined) item.selectedIngredients = selectedIngredients;
        if (selectedAdditions !== undefined) item.selectedAdditions = selectedAdditions;
        if (notes !== undefined) item.notes = notes;
        if (price_override !== undefined) item.price_override = price_override;
        if (discount !== undefined) item.discount = discount === null ? undefined : discount;
        if (para_llevar !== undefined) item.para_llevar = para_llevar;
      }
      cartSlice.caseReducers.calculateTotals(state);
    },

    calculateTotals: (state) => {
      state.total = state.cart.reduce((sum, item) => {
        const basePrice = item.price_override !== undefined ? item.price_override : (item.product.precio || 0);
        const additionsTotal = item.selectedAdditions.reduce((s, a) => s + ((a.precio || 0) * (a.cantidad || 0)), 0);
        let subtotal = (basePrice + additionsTotal) * item.quantity;
        
        if (item.discount) {
          if (item.discount.type === 'FIXED') subtotal -= item.discount.value;
          else subtotal -= (subtotal * (item.discount.value / 100));
        }
        
        return sum + Math.max(0, subtotal);
      }, 0);
    },

    /**
     * REAL-TIME: Update orders from WebSocket
     */
    updateOrdersFromSocket: (state, action: PayloadAction<any>) => {
      // action.payload is the data object from table_status_changed
      const updates = action.payload;
      
      Object.keys(updates).forEach(mesaId => {
        const update = updates[mesaId];
        const existingOrderIndex = state.tableOrders.findIndex(o => o.mesa_id === mesaId);

        if (update.status === 'LIBRE') {
          // Remove order if table is now free
          state.tableOrders = state.tableOrders.filter(o => o.mesa_id !== mesaId);
        } else if (existingOrderIndex >= 0) {
          // Update existing order
          state.tableOrders[existingOrderIndex] = {
            ...state.tableOrders[existingOrderIndex],
            id: update.order_id || state.tableOrders[existingOrderIndex].id,
            total: update.total || state.tableOrders[existingOrderIndex].total,
            status: update.status
          };
        } else {
          // Add new order for this table
          state.tableOrders.push({
            id: update.order_id || `temp-${Date.now()}`,
            mesa_id: mesaId,
            total: update.total || 0,
            status: update.status,
            timestamp: Date.now(),
            items: []
          });
        }
      });
    },
    /**
     * RESET: Clear cart state completely when switching store
     */
    clearCartState: (state) => {
      state.cart = [];
      state.total = 0;
      state.locationId = null;
      state.activeOrderId = null;
      state.discount = null;
      state.pendingOrders = [];
      state.tableOrders = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTableOrders.pending, (state) => {
        state.loading.orders = true;
      })
      .addCase(fetchTableOrders.fulfilled, (state, action) => {
        state.tableOrders = action.payload;
        state.loading.orders = false;
      })
      .addCase(fetchTableOrders.rejected, (state) => {
        state.loading.orders = false;
      })
      .addCase(fetchPendingOrders.pending, (state) => {
        state.loading.orders = true;
      })
      .addCase(fetchPendingOrders.fulfilled, (state, action) => {
        state.pendingOrders = action.payload;
        state.loading.orders = false;
      })
      .addCase(fetchPendingOrders.rejected, (state) => {
        state.loading.orders = false;
      });
  }
});

export const { 
  addToCart, 
  updateQuantity, 
  removeFromCart, 
  clearCart, 
  setOrderType, 
  setLocation,
  setActiveOrderId,
  restoreOrder,
  updateOrdersFromSocket,
  toggleParaLlevar,
  updateItemPriceOverride,
  updateItemDiscount,
  updateCartItemCustomization,
  updateOrderDiscount,
  clearCartState
} = cartSlice.actions;

export default cartSlice.reducer;
