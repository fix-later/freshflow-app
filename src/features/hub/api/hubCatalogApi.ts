import { getCursorPaged } from '../../../services/api/client';
import type { MarketProductDto } from '../../../types/api.types';

export interface HubProductReference {
  marketProductId: string;
  productId: string;
  productName: string;
  unit: string | null;
}

export interface HubProductCatalog {
  byMarketProductId: ReadonlyMap<string, HubProductReference>;
  unitByProductName: ReadonlyMap<string, string>;
  /** Same ambiguous-name exclusion as {@link unitByProductName} — see {@link findMarketProductByName}. */
  referenceByProductName: ReadonlyMap<string, HubProductReference>;
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
    productId: product.productId,
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

  // Same shape, but keyed on marketProductId agreement rather than unit agreement — two
  // listings of "Cải ngọt" across different markets are ambiguous here even when their
  // units match, since resolving to the wrong marketProductId misattributes hub stock.
  const referenceByProductName = new Map<string, HubProductReference>();
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
  catalog: HubProductCatalog,
  productName: string,
): string | null {
  return catalog.unitByProductName.get(normalizeProductName(productName)) ?? null;
}

/** `null` when the name doesn't resolve to exactly one market listing (unmatched, or ambiguous across markets). */
export function findMarketProductByName(
  catalog: HubProductCatalog,
  productName: string,
): HubProductReference | null {
  return catalog.referenceByProductName.get(normalizeProductName(productName)) ?? null;
}
