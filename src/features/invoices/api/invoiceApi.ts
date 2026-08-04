import { apiClient } from '../../../services/api/client';

// Mirrors InvoiceStatus enum (Invoicing.Domain) — serialized via .ToString(), so these are
// PascalCase on the wire, not camelCase like other BE string fields.
export type InvoiceStatus =
  | 'Draft'
  | 'PendingIssuance'
  | 'Issued'
  | 'Failed'
  | 'Adjusted'
  | 'Cancelled';

export interface InvoiceSummaryDto {
  id: string;
  orderId: string;
  restaurantId: string;
  status: InvoiceStatus;
  number: string | null;
  taxAuthorityCode: string | null;
  issuedAt: string | null;
  total: number;
  createdAt: string;
}

export interface InvoiceLineDto {
  productName: string;
  quantity: number;
  unitPrice: number;
  vatRateCode: string;
  vatRatePercent: number;
  lineSubtotal: number;
  lineVatAmount: number;
  lineTotal: number;
}

export interface InvoiceDto {
  id: string;
  orderId: string;
  restaurantId: string;
  status: InvoiceStatus;
  buyerTaxCode: string;
  buyerLegalName: string;
  buyerAddress: string | null;
  buyerEmail: string | null;
  serial: string | null;
  number: string | null;
  taxAuthorityCode: string | null;
  lookupUrl: string | null;
  issuedAt: string | null;
  subTotal: number;
  vatAmount: number;
  total: number;
  retryCount: number;
  createdAt: string;
  lines: InvoiceLineDto[];
}

export interface InvoiceListResult {
  items: InvoiceSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
}

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  Draft: 'Đang khởi tạo',
  PendingIssuance: 'Chờ phát hành',
  Issued: 'Đã phát hành',
  Failed: 'Phát hành thất bại',
  Adjusted: 'Đã điều chỉnh',
  Cancelled: 'Đã huỷ',
};

export const invoiceApi = {
  async getInvoices(params?: { page?: number; pageSize?: number }): Promise<InvoiceListResult> {
    const { data } = await apiClient.get<InvoiceListResult>('/api/v1/invoices', { params });
    return data;
  },

  async getInvoiceById(invoiceId: string): Promise<InvoiceDto> {
    const { data } = await apiClient.get<InvoiceDto>(`/api/v1/invoices/${invoiceId}`);
    return data;
  },
};
