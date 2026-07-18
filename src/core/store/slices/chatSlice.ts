import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatConversation, ChatMessage } from '../../../domain/entities/Chat';

/**
 * STATE LAYER: Omnichannel Chat Slice
 * -----------------------------------
 * Manages conversation lists, unread counters, assigned channels,
 * and maintains an active message history map for instant O(1) rendering.
 */

interface ChatState {
  conversations: ChatConversation[];
  messagesByConversation: { [conversationId: string]: ChatMessage[] };
  activeConversationId: string | null;
  loadingConversations: boolean;
  loadingMessages: boolean;
  error: string | null;
}

const initialState: ChatState = {
  conversations: [],
  messagesByConversation: {},
  activeConversationId: null,
  loadingConversations: false,
  loadingMessages: false,
  error: null,
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setLoadingConversations: (state, action: PayloadAction<boolean>) => {
      state.loadingConversations = action.payload;
    },
    
    setLoadingMessages: (state, action: PayloadAction<boolean>) => {
      state.loadingMessages = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    setConversations: (state, action: PayloadAction<ChatConversation[]>) => {
      // Sort conversations so that the one with the newest updatedAt is at the top
      state.conversations = action.payload.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      state.loadingConversations = false;
    },
    
    setActiveConversationId: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
      if (action.payload) {
        // Clear unreadCount for the selected conversation locally
        const idx = state.conversations.findIndex(c => c.id === action.payload);
        if (idx !== -1) {
          state.conversations[idx].unreadCount = 0;
        }
      }
    },
    
    setMessagesForConversation: (
      state, 
      action: PayloadAction<{ conversationId: string; messages: ChatMessage[] }>
    ) => {
      const { conversationId, messages } = action.payload;
      // Sort messages chronologically (oldest to newest)
      state.messagesByConversation[conversationId] = [...messages].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      state.loadingMessages = false;
    },
    
    /**
     * CORE ACTION: receiveMessageFromSocket
     * Called directly by socketMiddleware.ts whenever a 'new_message' event
     * is captured from the AWS IoT or API Gateway WebSocket.
     */
    receiveMessageFromSocket: (state, action: PayloadAction<ChatMessage>) => {
      const message = action.payload;
      const { conversationId } = message;
      
      console.log('🔄 [Redux ChatSlice] Procesando mensaje en tiempo real:', message.id);

      // 1. Append message to conversation history map
      if (!state.messagesByConversation[conversationId]) {
        state.messagesByConversation[conversationId] = [];
      }
      
      // Avoid duplicate socket messages
      const exists = state.messagesByConversation[conversationId].some(m => m.id === message.id);
      if (!exists) {
        state.messagesByConversation[conversationId].push(message);
        // Sort just in case socket arrives out of order
        state.messagesByConversation[conversationId].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }

      // 2. Update conversation record in list, or draft one if missing
      const convIdx = state.conversations.findIndex(c => c.id === conversationId);
      
      if (convIdx !== -1) {
        const conv = state.conversations[convIdx];
        conv.lastMessage = message;
        conv.updatedAt = message.timestamp;
        
        // Only increment unreadCount if the conversation is not actively opened
        if (state.activeConversationId !== conversationId) {
          conv.unreadCount += 1;
        }
        
        // Re-sort conversation list so it bubbles to the top
        state.conversations.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      } else {
        // Fallback: If conversation is not in lists (e.g. new customer),
        // we can create a temporary card. The Hook will trigger a full refetch if needed.
        const newConv: ChatConversation = {
          id: conversationId,
          customerName: message.senderName || 'Cliente Nuevo',
          unreadCount: state.activeConversationId === conversationId ? 0 : 1,
          channel: message.channel,
          status: 'open',
          createdAt: message.timestamp,
          updatedAt: message.timestamp,
          lastMessage: message,
        };
        state.conversations.unshift(newConv);
      }
    },
    
    /**
     * CORE ACTION: addSentMessage
     * Instantly appends a sent message locally to ensure absolute responsiveness (optimistic updates).
     */
    addSentMessage: (state, action: PayloadAction<ChatMessage>) => {
      const message = action.payload;
      const { conversationId } = message;
      
      if (!state.messagesByConversation[conversationId]) {
        state.messagesByConversation[conversationId] = [];
      }
      
      state.messagesByConversation[conversationId].push(message);
      
      // Update last message in active list
      const idx = state.conversations.findIndex(c => c.id === conversationId);
      if (idx !== -1) {
        state.conversations[idx].lastMessage = message;
        state.conversations[idx].updatedAt = message.timestamp;
        
        // Re-sort conversation list
        state.conversations.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }
    },
    
    updateConversationStatus: (
      state, 
      action: PayloadAction<{ conversationId: string; status: ChatConversation['status'] }>
    ) => {
      const { conversationId, status } = action.payload;
      const idx = state.conversations.findIndex(c => c.id === conversationId);
      if (idx !== -1) {
        state.conversations[idx].status = status;
      }
    },
    
    updateConversationAgent: (
      state, 
      action: PayloadAction<{ conversationId: string; agent: ChatConversation['assignedAgent'] }>
    ) => {
      const { conversationId, agent } = action.payload;
      const idx = state.conversations.findIndex(c => c.id === conversationId);
      if (idx !== -1) {
        state.conversations[idx].assignedAgent = agent;
      }
    },
  },
});

export const {
  setLoadingConversations,
  setLoadingMessages,
  setError,
  setConversations,
  setActiveConversationId,
  setMessagesForConversation,
  receiveMessageFromSocket,
  addSentMessage,
  updateConversationStatus,
  updateConversationAgent,
} = chatSlice.actions;

export default chatSlice.reducer;
