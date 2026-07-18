/**
 * DOMAIN LAYER: Chat Entities & Interfaces
 * -----------------------------------------
 * Pure structural definitions representing the business rules and data models
 * of the IAStock Omnichannel Chat platform.
 */

export type ChannelType = 'whatsapp' | 'messenger' | 'instagram' | 'web';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export type ConversationStatus = 'open' | 'closed' | 'pending';

export type AttachmentType = 'image' | 'video' | 'audio' | 'document';

export interface ChatAttachment {
  url: string;
  type: AttachmentType;
  name?: string;
  sizeBytes?: number;
}

export interface ChatAgent {
  id: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'cashier' | 'waiter' | 'agent';
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: 'client' | 'agent' | 'system';
  senderName?: string;
  text: string;
  timestamp: string; // ISO String
  status: MessageStatus;
  channel: ChannelType;
  attachment?: ChatAttachment;
  isAiGenerated?: boolean;
  
  /**
   * Internal note/whisper is visible only to store staff.
   * Useful for coordinating food prep, checking prices, or discuss kitchen situations in private.
   */
  noteType?: 'whisper' | 'normal';
}

export interface ChatConversation {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerAvatar?: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  channel: ChannelType;
  assignedAgent?: ChatAgent;
  status: ConversationStatus;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}

export interface QuickTemplate {
  id: string;
  title: string;
  text: string;
  category: 'inventory' | 'sales' | 'general' | 'greetings';
}
