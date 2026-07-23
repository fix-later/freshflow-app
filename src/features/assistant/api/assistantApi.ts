import { apiClient } from '../../../services/api/client';

export interface PendingAssistantConfirmation {
  orderId: string;
  previewJson: string;
}

export interface AssistantChatResponse {
  reply: string;
  sessionId: string;
  pendingConfirmation: PendingAssistantConfirmation | null;
  draftOrderId: string | null;
}

export const assistantApi = {
  async chat(payload: {
    sessionId: string;
    message: string;
    marketId?: string | null;
    confirmOrderId?: string;
  }): Promise<AssistantChatResponse> {
    const { data } = await apiClient.post<AssistantChatResponse>(
      '/api/v1/assistant/chat',
      payload,
    );
    return data;
  },
};
