import { apiClient } from '../../../services/api/client';

export interface CreditDto {
  restaurantId: string;
  creditLimit: number;
  usedCredit: number;
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
  debit: 'Sử dụng tín dụng',
  credit: 'Hoàn tiền',
  settlement: 'Thanh toán công nợ',
  adjustment: 'Điều chỉnh',
};

export const TRANSACTION_TYPE_COLOR: Record<string, string> = {
  debit: '#EF4444',
  credit: '#22C55E',
  settlement: '#3B82F6',
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
    params?: { cursor?: string; pageSize?: number },
  ): Promise<{ data: CreditTransactionDto[]; meta: CreditTransactionMeta }> {
    const { data } = await apiClient.get<{ data: CreditTransactionDto[]; meta: CreditTransactionMeta }>(
      `/api/v1/restaurants/${restaurantId}/credit/transactions`,
      { params },
    );
    return data;
  },

  async getStatements(
    restaurantId: string,
  ): Promise<{ data: CreditStatementDto[] }> {
    const { data } = await apiClient.get<{ data: CreditStatementDto[] }>(
      `/api/v1/restaurants/${restaurantId}/credit/statements`,
    );
    return data;
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
