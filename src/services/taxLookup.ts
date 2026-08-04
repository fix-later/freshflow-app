export interface TaxInfo {
  name: string;
  address: string;
  shortName?: string;
}

// Free public business-registry lookup (no SLA) — used to auto-fill and sanity-check a
// restaurant's tax profile. Callers must treat a null result as "couldn't verify", not
// "invalid" — always allow manual entry to proceed regardless of lookup outcome.
export async function fetchTaxInfo(code: string): Promise<TaxInfo | null> {
  try {
    const res = await fetch(`https://api.vietqr.io/v2/business/${code.trim()}`);
    const json = await res.json();
    if (json?.code === '00' && json?.data) {
      return {
        name: json.data.name ?? '',
        address: json.data.address ?? '',
        shortName: json.data.shortName ?? '',
      };
    }
    return null;
  } catch {
    return null;
  }
}
