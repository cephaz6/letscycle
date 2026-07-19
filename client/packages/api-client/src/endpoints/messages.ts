import { http } from '../http';

export type ConversationStatus = 'active' | 'archived';

export interface Conversation {
  id: string;
  listingId: string | null;
  buyerId: string;
  sellerId: string;
  status: ConversationStatus;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  attachments: string[];
  readAt: string | null;
  createdAt: string;
}

interface MessagesPage {
  items: Message[];
  total: number;
  limit: number;
  offset: number;
}

export const messagesApi = {
  /** All conversations for the signed-in user. */
  listConversations(): Promise<Conversation[]> {
    return http.get<Conversation[]>('/conversations');
  },

  /** Start (or reuse) a conversation about a listing. */
  startConversation(listingId: string): Promise<Conversation> {
    return http.post<Conversation>('/conversations', { json: { listingId } });
  },

  /** Messages in a conversation, oldest first (opening also marks read). */
  async getMessages(
    conversationId: string,
    limit = 50,
    offset = 0,
  ): Promise<Message[]> {
    const page = await http.get<MessagesPage>(
      `/conversations/${conversationId}/messages`,
      { query: { limit, offset } },
    );
    // API returns newest-first; a thread reads oldest → newest.
    return page.items.slice().reverse();
  },

  /** Send a message into a conversation. */
  sendMessage(conversationId: string, body: string): Promise<Message> {
    return http.post<Message>(`/conversations/${conversationId}/messages`, {
      json: { body },
    });
  },
};
