import apiClient from '../../core/api/client';
import { Env } from '../../core/config/env';
import { ChatConversation, ChatMessage, QuickTemplate, ChatAgent } from '../../domain/entities/Chat';
import { InventoryService } from './inventoryService';

/**
 * INFRASTRUCTURE LAYER: Omnichannel Chat Service
 * ----------------------------------------------
 * Orchestrates REST API communications, offline mock data support,
 * and calls the IAStock AI engine to draft inventory-aware responses.
 */

// Local Cache Mocks for Demos & Offline Testing
let mockConversations: ChatConversation[] = [
  {
    id: 'CONV-001',
    customerName: 'Santiago Rodríguez',
    customerPhone: '+57 312 456 7890',
    customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
    lastMessage: {
      id: 'MSG-001-B',
      conversationId: 'CONV-001',
      sender: 'client',
      text: '¿Hola! Tienen pechuga de pollo fileteada? ¿Cuánto cuesta el plato?',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      status: 'delivered',
      channel: 'whatsapp',
    },
    unreadCount: 1,
    channel: 'whatsapp',
    status: 'open',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'CONV-002',
    customerName: 'Clara Inés Gómez',
    customerPhone: '+57 320 891 0023',
    lastMessage: {
      id: 'MSG-002',
      conversationId: 'CONV-002',
      sender: 'agent',
      senderName: 'Carlos (Administrador)',
      text: 'Perfecto Clara, tu pedido de hamburguesa combo ya va en camino con el domiciliario.',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      status: 'read',
      channel: 'instagram',
    },
    unreadCount: 0,
    channel: 'instagram',
    status: 'open',
    assignedAgent: {
      id: 'AGENT-101',
      name: 'Carlos R.',
      role: 'admin',
    },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'CONV-003',
    customerName: 'Mateo Restrepo',
    customerPhone: '+57 315 776 2201',
    lastMessage: {
      id: 'MSG-003',
      conversationId: 'CONV-003',
      sender: 'client',
      text: '¿Hacen entregas en el barrio Laureles?',
      timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      status: 'read',
      channel: 'messenger',
    },
    unreadCount: 0,
    channel: 'messenger',
    status: 'pending',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
  {
    id: 'CONV-004',
    customerName: 'Cliente Web #49',
    lastMessage: {
      id: 'MSG-004',
      conversationId: 'CONV-004',
      sender: 'client',
      text: '¿Cuál es la contraseña del WiFi del local?',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'read',
      channel: 'web',
    },
    unreadCount: 0,
    channel: 'web',
    status: 'closed',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  }
];

let mockMessages: { [convId: string]: ChatMessage[] } = {
  'CONV-001': [
    {
      id: 'MSG-001-A',
      conversationId: 'CONV-001',
      sender: 'system',
      text: '🤖 Chat Omnicanal iniciado vía WhatsApp Business',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      status: 'read',
      channel: 'whatsapp',
    },
    {
      id: 'MSG-001-B',
      conversationId: 'CONV-001',
      sender: 'client',
      text: '¿Hola! Tienen pechuga de pollo fileteada? ¿Cuánto cuesta el plato?',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      status: 'delivered',
      channel: 'whatsapp',
    }
  ],
  'CONV-002': [
    {
      id: 'MSG-002-A',
      conversationId: 'CONV-002',
      sender: 'client',
      text: 'Hola, me gustaría saber si ya despacharon mi pedido.',
      timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      status: 'read',
      channel: 'instagram',
    },
    {
      id: 'MSG-002',
      conversationId: 'CONV-002',
      sender: 'agent',
      senderName: 'Carlos (Administrador)',
      text: 'Perfecto Clara, tu pedido de hamburguesa combo ya va en camino con el domiciliario.',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      status: 'read',
      channel: 'instagram',
    }
  ]
};

export const ChatService = {

  /**
   * Robust mapping of raw backend message payload to the ChatMessage domain entity.
   * Matches Angular omnichat.service.ts mappers.
   */
  mapIncomingMessage(m: any, conversationId: string): ChatMessage {
    const target = m.message || m.data || m;
    
    // Priority: timestamp
    let rawDate = target.received_at || target.timestamp || target.created_at || target.time || target.last_message_time || m.timestamp;
    
    // Secondary: Extract from ID if no explicit date field
    const possibleId = target.id || target.uuid || m.id || m.uuid || '';
    if (!rawDate && typeof possibleId === 'string' && possibleId.startsWith('MSG#')) {
      const parts = possibleId.split('#');
      if (parts.length > 1) {
        rawDate = parts[1].split('_')[0];
      }
    }
    
    const timestampStr = rawDate ? new Date(
      typeof rawDate === 'number' 
        ? (rawDate < 10000000000 ? rawDate * 1000 : rawDate) 
        : rawDate
    ).toISOString() : new Date().toISOString();

    // Normalize message type
    const validTypes = ['text', 'audio', 'image', 'video', 'document'];
    let rawType = (target.media_type || target.message_type || target.type || m.media_type || m.message_type || '').toString().toLowerCase();
    if (!validTypes.includes(rawType)) {
      rawType = '';
    }

    const mediaUrl = target.media_url || target.mediaUrl || m.media_url || m.mediaUrl;
    if ((rawType === 'text' || !rawType) && mediaUrl) {
      if (mediaUrl.includes('/audio/') || mediaUrl.endsWith('.ogg') || mediaUrl.endsWith('.mp3')) rawType = 'audio';
      else if (mediaUrl.includes('/video/') || mediaUrl.endsWith('.mp4')) rawType = 'video';
      else rawType = 'image';
    }

    const mType = (rawType || 'text') as 'text' | 'audio' | 'image' | 'video' | 'document';

    // Sender & Role logic
    let possibleSender = (target.sender_id || target.sender || m.sender_id || m.sender || '').toString().toLowerCase();
    let possibleRole = (target.sender || m.sender || '').toString().toLowerCase();
    
    if (possibleSender === 'assistant') possibleSender = 'bot';
    if (possibleRole === 'assistant') possibleRole = 'bot';

    const isInternal = ['bot', 'agent'].includes(possibleSender) || ['bot', 'agent'].includes(possibleRole);
    const senderType: 'client' | 'agent' | 'system' = isInternal ? 'agent' : 'client';

    const baseId = target.uuid || target.id || m.uuid || m.id || target.media_id || target.mediaId || m.media_id || m.mediaId;
    const generatedId = baseId ? String(baseId) : `gen-${timestampStr}-${senderType}`;

    const messageText = target.message_text || target.content || target.text || m.message_text || m.content || m.text || '';
    
    // Clean technical placeholders
    let cleanedText = messageText;
    if (mType !== 'text' && cleanedText) {
      const patterns = [/^\[imagen\]$/i, /^\[audio\]$/i, /^\[image\]$/i, /^\[video\]$/i, /^\[documento?\]$/i, /^imagen$/i, /^audio$/i, /^image$/i, /^video$/i, /^documento?\]$/i, /^documento$/i];
      if (patterns.some(p => p.test(cleanedText.trim()))) {
        cleanedText = '';
      }
    }

    let attachment: any = undefined;
    if (mType !== 'text' && mediaUrl) {
      let fileName = 'archivo';
      try {
        fileName = mediaUrl.split('/').pop() || 'archivo';
      } catch (e) {}

      attachment = {
        url: mediaUrl,
        type: mType,
        name: target.mime_type || target.mimeType || m.mimeType || fileName
      };
    }

    return {
      id: generatedId,
      conversationId,
      sender: senderType,
      senderName: target.sender_name || m.sender_name || (isInternal ? (target.employee_name || 'Agente') : undefined),
      text: cleanedText,
      timestamp: timestampStr,
      status: target.status || m.status || 'read',
      channel: (target.channel || m.channel || 'whatsapp') === 'facebook' ? 'messenger' : (target.channel || m.channel || 'whatsapp') as any,
      noteType: target.note_type || target.noteType || m.noteType || (possibleRole === 'whisper' ? 'whisper' : 'normal'),
      attachment
    };
  },
  
  /**
   * 1. GET ALL CONVERSATIONS
   * Pulls the active omni-inbox. Mocks are returned if connection fails.
   */
  async getConversations(): Promise<ChatConversation[]> {
    try {
      console.log('📡 [ChatService] Solicitando bandeja de conversaciones real en /chat/inbox...');
      const response = await apiClient.get(`${Env.API_URL}/chat/inbox`);
      const data = response.data !== undefined ? response.data : response;
      
      console.log('📥 [ChatService] Respuesta RAW del Inbox de la API:', JSON.stringify(data));
      
      let list: any[] = [];
      if (data) {
        if (typeof data.body === 'string') {
          try {
            const parsed = JSON.parse(data.body);
            list = parsed.conversations || parsed.Items || parsed.items || parsed;
          } catch (e) {
            console.error('Error parsing Lambda body', e);
          }
        } else if (data.body && typeof data.body === 'object') {
          list = data.body.conversations || data.body.Items || data.body.items || data.body;
        } else if (data.conversations && Array.isArray(data.conversations)) {
          list = data.conversations;
        } else if (data.Items && Array.isArray(data.Items)) {
          list = data.Items;
        } else if (data.items && Array.isArray(data.items)) {
          list = data.items;
        } else if (Array.isArray(data)) {
          list = data;
        }
      }

      console.log('📥 [ChatService] Lista de conversaciones procesada:', JSON.stringify(list));

      if (Array.isArray(list) && list.length > 0) {
        console.log(`✅ [ChatService] Se encontraron ${list.length} conversaciones reales. Mapeando...`);
        
        return list.map((c: any) => {
          const id = c.user_id || c.phone_number || c.id || c.social_id || c.platform_id || '';
          let channel = c.channel || c.platform || 'whatsapp';
          // Normalize facebook name to messenger for React Native Client
          if (channel === 'facebook') channel = 'messenger';

          const participantName = c.user_data?.name || c.sender_name || c.name || id || 'Cliente';
          
          let lastMsg: ChatMessage | undefined = undefined;
          if (c.last_message) {
            let displayLastMessage = c.last_message;
            if (displayLastMessage) {
              const patterns = [/^\[imagen\]$/i, /^\[image\]$/i, /^imagen$/i, /^image$/i];
              if (patterns.some(p => p.test(displayLastMessage.trim()))) {
                displayLastMessage = '📷 Imagen';
              } else if ([/^\[audio\]$/i, /^audio$/i].some(p => p.test(displayLastMessage.trim()))) {
                displayLastMessage = '🎵 Audio / Nota de voz';
              } else if ([/^\[video\]$/i, /^video$/i].some(p => p.test(displayLastMessage.trim()))) {
                displayLastMessage = '🎥 Video';
              } else if ([/^\[documento?\]$/i, /^documento?$/i].some(p => p.test(displayLastMessage.trim()))) {
                displayLastMessage = '📄 Documento';
              }
            }

            lastMsg = {
              id: `last-${id}`,
              conversationId: id,
              sender: c.last_message_sender === 'user' ? 'client' : 'agent',
              senderName: c.last_message_sender === 'user' ? participantName : 'Agente',
              text: displayLastMessage,
              timestamp: c.last_message_time || c.received_at || c.timestamp || new Date().toISOString(),
              status: 'read',
              channel: channel as any
            };
          }

          // Highly robust avatar mapper supporting all possible key names from social channels (IG, WA, Messenger, Web)
          const avatarUrl = c.sender_profile_pic || 
                            c.profile_pic || 
                            c.avatar || 
                            c.picture || 
                            c.user_data?.profile_pic || 
                            c.user_data?.avatar || 
                            undefined;

          return {
            id,
            customerName: participantName,
            customerPhone: c.phone_number || c.user_id || '',
            customerAvatar: avatarUrl,
            unreadCount: c.unread_count || 0,
            channel: channel as any,
            status: c.status || (c.is_bot_paused ? 'pending' : 'open'),
            assignedAgent: c.assignedAgent || undefined,
            lastMessage: lastMsg,
            createdAt: c.created_at || c.timestamp || new Date().toISOString(),
            updatedAt: c.last_message_time || c.received_at || c.timestamp || new Date().toISOString()
          };
        });
      }

      console.warn('📡 [ChatService] Inbox vacío en API, sirviendo mocks locales.');
      return [...mockConversations];
    } catch (e) {
      console.warn('⚠️ [ChatService] Error de red en /chat/inbox. Sirviendo Mock local en su lugar:', e);
      return [...mockConversations];
    }
  },

  /**
   * 2. GET MESSAGE HISTORY
   * Resolves past thread for a specific conversation. Supports lazy loading.
   */
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    try {
      console.log(`📡 [ChatService] Solicitando historial de chat real para ${conversationId} en /chat/:id/history...`);
      const response = await apiClient.get(`${Env.API_URL}/chat/${conversationId}/history`);
      const data = response.data !== undefined ? response.data : response;
      
      let list: any[] = [];
      if (data) {
        if (typeof data.body === 'string') {
          try {
            const parsed = JSON.parse(data.body);
            list = parsed.messages || parsed.Items || parsed.items || parsed;
          } catch (e) {
            console.error('Error parsing Lambda body', e);
          }
        } else if (data.body && typeof data.body === 'object') {
          list = data.body.messages || data.body.Items || data.body.items || data.body;
        } else if (data.messages && Array.isArray(data.messages)) {
          list = data.messages;
        } else if (data.Items && Array.isArray(data.Items)) {
          list = data.Items;
        } else if (data.items && Array.isArray(data.items)) {
          list = data.items;
        } else if (Array.isArray(data)) {
          list = data;
        }
      }

      if (Array.isArray(list) && list.length > 0) {
        console.log(`✅ [ChatService] Historial cargado. ${list.length} mensajes encontrados. Mapeando con llaves únicas...`);
        return list.map((m: any) => ChatService.mapIncomingMessage(m, conversationId))
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      }
      
      return mockMessages[conversationId] || [];
    } catch (e) {
      console.warn(`⚠️ [ChatService] Error en /chat/${conversationId}/history, cargando mock:`, e);
      return mockMessages[conversationId] || [];
    }
  },

  /**
   * 3. SEND OUTBOUND MESSAGE
   * Fires the message to the customer's channel. Syncs to DB.
   */
  async sendMessage(
    conversationId: string, 
    text: string, 
    channel: ChatConversation['channel'],
    noteType: ChatMessage['noteType'] = 'normal'
  ): Promise<ChatMessage> {
    const payload = {
      message: text,
      channel,
      note_type: noteType,
      timestamp: new Date().toISOString()
    };
    
    try {
      console.log(`📡 [ChatService] Enviando mensaje a /chat/${conversationId}/reply...`);
      const response = await apiClient.post(`${Env.API_URL}/chat/${conversationId}/reply`, payload);
      const data = response.data !== undefined ? response.data : response;
      
      let result: any = null;
      if (data) {
        if (typeof data.body === 'string') {
          try {
            result = JSON.parse(data.body);
          } catch (e) {
            console.error('Error parsing Lambda body', e);
          }
        } else if (data.body && typeof data.body === 'object') {
          result = data.body;
        } else {
          result = data;
        }
      }

      if (result) {
        const target = result.message || result.data || result;
        return {
          id: target.uuid || target.id || result.id || `msg-sent-${Date.now()}`,
          conversationId: conversationId,
          sender: 'agent',
          senderName: target.sender_name || 'Agente',
          text: target.message_text || target.content || target.text || text,
          timestamp: target.received_at || target.timestamp || target.created_at || new Date().toISOString(),
          status: target.status || 'sent',
          channel: target.channel || channel,
          noteType: target.note_type || noteType
        };
      }
      
      throw new Error('Invalid API response structure');
    } catch (e) {
      console.warn('⚠️ [ChatService] Error al enviar a la API /reply, simulando éxito local:', e);
      
      const newMsg: ChatMessage = {
        id: `MSG-LOCAL-${Math.floor(Math.random() * 90000) + 10000}`,
        conversationId,
        sender: 'agent',
        senderName: 'Agente Local',
        text,
        timestamp: new Date().toISOString(),
        status: 'sent',
        channel,
        noteType
      };

      if (!mockMessages[conversationId]) {
        mockMessages[conversationId] = [];
      }
      mockMessages[conversationId].push(newMsg);

      const convIdx = mockConversations.findIndex(c => c.id === conversationId);
      if (convIdx !== -1) {
        mockConversations[convIdx].lastMessage = newMsg;
        mockConversations[convIdx].updatedAt = newMsg.timestamp;
      }

      return newMsg;
    }
  },

  /**
   * 4. ASSIGN CONVERSATION TO AGENT
   */
  async assignAgent(conversationId: string, agent: ChatAgent | null): Promise<boolean> {
    try {
      await apiClient.put(`${Env.API_URL}/chat/${conversationId}/assign`, { agentId: agent?.id });
      return true;
    } catch (e) {
      console.warn('⚠️ [ChatService] Error asignando agente local en fallback:', e);
      const idx = mockConversations.findIndex(c => c.id === conversationId);
      if (idx !== -1) {
        mockConversations[idx].assignedAgent = agent || undefined;
      }
      return true;
    }
  },

  /**
   * 5. CLOSE TICKET / CONVERSATION
   */
  async updateStatus(conversationId: string, status: ChatConversation['status']): Promise<boolean> {
    try {
      await apiClient.put(`${Env.API_URL}/chat/${conversationId}/status`, { status });
      return true;
    } catch (e) {
      console.warn(`⚠️ [ChatService] Error actualizando estado en /status local fallback:`, e);
      const idx = mockConversations.findIndex(c => c.id === conversationId);
      if (idx !== -1) {
        mockConversations[idx].status = status;
      }
      return true;
    }
  },

  /**
   * 6. IASTOCK COPILOT: AI RESPONSE SUGGESTION
   */
  async getAiResponseSuggestion(conversationId: string, clientMessage: string): Promise<string> {
    try {
      console.log('🤖 [IAStock Copilot] Solicitando sugerencia inteligente a /conversations/:id/smart-reply...');
      
      try {
        const response = await apiClient.post(`${Env.API_URL}/conversations/${conversationId}/smart-reply`, {});
        const data = response.data !== undefined ? response.data : response;
        
        let result: any = null;
        if (data) {
          if (typeof data.body === 'string') {
            try {
              result = JSON.parse(data.body);
            } catch (e) {
              console.error('Error parsing AI Lambda body', e);
            }
          } else if (data.body && typeof data.body === 'object') {
            result = data.body;
          } else {
            result = data;
          }
        }

        const suggestions = result?.suggestions || result?.reply || result?.text;
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          return suggestions[0];
        } else if (typeof suggestions === 'string') {
          return suggestions;
        }
      } catch (apiError) {
        console.warn('📡 [IAStock Copilot] Endpoint smart-reply no responde, recurriendo al procesamiento local.');
      }

      await new Promise(resolve => setTimeout(resolve, 800));

      const textNormalized = clientMessage.toLowerCase();
      
      if (textNormalized.includes('pollo') || textNormalized.includes('pechuga')) {
        return '¡Hola! Claro que sí. En nuestro inventario contamos con "Pechuga de Pollo Fileteada Premium". Actualmente nos quedan porciones frescas disponibles y el precio es de $14,500 COP por kg. ¿Te gustaría que te reservemos tu pedido de una vez?';
      }
      
      if (textNormalized.includes('hamburguesa') || textNormalized.includes('combo')) {
        return '¡Hola! Sí, contamos con el Combo de Hamburguesa Especial en nuestro menú del día. Incluye papas rústicas y bebida gaseosa por solo $22,000 COP. ¿Deseas ordenar tu combo sencillo o prefieres adicionar queso o tocineta crujiente?';
      }

      if (textNormalized.includes('wifi') || textNormalized.includes('contraseña')) {
        return '¡Hola! Claro que sí, con mucho gusto. La red Wi-Fi de nuestro restaurante es "IAStock_Gastro_Glow" y la contraseña es "IamIAStock2026". ¡Que tengas una excelente e inteligente experiencia con nosotros!';
      }

      if (textNormalized.includes('domicilio') || textNormalized.includes('entrega') || textNormalized.includes('laureles')) {
        return '¡Hola! Con gusto atendemos despachos. Hacemos domicilios a todo el barrio Laureles y zonas aledañas. El recargo del envío es de $3,500 COP, o es completamente gratis si tu orden supera los $50,000 COP. ¿Qué te gustaría ordenar hoy?';
      }

      return '¡Hola! Gracias por comunicarte con IAStock. Recibimos tu mensaje y estamos listos para atenderte en lo que necesites. ¿Te gustaría conocer el menú del día, verificar disponibilidad de algún plato o hacer una reservación?';
    } catch (e) {
      console.error('Error in IAStock Copilot suggestion:', e);
      return '¡Hola! Nos alegra saludarte. En un momento uno de nuestros asesores te atenderá personalmente para brindarte toda la información que necesitas.';
    }
  }
};
