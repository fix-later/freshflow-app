import { driverApi } from '../api/driverApi';
import type { DeliveryStatus, DriverRouteDto, RouteStatus } from '../types/delivery.types';

// Module-level mutable store — same pattern as the old stopStatusStore/stopOrderStore,
// now backed by the real API instead of mock data. Holds the driver's single active
// route for today plus a flattened, screen-friendly view of its stops.

/**
 * One order's delivery, merged with its physical waypoint (when one is present).
 *
 * `DriverRouteDto` keeps `stops` (physical waypoints — hub/market or restaurant, no
 * order info) and `deliveries` (per-order status, no location) as separate lists.
 * We zip them by visiting position — `stops` sorted by `stopOrder`, restaurant-type
 * entries only, aligned with `deliveries` sorted by `sequenceNumber` — since both are
 * driven by the same route-optimization sequence. There is no field that links a
 * delivery to a stop directly, so if backend ever decouples the two lists' ordering
 * this pairing will need a real key instead.
 */
export interface DeliveryStop {
  deliveryId: string;
  orderId: string;
  order: number;
  restaurantName: string;
  lat: number;
  lng: number;
  status: DeliveryStatus;
  estimatedArrival: string | null;
  actualArrival: string | null;
}

let _route: DriverRouteDto | null = null;
let _stops: DeliveryStop[] = [];

function mergeStops(route: DriverRouteDto): DeliveryStop[] {
  const restaurantStops = route.stops
    .filter(s => s.entityType === 'restaurant')
    .sort((a, b) => a.stopOrder - b.stopOrder);

  return [...route.deliveries]
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
    .map((d, idx) => {
      const stop = restaurantStops[idx];
      return {
        deliveryId: d.deliveryId,
        orderId: d.orderId,
        order: d.sequenceNumber,
        restaurantName: stop?.entityName ?? `Đơn #${d.orderId.slice(0, 8).toUpperCase()}`,
        lat: stop?.latitude ?? 0,
        lng: stop?.longitude ?? 0,
        status: d.status,
        estimatedArrival: d.estimatedArrival,
        actualArrival: d.actualArrival,
      };
    });
}

export const driverRouteStore = {
  /** Fetches today's route(s) and keeps the first one (a driver has at most one active route per day). */
  async load(): Promise<DriverRouteDto | null> {
    const routes = await driverApi.getTodayRoutes();
    _route = routes[0] ?? null;
    _stops = _route ? mergeStops(_route) : [];
    return _route;
  },

  getRoute(): DriverRouteDto | null {
    return _route;
  },

  getStops(): DeliveryStop[] {
    return _stops;
  },

  getStop(deliveryId: string): DeliveryStop | undefined {
    return _stops.find(s => s.deliveryId === deliveryId);
  },

  getHubStop() {
    return _route?.stops.find(s => s.entityType === 'market');
  },

  /** Patches the in-memory route status after a successful action (e.g. startRoute) without a full refetch. */
  setRouteStatus(status: RouteStatus) {
    if (_route) _route.status = status;
  },

  setDeliveryStatus(deliveryId: string, status: DeliveryStatus) {
    const stop = _stops.find(s => s.deliveryId === deliveryId);
    if (stop) stop.status = status;
  },

  /**
   * Client-side reorder — the driver may know a better route than the server-suggested
   * sequence (e.g. current traffic), and there is no backend endpoint to persist a custom
   * order. `deliveryIds` must be a permutation of the current stops; `order` is renumbered
   * 1..N to match the new position.
   */
  setStopOrder(deliveryIds: string[]) {
    const byId = new Map(_stops.map(s => [s.deliveryId, s]));
    const reordered = deliveryIds
      .map(id => byId.get(id))
      .filter((s): s is DeliveryStop => s !== undefined);
    reordered.forEach((s, idx) => { s.order = idx + 1; });
    _stops = reordered;
  },

  isRouteComplete(): boolean {
    return _stops.length > 0 && _stops.every(s => s.status === 'delivered' || s.status === 'failed');
  },

  reset() {
    _route = null;
    _stops = [];
  },
};
