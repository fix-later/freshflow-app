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
    // Required by BE's preview_confirmation/confirm_order tools (AssistantChatRequest.DeliveryAddressId) —
    // never accepted from the LLM, so the client must supply it whenever an address is known.
    deliveryAddressId?: string | null;
    confirmOrderId?: string;
  }): Promise<AssistantChatResponse> {
    // Overrides apiClient's global 10s timeout — the orchestrator can hop the LLM up to
    // 6 times per turn (each with its own 60s ceiling server-side), so 10s aborts almost
    // every real reply before it arrives. Without a `.response`, the axios interceptor's
    // catch-all folds this into a plain "Không có kết nối mạng" error (no status/code),
    // which is why every failure here looked identical regardless of what actually happened.
    const { data } = await apiClient.post<AssistantChatResponse>(
      '/api/v1/assistant/chat',
      payload,
      { timeout: 60_000 },
    );
    return data;
  },
};
