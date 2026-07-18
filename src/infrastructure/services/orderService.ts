import apiClient from '../../core/api/client';
import { Env } from '../../core/config/env';

export interface OrderPayload {
  order_id?: string;
  mesa_id?: string;
  order_type: 'MOSTRADOR' | 'MESA' | 'DOMICILIO' | 'RECOGER';
  customer_name?: string;
  items: any[];
  waiter_id?: string;
  waiter_name?: string;
}

export interface CloseOrderPayload {
  cash_register_id: string;
  payment_methods: {
    name: string;
    type: string;
    monto: number;
  }[];
  notas?: string;
  created_at?: string;
}

export const OrderService = {
  /**
   * List open orders with optional type filtering
   */
  async listOrders(type: 'MOSTRADOR' | 'MESA' | 'DOMICILIO' | 'RECOGER' = 'MOSTRADOR'): Promise<any[]> {
    try {
      const response = await apiClient.get(`${Env.API_URL}/orders`, {
        params: { status: 'ABIERTA', order_type: type }
      });
      
      let rawItems: any[] = [];
      const data = response.data;

      if (!data) {
        rawItems = [];
      } else if (data.body && typeof data.body === 'string') {
        try {
          const parsedBody = JSON.parse(data.body);
          rawItems = parsedBody.Items || parsedBody.items || parsedBody.data || parsedBody.orders || (Array.isArray(parsedBody) ? parsedBody : []);
        } catch (e) {
          console.error('Error parsing response body:', e);
          rawItems = [];
        }
      } else if (data.body && typeof data.body === 'object') {
        const b = data.body;
        rawItems = b.Items || b.items || b.data || b.orders || b;
      } else if (Array.isArray(data)) {
        rawItems = data;
      } else if (data.Items && Array.isArray(data.Items)) {
        rawItems = data.Items;
      } else if (data.items && Array.isArray(data.items)) {
        rawItems = data.items;
      } else if (data.data && Array.isArray(data.data)) {
        rawItems = data.data;
      } else if (data.orders && Array.isArray(data.orders)) {
        rawItems = data.orders;
      } else if (typeof data === 'object') {
        const possibleArrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
        if (possibleArrayKey) {
          rawItems = data[possibleArrayKey];
        } else {
          rawItems = [data];
        }
      }

      console.log(`📦 [OrderService] listOrders(${type}) - Crudo:`, rawItems.length, 'items');

      // Group items by unique identifier to count products and consolidate metadata
      const orderGroups: { [key: string]: { metadata: any; items: any[] } } = {};

      rawItems.forEach(item => {
        const pk = item.PK || item.id || item.order_id || item.orderId;
        if (!pk) return;

        if (!orderGroups[pk]) {
          orderGroups[pk] = { metadata: null, items: [] };
        }

        const hasSKMetadata = item.SK && (item.SK.startsWith('METADATA') || item.SK === 'METADATA');
        const isFlatOrderHeader = !item.SK && (
          item.status !== undefined || 
          item.estado !== undefined || 
          item.total !== undefined || 
          item.total_amount !== undefined || 
          item.items !== undefined || 
          item.order_type !== undefined ||
          item.orderType !== undefined
        );
        const isMetadata = hasSKMetadata || isFlatOrderHeader;
        
        if (isMetadata) {
          orderGroups[pk].metadata = { ...orderGroups[pk].metadata, ...item };
          if (item.items && Array.isArray(item.items)) {
            const existingIds = new Set(orderGroups[pk].items.map(i => i.product_id || i.id));
            item.items.forEach((innerItem: any) => {
              const innerId = innerItem.product_id || innerItem.id;
              if (!innerId || !existingIds.has(innerId)) {
                orderGroups[pk].items.push({
                  product_id: innerItem.product_id || innerItem.id,
                  nombre: innerItem.nombre || innerItem.name || 'Producto',
                  precio: parseFloat(innerItem.precio || innerItem.price || '0'),
                  cantidad: parseInt(innerItem.cantidad || innerItem.quantity || '1', 10),
                  ingredientes: innerItem.ingredientes || [],
                  adiciones: innerItem.adiciones || [],
                  notas: innerItem.notas || ''
                });
              }
            });
          }
        } else if (item.SK && item.SK.startsWith('ITEM#')) {
          orderGroups[pk].items.push({
            product_id: item.product_id || item.id,
            nombre: item.nombre || item.name || 'Producto',
            precio: parseFloat(item.precio || item.price || '0'),
            cantidad: parseInt(item.cantidad || item.quantity || '1', 10),
            ingredientes: item.ingredientes || [],
            adiciones: item.adiciones || [],
            notas: item.notas || ''
          });
        } else if (item.name && item.quantity) {
          orderGroups[pk].items.push({
            product_id: item.product_id || item.id,
            nombre: item.nombre || item.name || 'Producto',
            precio: parseFloat(item.precio || item.price || '0'),
            cantidad: parseInt(item.cantidad || item.quantity || '1', 10),
            ingredientes: item.ingredientes || [],
            adiciones: item.adiciones || [],
            notas: item.notas || ''
          });
        }
      });

      const mapped = Object.values(orderGroups)
        .filter(group => group.metadata !== null)
        .map(group => {
          const item = group.metadata;
          const createdAt = item.created_at || item.createdAt || new Date().toISOString();
          return {
            id: item.PK ? String(item.PK).replace('ORDEN#', '') : (item.id || item.order_id || item.orderId),
            total: parseFloat(item.total || item.total_amount || '0'),
            status: item.status || item.estado,
            customerName: item.customer_name || item.customerName || item.delivery_info?.customer_name || 'Sin Nombre',
            customerPhone: item.customer_phone || item.credit_info?.phone || '',
            waiterName: item.opened_by_name || 'Desconocido',
            notas: item.notas || '',
            mesa_id: (item.mesa_id || item.mesaId) ? String(item.mesa_id || item.mesaId).replace('MESA#', '') : null,
            timestamp: new Date(createdAt).getTime(),
            items: group.items,
            order_type: item.order_type || item.orderType || type,
          };
        });

      console.log(`✨ [OrderService] listOrders(${type}) - Mapeado final:`, mapped.length, 'órdenes');
      return mapped;
    } catch (e) {
      console.error(`[OrderService] Error listing ${type} orders`, e);
      throw e;
    }
  },

  /**
   * Get single order complete details (Metadata + Items)
   */
  async getOrder(orderId: string): Promise<{ metadata: any; items: any[] }> {
    try {
      const cleanId = orderId.startsWith('o_') ? orderId : `o_${orderId}`;
      const response = await apiClient.get(`${Env.API_URL}/orders/${cleanId}`);
      let rawItems: any[] = [];
      const data = response.data;

      if (data && data.body && typeof data.body === 'string') {
        const parsedBody = JSON.parse(data.body);
        rawItems = parsedBody.Items || (Array.isArray(parsedBody) ? parsedBody : []);
      } else if (data && Array.isArray(data)) {
        rawItems = data;
      } else if (data && data.Items && Array.isArray(data.Items)) {
        rawItems = data.Items;
      } else if (data && data.items && Array.isArray(data.items)) {
        rawItems = data.items;
      } else if (data && typeof data === 'object' && !data.body) {
        rawItems = Array.isArray(data) ? data : [data];
      }

      let metadata: any = null;
      const items: any[] = [];

      rawItems.forEach(item => {
        const isMetadata = item.SK && (item.SK.startsWith('METADATA') || item.SK === 'METADATA') || 
                          (!item.SK && (item.status || item.total));
        if (isMetadata) {
          metadata = item;
        } else if (item.SK && item.SK.startsWith('ITEM#')) {
          items.push({
            product_id: item.product_id || item.id,
            nombre: item.nombre || item.name || 'Producto',
            precio: parseFloat(item.precio || item.price || '0'),
            cantidad: parseInt(item.cantidad || item.quantity || '1', 10),
            ingredientes: item.ingredientes || [],
            adiciones: item.adiciones || [],
            notas: item.notas || ''
          });
        }
      });

      return { metadata, items };
    } catch (e) {
      console.error(`[OrderService] Error getting order details for ${orderId}`, e);
      throw e;
    }
  },

  /**
   * Create or Append to an order (Park Order)
   */
  async appendOrder(payload: OrderPayload): Promise<string> {
    try {
      const response = await apiClient.post(`${Env.API_URL}/orders/append`, payload);
      const data = response.data;
      
      const parsed = (data && data.body && typeof data.body === 'string') 
        ? JSON.parse(data.body) 
        : data;
        
      return parsed.order_id || parsed.id;
    } catch (e) {
      console.error('[OrderService] Error appending order', e);
      throw e;
    }
  },

  /**
   * Finalize and Close an order (Payment)
   */
  async closeOrder(orderId: string, payload: CloseOrderPayload): Promise<void> {
    try {
      await apiClient.post(`${Env.API_URL}/orders/${orderId}/close`, payload);
    } catch (e) {
      console.error('[OrderService] Error closing order', e);
      throw e;
    }
  },

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<void> {
    try {
      await apiClient.put(`${Env.API_URL}/orders/${orderId}/cancel`);
    } catch (e) {
      console.error('[OrderService] Error cancelling order', e);
      throw e;
    }
  }
};
