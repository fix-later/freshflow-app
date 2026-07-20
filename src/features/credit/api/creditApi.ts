import { apiClient, getCursorPaged } from '../../../services/api/client';

export interface CreditDto {
  restaurantId: string;
  creditLimit: number;
  outstandingBalance: number;
  availableCredit: number;
  updatedAt: string | null;
}

export interface CreditTransactionDto {
  id: string;
  restaurantId: string;
  type: string;
  amount: number;
  balanceAfter: number;
  orderId: string | null;
  reference: string | null;
  note: string | null;
  paymentMethod: string | null;
  createdAt: string;
}

export interface CreditTransactionMeta {
  nextCursor: string | null;
  pageSize: number;
}

export interface CreditStatementDto {
  id: string;
  restaurantId: string;
  year: number;
  month: number;
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  status: 'open' | 'closed';
  generatedAt: string;
}

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
  ): Promise<{ data: CreditStatementDto[]; meta: CreditTransactionMeta }> {
    return getCursorPaged<CreditStatementDto>(
      `/api/v1/restaurants/${restaurantId}/credit/statements`,
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
};
