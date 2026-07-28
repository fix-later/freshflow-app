import { getCursorPaged } from '../../../services/api/client';
import type { MarketProductDto } from '../../../types/api.types';

export interface HubProductReference {
  marketProductId: string;
  productName: string;
  unit: string | null;
}

export interface HubProductCatalog {
  byMarketProductId: ReadonlyMap<string, HubProductReference>;
  unitByProductName: ReadonlyMap<string, string>;
}

const PAGE_SIZE = 100;
const CACHE_TTL_MS = 5 * 60_000;
const marketCache = new Map<string, {
  loadedAt: number;
  products: HubProductReference[];
}>();

function normalizeProductName(value: string): string {
  return value.trim().toLocaleLowerCase('vi-VN');
}

async function getMarketProducts(marketId: string): Promise<HubProductReference[]> {
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

  const references = products.map((product): HubProductReference => ({
    marketProductId: product.marketProductId,
    productName: product.productName,
    unit: product.unit?.trim() || null,
  }));
  marketCache.set(marketId, { loadedAt: Date.now(), products: references });
  return references;
}

/**
 * Hub payloads currently omit catalog units. This read-only enrichment uses an endpoint already
 * available to hub_staff. Name-based lookup is exposed only when the name maps to one unique unit.
 */
export async function getHubProductCatalog(marketIds: string[]): Promise<HubProductCatalog> {
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

  return { byMarketProductId, unitByProductName };
}

export function findUnitByProductName(
  catalog: HubProductCatalog,
  productName: string,
): string | null {
  return catalog.unitByProductName.get(normalizeProductName(productName)) ?? null;
}
