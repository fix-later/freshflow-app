import type { MarketProductDto, ProductDto } from '../../../types/api.types';

export interface PackingSelection {
  packingCodeId: string | null;
  unit: string;
  weightKg: number | null;
  minimumOrderQuantity: number;
  maxQuantity: number;
  isConfigured: boolean;
  canOrder: boolean;
}

function positiveNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function resolvePackingSelection(
  product: MarketProductDto,
  metadata?: ProductDto,
): PackingSelection {
  const packingCodeId = metadata?.packingCodeId ?? null;
  const weightKg = positiveNumber(
    product.sellingUnit?.weightKg ?? metadata?.sellingUnit?.weightKg,
  );
  const minimumOrderQuantity = Math.max(1, metadata?.minimumOrderQuantity ?? 1);
  const maxQuantity = Math.max(0, product.availableQuantity);
  const unit = product.sellingUnit?.unitName?.trim()
    || metadata?.sellingUnit?.unitName?.trim()
    || product.unit;
  const isConfigured = Boolean(packingCodeId && weightKg);

  return {
    packingCodeId,
    unit,
    weightKg,
    minimumOrderQuantity,
    maxQuantity,
    isConfigured,
    canOrder: isConfigured && maxQuantity >= minimumOrderQuantity,
  };
}

export function formatWeightKg(value: number): string {
  return value.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
}

export function formatPackingRule(unit: string, weightKg: number | null): string {
  if (!weightKg) return 'Chưa cấu hình quy cách đóng gói';
  return `1 ${unit} = ${formatWeightKg(weightKg)} kg`;
}

export function calculatePackedWeight(quantity: number, weightKg: number | null): number | null {
  return weightKg ? quantity * weightKg : null;
}
