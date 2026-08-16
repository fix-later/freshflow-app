import { apiClient } from '../../../services/api/client';

export type OrderClaimStatus = 'Submitted' | 'Approved' | 'Rejected' | 'submitted' | 'approved' | 'rejected';

export interface OrderClaimDto {
  claimId: string;
  orderId: string;
  restaurantId: string;
  amount: number;
  reason: string;
  status: OrderClaimStatus;
  createdBy: string;
  createdAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  decisionNote?: string | null;
  refundTransactionId?: string | null;
  updatedAt: string;
}

export interface FileClaimPayload {
  amount: number;
  reason: string;
}

export interface ListClaimsParams {
  restaurantId?: string;
  status?: string;
  cursor?: string;
  pageSize?: number;
}

export interface ClaimsPagedResponse {
  data: OrderClaimDto[];
  meta: {
    pageSize: number;
    nextCursor: string | null;
  };
}

export const CLAIM_STATUS_LABEL: Record<string, string> = {
  Submitted: 'Đang chờ duyệt',
  submitted: 'Đang chờ duyệt',
  Approved: 'Đã duyệt đền bù',
  approved: 'Đã duyệt đền bù',
  Rejected: 'Từ chối khiếu nại',
  rejected: 'Từ chối khiếu nại',
};

export const CLAIM_STATUS_COLOR: Record<string, string> = {
  Submitted: '#F59E0B',
  submitted: '#F59E0B',
  Approved: '#10B981',
  approved: '#10B981',
  Rejected: '#EF4444',
  rejected: '#EF4444',
};

export const claimsApi = {
  /** POST /api/v1/orders/{orderId}/claims — File a new claim for an order */
  async fileClaim(orderId: string, payload: FileClaimPayload): Promise<OrderClaimDto> {
    const { data } = await apiClient.post<OrderClaimDto>(`/api/v1/orders/${orderId}/claims`, payload);
    return data;
  },

  /** GET /api/v1/claims — List claims for the authenticated restaurant */
  async listClaims(params?: ListClaimsParams): Promise<{ items: OrderClaimDto[]; pageSize: number; nextCursor: string | null }> {
    const { data } = await apiClient.get<any>('/api/v1/claims', { params });
    // BE returns ApiResponse.OkPaged format: data: items, meta: { pageSize, nextCursor }
    if (data && Array.isArray(data.data)) {
      return {
        items: data.data,
        pageSize: data.meta?.pageSize ?? 50,
        nextCursor: data.meta?.nextCursor ?? null,
      };
    }
    // Fallback if data is raw array or object
    if (Array.isArray(data)) {
      return { items: data, pageSize: data.length, nextCursor: null };
    }
    return { items: data?.items ?? [], pageSize: 50, nextCursor: null };
  },

  /** GET /api/v1/claims/{claimId} — Get detail of a specific claim */
  async getClaimById(claimId: string): Promise<OrderClaimDto> {
    const { data } = await apiClient.get<OrderClaimDto>(`/api/v1/claims/${claimId}`);
    return data;
  },
};
