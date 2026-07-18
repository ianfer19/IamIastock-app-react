import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Ingredient, Addition } from '../../../domain/entities/Product';
import { OrderService } from '@/infrastructure/services/orderService';
import { AuthService } from '@/infrastructure/services/authService';

/**
 * ARCHITECTURE: Elite POS State Management
 * -----------------------------------------
 * We decouple the "Active Cart" from "Pending Orders" (Mostrador/Parked).
 * This allows high-speed counter operations without losing data.
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

export interface PosLoadingState {
  tables: boolean;
  zones: boolean;
  floors: boolean;
  orders: boolean;
}

interface PosState {
  // --- Active Session ---
  cart: CartItem[];
  orderType: OrderType;
  locationId: string | null;
  activeOrderId: string | null;
  total: number;
  
  // --- Pending / Counter Orders ---
  pendingOrders: PendingOrder[];
  tableOrders: PendingOrder[];

  // --- Metadata / Config ---
  tables: any[];
  zones: any[];
  floors: any[];

  // --- UI States ---
  loading: PosLoadingState;

  // --- Actions ---
  addToCart: (product: Product) => void;
  updateQuantity: (cartId: string, delta: number) => void;
  removeFromCart: (cartId: string) => void;
  setOrderType: (type: OrderType) => void;
  setLocation: (locationId: string | null) => void;
  clearCart: () => void;
  
  // --- Order Persistence ---
  parkOrder: (deliveryInfo?: any) => Promise<void>;
  fetchPendingOrders: () => Promise<void>;
  fetchTableOrders: () => Promise<void>;
  fetchTables: () => Promise<void>;
  fetchZones: () => Promise<void>;
  fetchFloors: () => Promise<void>;
  finalizeOrder: (paymentPayload: any) => Promise<void>;
  restoreOrder: (orderId: string) => void;
  deletePendingOrder: (orderId: string) => void;
  
  // --- Core Engine ---
  calculateTotals: () => void;
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      cart: [],
      orderType: 'MESA',
      locationId: null,
      activeOrderId: null,
      total: 0,
      pendingOrders: [],
      tableOrders: [],
      tables: [],
      zones: [],
      floors: [],
      loading: {
        tables: false,
        zones: false,
        floors: false,
        orders: false,
      },

      addToCart: (product) => {
        const cartId = `${product.id}-${Date.now()}`;
        const newItem: CartItem = {
          cartId,
          product,
          quantity: 1,
          selectedIngredients: [],
          selectedAdditions: [],
        };
        
        set((state) => ({ cart: [...state.cart, newItem] }));
        get().calculateTotals();
      },

      updateQuantity: (cartId, delta) => {
        set((state) => ({
          cart: state.cart.map((item) =>
            item.cartId === cartId
              ? { ...item, quantity: Math.max(1, item.quantity + delta) }
              : item
          ),
        }));
        get().calculateTotals();
      },

      removeFromCart: (cartId) => {
        set((state) => ({
          cart: state.cart.filter((item) => item.cartId !== cartId),
        }));
        get().calculateTotals();
      },

      setOrderType: (type) => {
        const current = get().orderType;
        if (current !== type) {
          get().clearCart();
          set({ orderType: type });
        }
      },
      
      setLocation: (locationId) => {
        const current = get().locationId;
        if (current !== locationId) {
          get().clearCart();
          set({ locationId, orderType: 'MESA' });
        }
      },

      clearCart: () => set({ cart: [], total: 0, locationId: null, activeOrderId: null }),

      fetchPendingOrders: async () => {
        set((state) => ({ loading: { ...state.loading, orders: true } }));
        try {
          const orders = await OrderService.listOrders('MOSTRADOR');
          set({ pendingOrders: orders });
        } catch (e) {
          console.error('Error fetching pending orders', e);
        } finally {
          set((state) => ({ loading: { ...state.loading, orders: false } }));
        }
      },

      fetchTableOrders: async () => {
        set((state) => ({ loading: { ...state.loading, orders: true } }));
        try {
          const orders = await OrderService.listOrders('MESA');
          set({ tableOrders: orders });
        } catch (e) {
          console.error('Error fetching table orders', e);
        } finally {
          set((state) => ({ loading: { ...state.loading, orders: false } }));
        }
      },

      fetchTables: async () => {
        set((state) => ({ loading: { ...state.loading, tables: true } }));
        try {
          const { PosService } = await import('@/infrastructure/services/posService');
          const tables = await PosService.getTables();
          set({ tables });
        } catch (e) {
          console.error('Error fetching tables', e);
        } finally {
          set((state) => ({ loading: { ...state.loading, tables: false } }));
        }
      },

      fetchZones: async () => {
        set((state) => ({ loading: { ...state.loading, zones: true } }));
        try {
          const { PosService } = await import('@/infrastructure/services/posService');
          const zones = await PosService.getZones();
          set({ zones });
        } catch (e) {
          console.error('Error fetching zones', e);
        } finally {
          set((state) => ({ loading: { ...state.loading, zones: false } }));
        }
      },

      fetchFloors: async () => {
        set((state) => ({ loading: { ...state.loading, floors: true } }));
        try {
          const { PosService } = await import('@/infrastructure/services/posService');
          const floors = await PosService.getFloors();
          set({ floors });
        } catch (e) {
          console.error('Error fetching floors', e);
        } finally {
          set((state) => ({ loading: { ...state.loading, floors: false } }));
        }
      },

      finalizeOrder: async (paymentPayload) => {
        const { activeOrderId, cart, clearCart, fetchPendingOrders } = get();
        const userProfile = await AuthService.getCurrentUser();
        const store_id = userProfile?.tenant_id || (userProfile as any)?.user?.tenant_id || (userProfile as any)?.commerce?.id || '';
        
        let orderId = activeOrderId;
        
        if (!orderId) {
          const appendPayload = {
            store_id,
            order_type: 'MOSTRADOR' as any,
            items: cart.map(item => ({
              product_id: item.product.id,
              nombre: item.product.nombre,
              precio: item.product.precio,
              cantidad: item.quantity,
              ingredientes: item.selectedIngredients.map(i => ({ id: i.id, nombre: i.nombre, cantidad: 1 })),
              aditions: item.selectedAdditions.map(a => ({ id: a.id, nombre: a.nombre, precio: a.precio, cantidad: 1 })),
            }))
          };
          orderId = await OrderService.appendOrder(appendPayload);
        }

        try {
          await OrderService.closeOrder(orderId as string, {
            ...paymentPayload,
            store_id 
          });
          clearCart();
          await fetchPendingOrders();
        } catch (e) {
          console.error('Error closing order', e);
          throw e;
        }
      },

      parkOrder: async (deliveryInfo) => {
        const { cart, clearCart, fetchPendingOrders, activeOrderId, orderType, locationId } = get();
        if (cart.length === 0) return;

        const userProfile = await AuthService.getCurrentUser();
        const store_id = userProfile?.tenant_id || (userProfile as any)?.user?.tenant_id || (userProfile as any)?.commerce?.id || '';

        try {
          const payload = {
            store_id,
            order_id: activeOrderId || undefined,
            mesa_id: locationId || undefined,
            order_type: orderType,
            delivery_info: deliveryInfo,
            items: cart.map(item => ({
              product_id: item.product.id,
              nombre: item.product.nombre,
              precio: item.product.precio,
              cantidad: item.quantity,
              ingredientes: item.selectedIngredients.map(i => ({ id: i.id, nombre: i.nombre, cantidad: 1 })),
              adiciones: item.selectedAdditions.map(a => ({ id: a.id, nombre: a.nombre, precio: a.precio, cantidad: 1 })),
            }))
          };

          await OrderService.appendOrder(payload);
          clearCart();
          await fetchPendingOrders();
        } catch (e) {
          console.error('Error parking order in backend', e);
          throw e;
        }
      },

      restoreOrder: (orderId) => {
        const { pendingOrders, tableOrders } = get();
        const order = pendingOrders.find((o) => o.id === orderId) || tableOrders.find((o) => o.id === orderId);
        
        if (!order) return;

        set({
          orderType: order.order_type as OrderType,
          locationId: order.mesa_id || null,
          cart: (order.items || []).map(item => ({
            cartId: Math.random().toString(36).substring(7),
            product: item.product || { 
              id: (item as any).product_id, 
              nombre: (item as any).nombre, 
              precio: (item as any).precio,
              categoria: 'General',
              imagen_url: '',
              stock: 0
            },
            quantity: (item as any).cantidad || item.quantity,
            selectedIngredients: [],
            selectedAdditions: []
          })),
          activeOrderId: order.id
        });
        get().calculateTotals();
      },

      deletePendingOrder: (orderId) => {
        set((state) => ({
          pendingOrders: state.pendingOrders.filter(o => o.id !== orderId)
        }));
      },

      calculateTotals: () => {
        const { cart } = get();
        const newTotal = cart.reduce((sum, item) => {
          if (!item.product) return sum;
          const itemPrice = item.product.precio || 0;
          const additionsTotal = item.selectedAdditions.reduce((s, a) => s + (a.precio || 0), 0);
          let subtotal = (itemPrice + additionsTotal) * item.quantity;
          
          if (item.discount) {
            if (item.discount.type === 'FIXED') subtotal -= item.discount.value;
            else subtotal -= (subtotal * (item.discount.value / 100));
          }
          
          return sum + Math.max(0, subtotal);
        }, 0);

        set({ total: newTotal });
      },
    }),
    {
      name: 'pos-v2-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Solo persistimos datos, no los estados de carga
        cart: state.cart,
        orderType: state.orderType,
        locationId: state.locationId,
        activeOrderId: state.activeOrderId,
        total: state.total,
        pendingOrders: state.pendingOrders,
        tableOrders: state.tableOrders,
        tables: state.tables,
        zones: state.zones,
        floors: state.floors,
      }),
    }
  )
);
