import { apiClient } from '../../../services/api/client';
import type { CloudinaryUploadSignature } from '../../../services/cloudinaryUpload';

export type ProcurementTaskStatus =
  | 'Built'
  | 'Manifested'
  | 'Purchasing'
  | 'HandedOff'
  | 'Cancelled';

export interface ProcurementTaskItemDto {
  marketProductId: string;
  productNameSnapshot: string;
  totalQuantity: number;
  referenceUnitPrice: number | null;
  actualQuantity: number | null;
  actualUnitPrice: number | null;
  purchasedAt: string | null;
}

export interface ProcurementTaskMemberDto {
  orderId: string;
  status: string;
}

export interface ProcurementExceptionDto {
  id: string;
  marketProductId: string;
  type: string;
  reportedQuantity: number;
  note: string | null;
  proofImageUrl: string | null;
  reportedByUserId: string;
  reportedAt: string;
}

export interface MarketProcurementTaskDto {
  id: string;
  batchDate: string;
  marketId: string;
  status: ProcurementTaskStatus;
  manifestedAt: string | null;
  assignedAgentUserId: string | null;
  assignedAt: string | null;
  handedOffAt: string | null;
  hubId: string | null;
  totalItemCount: number;
  items: ProcurementTaskItemDto[];
  members: ProcurementTaskMemberDto[];
  exceptions: ProcurementExceptionDto[];
  isCompleted: boolean;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

interface ProcurementTaskPageDto {
  batches: MarketProcurementTaskDto[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
}

const PAGE_SIZE = 100;

export function getVietnamDate(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export type ProcurementExceptionType =
  | 'Unavailable'
  | 'Shortfall'
  | 'PriceDiscrepancy'
  | 'Damaged';

export interface ReportProcurementExceptionRequest {
  marketProductId: string;
  type: ProcurementExceptionType;
  reportedQuantity: number;
  note: string | null;
  proofImageUrl: string | null;
}

function datePlusDays(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export const marketProcurementApi = {
  async getTasksInNextSevenDays(fromDate = getVietnamDate()): Promise<MarketProcurementTaskDto[]> {
    const allTasks: MarketProcurementTaskDto[] = [];
    let page = 1;
    let total = 0;

    do {
      const { data } = await apiClient.get<ProcurementTaskPageDto>('/api/v1/procurement/tasks', {
        params: { page, pageSize: PAGE_SIZE },
      });
      if (data.batches.length === 0) break;
      allTasks.push(...data.batches);
      total = data.pagination.total;
      page += 1;
    } while (allTasks.length < total);

    const toDate = datePlusDays(fromDate, 6);
    return allTasks
      .filter((task) => (
        task.batchDate >= fromDate
        && task.batchDate <= toDate
        && task.status !== 'Cancelled'
      ))
      .sort((left, right) => (
        left.batchDate.localeCompare(right.batchDate)
        || left.id.localeCompare(right.id)
      ));
  },

  async getTask(batchId: string): Promise<MarketProcurementTaskDto> {
    const { data } = await apiClient.get<MarketProcurementTaskDto>(
      `/api/v1/procurement/tasks/${batchId}`,
    );
    return data;
  },

  async confirmPurchase(
    batchId: string,
    lines: Array<{
      marketProductId: string;
      actualQuantity: number;
      actualUnitPrice: number;
    }>,
  ): Promise<MarketProcurementTaskDto> {
    const { data } = await apiClient.patch<MarketProcurementTaskDto>(
      `/api/v1/procurement/tasks/${batchId}/purchase`,
      { lines },
    );
    return data;
  },

  /** Signed Cloudinary upload payload scoped to the authenticated agent's batch. */
  async getExceptionProofUploadSignature(
    batchId: string,
  ): Promise<CloudinaryUploadSignature> {
    const { data } = await apiClient.post<CloudinaryUploadSignature>(
      `/api/v1/procurement/tasks/${batchId}/exceptions/upload-signature`,
    );
    return data;
  },

  /** Persist a procurement exception and attach its already-uploaded evidence URL. */
  async reportException(
    batchId: string,
    request: ReportProcurementExceptionRequest,
  ): Promise<MarketProcurementTaskDto> {
    const { data } = await apiClient.post<MarketProcurementTaskDto>(
      `/api/v1/procurement/tasks/${batchId}/exceptions`,
      request,
    );
    return data;
  },

  /**
   * Complete the agent-to-hub handover. The Hub is resolved by BE; no request body is sent.
   * BE currently has no handover-proof upload signature or proofImageUrl field, so an image
   * cannot be safely attached to this transition. Procurement exception evidence is supported
   * separately by getExceptionProofUploadSignature + reportException above.
   */
  async handover(batchId: string): Promise<MarketProcurementTaskDto> {
    const { data } = await apiClient.patch<MarketProcurementTaskDto>(
      `/api/v1/procurement/tasks/${batchId}/handover`,
    );
    return data;
  },
};
