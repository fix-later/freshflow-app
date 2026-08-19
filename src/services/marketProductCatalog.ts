import { getCursorPaged } from './api/client';
import type { MarketProductDto } from '../types/api.types';

export interface MarketProductReference {
  marketProductId: string;
  productId: string;
  productName: string;
  unit: string | null;
}

export interface MarketProductCatalog {
  byMarketProductId: ReadonlyMap<string, MarketProductReference>;
  unitByProductName: ReadonlyMap<string, string>;
  referenceByProductName: ReadonlyMap<string, MarketProductReference>;
}

const PAGE_SIZE = 100;
const CACHE_TTL_MS = 5 * 60_000;
const marketCache = new Map<string, {
  loadedAt: number;
  products: MarketProductReference[];
}>();

function normalizeProductName(value: string): string {
  return value.trim().toLocaleLowerCase('vi-VN');
}

async function getMarketProducts(marketId: string): Promise<MarketProductReference[]> {
  const cached = marketCache.get(marketId);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached.products;

  const products: MarketProductDto[] = [];
  let cursor: string | undefined;

  do {
    const page = await getCursorPaged<MarketProductDto>(
      `/api/v1/markets/${marketId}/products`,
      { params: { cursor, pageSize: PAGE_SIZE } },
    );
    products.push(...page.data);
    cursor = page.meta.nextCursor ?? undefined;
  } while (cursor);

  const references = products.map((product): MarketProductReference => ({
    marketProductId: product.marketProductId,
    productId: product.productId,
    productName: product.productName,
    unit: product.unit?.trim() || null,
  }));
  marketCache.set(marketId, { loadedAt: Date.now(), products: references });
  return references;
}

/** Loads the catalog unit once per market and reuses it across all App roles. */
export async function getMarketProductCatalog(marketIds: string[]): Promise<MarketProductCatalog> {
  const uniqueMarketIds = [...new Set(marketIds.filter(Boolean))];
  const results = await Promise.allSettled(uniqueMarketIds.map(getMarketProducts));
  const references = results.flatMap((result) => (
    result.status === 'fulfilled' ? result.value : []
  ));
  const byMarketProductId = new Map(
    references.map((reference) => [reference.marketProductId, reference]),
  );
  const unitByProductName = new Map<string, string>();
  const ambiguousNames = new Set<string>();

  references.forEach((reference) => {
    if (!reference.unit) return;
    const name = normalizeProductName(reference.productName);
    const current = unitByProductName.get(name);
    if (current && current !== reference.unit) {
      ambiguousNames.add(name);
      unitByProductName.delete(name);
      return;
    }
    if (!ambiguousNames.has(name)) unitByProductName.set(name, reference.unit);
  });

  const referenceByProductName = new Map<string, MarketProductReference>();
  const ambiguousIds = new Set<string>();

  references.forEach((reference) => {
    const name = normalizeProductName(reference.productName);
    const current = referenceByProductName.get(name);
    if (current && current.marketProductId !== reference.marketProductId) {
      ambiguousIds.add(name);
      referenceByProductName.delete(name);
      return;
    }
    if (!ambiguousIds.has(name)) referenceByProductName.set(name, reference);
  });

  return { byMarketProductId, unitByProductName, referenceByProductName };
}

export function findUnitByProductName(
  catalog: MarketProductCatalog,
  productName: string,
): string | null {
  return catalog.unitByProductName.get(normalizeProductName(productName)) ?? null;
}

export function findMarketProductByName(
  catalog: MarketProductCatalog,
  productName: string,
): MarketProductReference | null {
  return catalog.referenceByProductName.get(normalizeProductName(productName)) ?? null;
}
