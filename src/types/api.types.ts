// ─── API Envelope (BE wraps all responses) ─────────────────────────────────────
// Note: the axios interceptor in client.ts automatically unwraps these,
// so most call-sites never see this shape directly.

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorEnvelope;

// ─── Pagination ─────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginatedData<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─── Catalog / Products ──────────────────────────────────────────────────────────

export interface ProductDto {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  unitId: string;
  unitName: string | null;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  imageUrl: string | null;
}

export interface MarketDto {
  id: string;
  name: string;
  location: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UnitDto {
  id: string;
  name: string;
  abbreviation: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Weight-in-kg equivalent for a product's selling unit (e.g. "Bó" ≈ 0.5kg) — null when unknown. */
export interface SellingUnitDto {
  unitName: string;
  weightKg: number | null;
}

/** Product listed at a market with current price and stock (from Pricing module). */
export interface MarketProductDto {
  marketProductId: string;
  productId: string;
  marketId: string;
  productName: string;
  category: string | null;
  unit: string;
  currentPrice: number;
  currentQuantity: number;
  availableQuantity: number;
  updatedAt: string;
  updatedBy: string | null;
  sellingUnit: SellingUnitDto;
}

/** A price/quantity change record for a market product. */
export interface PriceHistoryItemDto {
  id: string;
  marketProductId: string;
  price: number;
  quantity: number;
  recordedBy: string | null;
  recordedAt: string;
}

/** Cursor-pagination metadata returned by the BE. */
export interface CursorMeta {
  pageSize: number;
  nextCursor: string | null;
}

// ─── Auth ───────────────────────────────────────────────────────────────────────

export type ApprovalStatus = 'pending' | 'active' | 'suspended';

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    role: string;
  };
  approvalStatus: ApprovalStatus | null;
}

// ─── Credit & Statements ────────────────────────────────────────────────────────

export interface CreditDto {
  restaurantId: string;
  creditLimit: number;
  outstandingBalance: number;
  availableCredit: number;
  updatedAt: string;
}

export interface CreditTransactionDto {
  id: string;
  restaurantId: string;
  orderId: string | null;
  type: string;
  amount: number;
  balanceAfter: number;
  note: string | null;
  paymentMethod: string | null;
  reference: string | null;
  createdAt: string;
}

export interface CreditTransactionMeta {
  nextCursor: string | null;
  pageSize: number;
}

export interface CreditStatementSummaryDto {
  id: string;
  restaurantId: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  totalCharges: number;
  totalSettlements: number;
  totalRefunds: number;
  generatedAt: string;
}

export interface CreditStatementLineDto {
  transactionId: string;
  type: string;
  amount: number;
  balanceAfter: number;
  occurredAt: string;
  note: string | null;
  reference: string | null;
}

export interface CreditStatementDto extends CreditStatementSummaryDto {
  dueDate: string;
  lines: CreditStatementLineDto[];
}

