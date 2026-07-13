import { MOCK_STOPS, type StopStatus } from './mockData';

// Module-level mutable store — survives navigation, replaced by API later
export const stopStatusStore: Record<string, StopStatus> = Object.fromEntries(
  MOCK_STOPS.map(s => [s.id, s.status]),
);

export function updateStopStatus(stopId: string, status: StopStatus) {
  stopStatusStore[stopId] = status;
}

export function isRouteComplete(): boolean {
  return Object.values(stopStatusStore).every(
    s => s === 'delivered' || s === 'failed',
  );
}

export function resetStore() {
  MOCK_STOPS.forEach(s => { stopStatusStore[s.id] = s.status; });
}
