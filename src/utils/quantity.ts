export const DEFAULT_QUANTITY_UNIT = 'kg';

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
}

export function getQuantityUnit(unit?: string | null): string {
  return unit?.trim() || DEFAULT_QUANTITY_UNIT;
}

export function formatQuantityWithUnit(value: number, unit?: string | null): string {
  return `${formatQuantity(value)} ${getQuantityUnit(unit)}`;
}

export function formatQuantityTotal(
  lines: ReadonlyArray<{ quantity: number; unit?: string | null }>,
): string {
  const units = new Set(lines.map((line) => getQuantityUnit(line.unit)));
  if (units.size > 1) return 'Đa đơn vị';
  const total = lines.reduce((sum, line) => sum + line.quantity, 0);
  return formatQuantityWithUnit(total, units.values().next().value);
}
