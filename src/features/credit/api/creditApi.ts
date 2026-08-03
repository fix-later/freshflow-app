import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { apiClient, getCursorPaged, TOKEN_KEY } from '../../../services/api/client';
import { ENV } from '../../../config/env';
import type {
  CreditDto,
  CreditTransactionDto,
  CreditTransactionMeta,
  CreditStatementSummaryDto,
  CreditStatementDto,
  CreditStatementLineDto,
} from '../../../types/api.types';

export type {
  CreditDto,
  CreditTransactionDto,
  CreditTransactionMeta,
  CreditStatementSummaryDto,
  CreditStatementDto,
  CreditStatementLineDto,
};

export const TRANSACTION_TYPE_LABEL: Record<string, string> = {
  charge: 'Ghi nợ đơn hàng',
  settlement: 'Thanh toán công nợ',
  refund: 'Hoàn tiền',
  adjustment: 'Điều chỉnh',
};

export const TRANSACTION_TYPE_COLOR: Record<string, string> = {
  charge: '#EF4444',
  settlement: '#3B82F6',
  refund: '#22C55E',
  adjustment: '#F59E0B',
};

export function getTransactionTypeLabel(type?: string | null): string {
  if (!type) return 'Khác';
  const key = type.toLowerCase();
  return TRANSACTION_TYPE_LABEL[key] ?? type;
}

export function getTransactionTypeColor(type?: string | null): string {
  if (!type) return '#6B7280';
  const key = type.toLowerCase();
  return TRANSACTION_TYPE_COLOR[key] ?? '#6B7280';
}

export const creditApi = {
  async getCredit(restaurantId: string): Promise<CreditDto> {
    const { data } = await apiClient.get<CreditDto>(
      `/api/v1/restaurants/${restaurantId}/credit`,
    );
    return data;
  },

  async getTransactions(
    restaurantId: string,
    params?: { cursor?: string; pageSize?: number; from?: string; to?: string },
  ): Promise<{ data: CreditTransactionDto[]; meta: CreditTransactionMeta }> {
    return getCursorPaged<CreditTransactionDto>(
      `/api/v1/restaurants/${restaurantId}/credit/transactions`,
      { params },
    );
  },

  async getStatements(
    restaurantId: string,
    params?: { cursor?: string; pageSize?: number },
  ): Promise<{ data: CreditStatementSummaryDto[]; meta: CreditTransactionMeta }> {
    return getCursorPaged<CreditStatementSummaryDto>(
      `/api/v1/restaurants/${restaurantId}/credit/statements`,
      { params },
    );
  },

  async generateStatement(
    restaurantId: string,
    year: number,
    month: number,
  ): Promise<CreditStatementDto> {
    const { data } = await apiClient.post<CreditStatementDto>(
      `/api/v1/restaurants/${restaurantId}/credit/statements/generate`,
      { year, month },
    );
    return data;
  },

  async getStatementById(
    restaurantId: string,
    statementId: string,
  ): Promise<CreditStatementDto> {
    const { data } = await apiClient.get<CreditStatementDto>(
      `/api/v1/restaurants/${restaurantId}/credit/statements/${statementId}`,
    );
    return data;
  },

  async getStatementPdf(
    restaurantId: string,
    statementId: string,
  ): Promise<ArrayBuffer> {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const { data } = await axios.get<ArrayBuffer>(
      `${ENV.API_URL}/api/v1/restaurants/${restaurantId}/credit/statements/${statementId}/pdf`,
      {
        responseType: 'arraybuffer',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    return data;
  },
};
