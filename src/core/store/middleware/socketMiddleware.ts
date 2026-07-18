import { Middleware } from '@reduxjs/toolkit';
import { Env } from '../../config/env';
import { setSocketRegistered } from '../slices/authSlice';
import { NotificationService } from '@/core/services/notificationService';
import { ChatService } from '@/infrastructure/services/chatService';

/**
 * ARCHITECTURE: Senior Lead WebSocket Middleware
 * ---------------------------------------------
 * This middleware manages the WebSocket lifecycle independently from components.
 * It ensures the 'register' protocol is followed and dispatches global actions
 * for incoming real-time updates.
 */

export const socketMiddleware: Middleware = (store) => {
  let socket: WebSocket | null = null;
  let reconnectTimer: any = null;

  const connect = () => {
    // Avoid multiple connections
    if (socket) return;

    console.log('🔌 [Socket] Conectando a:', Env.WS_URL);
    socket = new WebSocket(Env.WS_URL);

    socket.onopen = () => {
      console.log('✅ [Socket] Conexión establecida con AWS Gateway');
      
      const state = store.getState() as any;
      const { tenantId, role, isAuthenticated } = state.auth;

      // MANDATORY: Register with the backend to receive tenant-specific events
      if (isAuthenticated && tenantId) {
        console.log('📡 [Socket] Protocolo de Registro -> Tenant:', tenantId);
        socket?.send(JSON.stringify({
          action: 'register',
          storeId: tenantId,
          role: role || 'waiter'
        }));
        store.dispatch(setSocketRegistered(true));
      }
    };

    socket.onmessage = (event) => {
      try {
        console.log('📬 [WebSocket Event Raw Data]:', event.data);
        const message = JSON.parse(event.data);
        console.log('📥 [Socket] Evento recibido:', message.action);

        // DISPATCHER: Route messages to specific slices
        switch (message.action) {
          case 'table_status_changed':
            // ARCHITECTURE: Senior Lead Data Normalization
            // Strip 'MESA#' prefixes from keys and values to ensure cross-module consistency
            const normalizedData: any = {};
            Object.keys(message.data || {}).forEach(key => {
              const cleanKey = key.replace('MESA#', '');
              const val = message.data[key];
              normalizedData[cleanKey] = {
                ...val,
                mesa_id: val.mesa_id ? String(val.mesa_id).replace('MESA#', '') : cleanKey,
                order_id: val.order_id ? String(val.order_id).replace('ORDEN#', '') : val.order_id
              };
            });

            // Update POS tables state in real-time
            store.dispatch({ 
              type: 'pos/updateTablesFromSocket', 
              payload: normalizedData 
            });
            // Update CART orders state in real-time
            store.dispatch({
              type: 'cart/updateOrdersFromSocket',
              payload: normalizedData
            });
            break;

          case 'STOCK_UPDATE':
            // Update catalog/inventory state in real-time
            store.dispatch({ 
              type: 'catalog/updateStockFromSocket', 
              payload: message.data 
            });

            // Trigger beautiful real-time Stock Toast with product lookup from Redux state
            try {
              const state = store.getState() as any;
              const products = state.catalog?.products || [];
              const foundProduct = products.find((p: any) => p.id === message.data?.id);
              
              const prodName = foundProduct?.nombre || foundProduct?.name || 'Producto';
              const newStock = message.data?.new_stock !== undefined ? message.data.new_stock : 'Bajo';
              
              NotificationService.stock(
                '⚠️ Alerta de Inventario',
                `El stock de "${prodName}" se ha actualizado a: ${newStock}`
              );
            } catch (stockErr) {
              console.error('Error triggering stock notification:', stockErr);
            }
            break;

          case 'ENTITY_SYNC':
            if (message.entity === 'PRODUCT' && message.data) {
              const prodId = message.data.id;
              const prodName = message.data.nombre || message.data.name || 'Producto';
              const prodStock = message.data.stock !== undefined ? message.data.stock : 'N/A';

              // Synchronize Redux stock level
              store.dispatch({
                type: 'catalog/updateStockFromSocket',
                payload: {
                  id: prodId,
                  type: 'PROD',
                  new_stock: message.data.stock
                }
              });

              // Show a beautiful in-app sync toast
              try {
                NotificationService.info(
                  '🔄 Sincronización de Catálogo',
                  `"${prodName}" actualizado en tiempo real (Stock: ${prodStock})`
                );
              } catch (syncErr) {
                console.error('Error triggering ENTITY_SYNC notification:', syncErr);
              }
            }
            break;

          case 'new_order':
            // Trigger UI notifications or KDS updates
            store.dispatch({ 
              type: 'ui/notifyNewOrder', 
              payload: message 
            });

            // Trigger premium real-time New Order Toast
            try {
              const orderId = message.data?.order_id || message.data?.id || 'Nuevo';
              const cleanOrderId = String(orderId).replace('ORDEN#', '');
              const customer = message.data?.customer_name || message.data?.cliente || 'Cliente';
              NotificationService.order(
                '📦 Nuevo Pedido Recibido',
                `Pedido #${cleanOrderId} registrado para ${customer}`
              );
            } catch (orderErr) {
              console.error('Error triggering new_order notification:', orderErr);
            }
            break;

          case 'new_message':
            // Trigger beautiful real-time Chat Toast
            try {
              const conversationId = message.data?.phone || 
                                     message.data?.conversation_id || 
                                     message.data?.user_id || 
                                     message.data?.id || 
                                     message.data?.social_id || 
                                     '';
              
              if (!conversationId) {
                console.warn('⚠️ [Socket] Se recibió "new_message" sin un identificador de conversación válido.', message.data);
              }

              // Replicate Angular logic: Robust mapping of incoming message
              const mappedMessage = ChatService.mapIncomingMessage(message.data, conversationId);

              // Forward to Redux to let other features listen to new messages
              store.dispatch({
                type: 'chat/receiveMessageFromSocket',
                payload: mappedMessage
              });

              // Format channel label and preview text dynamically for the premium toast
              const channelNames: { [key: string]: string } = {
                whatsapp: 'WhatsApp',
                messenger: 'Messenger',
                instagram: 'Instagram',
                web: 'Web Chat'
              };
              const channelName = channelNames[mappedMessage.channel] || 'Chat';
              const senderName = mappedMessage.senderName || 'Cliente';

              let previewText = mappedMessage.text || '';
              if (mappedMessage.attachment) {
                const attType = mappedMessage.attachment.type;
                if (attType === 'image') previewText = '📷 Imagen';
                else if (attType === 'audio') previewText = '🎵 Audio / Nota de voz';
                else if (attType === 'video') previewText = '🎥 Video';
                else if (attType === 'document') previewText = '📄 Documento';
              }

              NotificationService.info(
                `💬 ${channelName}: ${senderName}`,
                previewText
              );
            } catch (msgErr) {
              console.error('Error triggering new_message notification:', msgErr);
            }
            break;

          default:
            console.log('ℹ️ [Socket] Acción no manejada:', message.action);
        }
      } catch (e) {
        console.error('❌ [Socket] Error procesando mensaje:', e);
      }
    };

    socket.onclose = (e) => {
      console.log('⚠️ [Socket] Conexión cerrada:', e.reason);
      socket = null;
      store.dispatch(setSocketRegistered(false));
      
      // Auto-reconnect logic (Exponential backoff could be added here)
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, 5000);
      }
    };

    socket.onerror = (error) => {
      console.warn('⚠️ [Socket] Error de conexión (Reintentando en segundo plano...):', error);
    };
  };

  return (next) => (action: any) => {
    // 1. Lifecycle: Connect on Authentication
    if (action.type === 'auth/setAuth') {
      const result = next(action);
      connect();
      return result;
    }

    // 2. Lifecycle: Disconnect on Logout
    if (action.type === 'auth/logout') {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (socket) {
        socket.close();
        socket = null;
      }
      return next(action);
    }

    return next(action);
  };
};
