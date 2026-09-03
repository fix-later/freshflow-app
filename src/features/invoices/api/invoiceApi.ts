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
  providerName: string | null;
  isSandbox: boolean;
  createdAt: string;
}

export interface InvoiceLineDto {
  productName: string;
  unit: string | null;
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
  // Machine error code from the last issuance attempt — non-null on 'Failed' and, while a
  // retry is still pending, also on 'PendingIssuance' (see MarkAwaitingBuyerInfo/MarkIssuanceFailed).
  errorReason: string | null;
  providerName: string | null;
  isSandbox: boolean;
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
  async getInvoices(
    params?: { page?: number; pageSize?: number; status?: InvoiceStatus },
  ): Promise<InvoiceListResult> {
    const { data } = await apiClient.get<InvoiceListResult>('/api/v1/invoices', { params });
    return data;
  },

  async getInvoiceById(invoiceId: string): Promise<InvoiceDto> {
    const { data } = await apiClient.get<InvoiceDto>(`/api/v1/invoices/${invoiceId}`);
    return data;
  },

  async getInvoicePdf(invoiceId: string): Promise<ArrayBuffer> {
    const { data } = await apiClient.get<ArrayBuffer>(`/api/v1/invoices/${invoiceId}/pdf`, {
      responseType: 'arraybuffer',
      headers: { Accept: 'application/pdf' },
    });
    return data;
  },

  async getInvoiceByOrderId(orderId: string): Promise<InvoiceSummaryDto | null> {
    const pageSize = 100;
    let page = 1;

    while (true) {
      const { data } = await apiClient.get<InvoiceListResult>('/api/v1/invoices', {
        params: { page, pageSize },
      });
      const invoice = data.items.find((item) => item.orderId === orderId);
      if (invoice) return invoice;

      if (data.items.length === 0 || page * pageSize >= data.total) return null;
      page += 1;
    }
  },
};
