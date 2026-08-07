const PLACES_KEY = process.env.EXPO_PUBLIC_GOONG_PLACES_API_KEY ?? '';

export interface PlacePrediction {
  placeId: string;
  description: string;
}

export interface PlaceDetail {
  lat: number;
  lng: number;
  address: string;
}

// Goong Place Autocomplete — text-search suggestions as the user types an address.
export async function searchPlaces(query: string): Promise<PlacePrediction[]> {
  const input = query.trim();
  if (!input) return [];
  try {
    const res = await fetch(
      `https://rsapi.goong.io/Place/AutoComplete?input=${encodeURIComponent(input)}&api_key=${PLACES_KEY}`,
    );
    const json = await res.json();
    if (!Array.isArray(json?.predictions)) return [];
    return json.predictions
      .map((p: { place_id?: string; description?: string }) => ({
        placeId: p.place_id ?? '',
        description: p.description ?? '',
      }))
      .filter((p: PlacePrediction) => p.placeId);
  } catch {
    return [];
  }
}

// Resolves a place_id from AutoComplete into coordinates + formatted address.
export async function getPlaceDetail(placeId: string): Promise<PlaceDetail | null> {
  try {
    const res = await fetch(
      `https://rsapi.goong.io/Place/Detail?place_id=${encodeURIComponent(placeId)}&api_key=${PLACES_KEY}`,
    );
    const json = await res.json();
    const loc = json?.result?.geometry?.location;
    if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') return null;
    return {
      lat: loc.lat,
      lng: loc.lng,
      address: json.result.formatted_address ?? '',
    };
  } catch {
    return null;
  }
}
