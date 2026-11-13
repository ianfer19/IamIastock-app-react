import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../core/store/store';
import { ChatService } from '../../infrastructure/services/chatService';
import { ChatConversation, ChatMessage, ChatAgent } from '../../domain/entities/Chat';
import * as Haptics from 'expo-haptics';
import {
  setLoadingConversations,
  setLoadingMessages,
  setError,
  setConversations,
  setActiveConversationId,
  setMessagesForConversation,
  addSentMessage,
  updateConversationStatus,
  updateConversationAgent,
} from '../../core/store/slices/chatSlice';

/**
 * PRESENTATION LAYER: Omnichannel Chat Hook
 * -----------------------------------------
 * Consolidates all state accesses, caching strategies, optimistic updates,
 * tactile feedbacks, and LLM integrations. Encapsulates Redux and network lifecycle.
 */

export const useOmniChannelChat = () => {
  const dispatch = useAppDispatch();

  // Redux Selectors
  const conversations = useAppSelector((state) => state.chat.conversations);
  const activeConversationId = useAppSelector((state) => state.chat.activeConversationId);
  const loadingConversations = useAppSelector((state) => state.chat.loadingConversations);
  const loadingMessages = useAppSelector((state) => state.chat.loadingMessages);
  const error = useAppSelector((state) => state.chat.error);
  
  // Auth Selectors (to get active agent info)
  const authState = useAppSelector((state) => state.auth);
  const agentRole: ChatAgent['role'] = authState.role === 'admin' || authState.role === 'owner'
    ? 'admin'
    : authState.role === 'waiter'
      ? 'waiter'
      : 'agent';
  const currentAgent: ChatAgent | null = authState.isAuthenticated 
    ? {
        id: authState.user?.id || 'AGENT-101',
        name: authState.user?.name || authState.user?.nombre || authState.user?.email?.split('@')[0] || 'Asesor IAStock',
        role: agentRole,
      }
    : null;

  // Active messages thread
  const messages = useAppSelector((state) => 
    activeConversationId ? state.chat.messagesByConversation[activeConversationId] || [] : []
  );

  /**
   * 1. LOAD ALL CONVERSATIONS
   */
  const loadConversations = useCallback(async () => {
    dispatch(setLoadingConversations(true));
    try {
      const data = await ChatService.getConversations();
      dispatch(setConversations(data));
    } catch (err: any) {
      dispatch(setError(err?.message || 'Error al cargar conversaciones'));
    }
  }, [dispatch]);

  /**
   * 2. CHOOSE/ROUT ACTIVE CONVERSATION
   */
  const selectConversation = useCallback(async (conversationId: string | null) => {
    dispatch(setActiveConversationId(conversationId));
    if (!conversationId) return;

    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    dispatch(setLoadingMessages(true));
    try {
      const chatHistory = await ChatService.getMessages(conversationId);
      dispatch(setMessagesForConversation({ conversationId, messages: chatHistory }));
    } catch (err: any) {
      dispatch(setError(err?.message || 'Error al cargar mensajes'));
    }
  }, [dispatch]);

  /**
   * 3. SEND TEXT MESSAGE (Optimistic + Tactile)
   */
  const sendTextMessage = useCallback(async (
    text: string, 
    noteType: ChatMessage['noteType'] = 'normal'
  ) => {
    if (!activeConversationId) return;

    const activeConv = conversations.find(c => c.id === activeConversationId);
    if (!activeConv) return;

    // Instantly play soft haptic click
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Dynamic ID for optimistic update
    const tempId = `TEMP-MSG-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      conversationId: activeConversationId,
      sender: 'agent',
      senderName: currentAgent?.name || 'Asesor',
      text,
      timestamp: new Date().toISOString(),
      status: 'sent',
      channel: activeConv.channel,
      noteType
    };

    // 1. Optimistic render
    dispatch(addSentMessage(optimisticMessage));

    try {
      // 2. Real API dispatch
      const savedMessage = await ChatService.sendMessage(
        activeConversationId, 
        text, 
        activeConv.channel,
        noteType
      );

      // Reload thread from backend to match server IDs and delivery ticks
      const freshHistory = await ChatService.getMessages(activeConversationId);
      dispatch(setMessagesForConversation({ 
        conversationId: activeConversationId, 
        messages: freshHistory 
      }));
      
      // Haptics confirmation
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Failed to send omnichannel message:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [activeConversationId, conversations, currentAgent, dispatch]);

  /**
   * 4. SELF-ASSIGN TICKET
   */
  const assignToMe = useCallback(async (conversationId: string) => {
    if (!currentAgent) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    dispatch(updateConversationAgent({ conversationId, agent: currentAgent }));
    
    try {
      await ChatService.assignAgent(conversationId, currentAgent);
    } catch (err) {
      console.error('Failed to assign ticket:', err);
    }
  }, [currentAgent, dispatch]);

  /**
   * 5. CLOSE OR RESOLVE TICKET
   */
  const closeTicket = useCallback(async (conversationId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    dispatch(updateConversationStatus({ conversationId, status: 'closed' }));
    
    try {
      await ChatService.updateStatus(conversationId, 'closed');
    } catch (err) {
      console.error('Failed to close ticket:', err);
    }
  }, [dispatch]);

  /**
   * 6. OPEN OR RE-ACTIVATE TICKET
   */
  const reopenTicket = useCallback(async (conversationId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    dispatch(updateConversationStatus({ conversationId, status: 'open' }));
    
    try {
      await ChatService.updateStatus(conversationId, 'open');
    } catch (err) {
      console.error('Failed to reopen ticket:', err);
    }
  }, [dispatch]);

  /**
   * 7. GET SMART SUGGESTION FROM CO-PILOT
   */
  const generateAiReply = useCallback(async (lastMessageText: string): Promise<string> => {
    if (!activeConversationId) return '';
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const draft = await ChatService.getAiResponseSuggestion(activeConversationId, lastMessageText);
      return draft;
    } catch (err) {
      console.error('Failed to query IAStock Copilot:', err);
      return '';
    }
  }, [activeConversationId]);

  return {
    conversations,
    messages,
    activeConversationId,
    loadingConversations,
    loadingMessages,
    error,
    currentAgent,
    
    loadConversations,
    selectConversation,
    sendTextMessage,
    assignToMe,
    closeTicket,
    reopenTicket,
    generateAiReply,
  };
};
