import type { Uuid } from '../../shared/types/common.js';

export type ConversationStatus = 'active' | 'archived';

export interface ConversationView {
  id: Uuid;
  listingId: Uuid | null;
  buyerId: Uuid;
  sellerId: Uuid;
  status: ConversationStatus;
  lastMessageAt: Date | null;
  createdAt: Date;
}

// A conversation in the caller's list, with their unread message count.
export interface ConversationListItem extends ConversationView {
  unreadCount: number;
}

export interface MessageView {
  id: Uuid;
  conversationId: Uuid;
  senderId: Uuid;
  body: string;
  attachments: string[];
  readAt: Date | null;
  createdAt: Date;
}

export interface SendMessageInput {
  body: string;
  attachments?: string[];
}
