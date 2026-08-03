import { driverApi } from '../api/driverApi';
import type { DeliveryStatus, DriverDeliveryDto, DriverRouteDto, RouteStatus } from '../types/delivery.types';

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

/**
 * A restaurant stop before pickup has ever been confirmed — built straight from
 * `route.stops`, which the backend populates as soon as the route is assigned
 * (unlike `route.deliveries`, which only exists after confirm-pickup creates
 * Delivery rows). No deliveryId/status here on purpose: nothing has happened to
 * this stop yet.
 */
export interface PickupPreviewStop {
  entityId: string;
  order: number;
  restaurantName: string;
  lat: number;
  lng: number;
}

let _route: DriverRouteDto | null = null;
let _stops: DeliveryStop[] = [];
let _previewStops: PickupPreviewStop[] = [];

function mergeStops(route: DriverRouteDto): DeliveryStop[] {
  const restaurantStops = route.stops.filter(s => s.entityType === 'restaurant');

  // If driver arranged a custom preview order before pickup, preserve that custom order!
  if (_previewStops.length > 0) {
    const stopByEntityId = new Map(restaurantStops.map(s => [s.entityId, s]));

    const deliveryByEntityId = new Map<string, DriverDeliveryDto>();
    restaurantStops.forEach((stop, idx) => {
      const delivery =
        route.deliveries.find(d => d.sequenceNumber === stop.stopOrder) ?? route.deliveries[idx];
      if (delivery) {
        deliveryByEntityId.set(stop.entityId, delivery);
      }
    });

    const orderedPreview = [..._previewStops].sort((a, b) => a.order - b.order);

    return orderedPreview.map((ps, idx) => {
      const stop = stopByEntityId.get(ps.entityId);
      const delivery = deliveryByEntityId.get(ps.entityId);
      return {
        deliveryId: delivery?.deliveryId ?? `del-${ps.entityId}`,
        orderId: delivery?.orderId ?? `ord-${ps.entityId}`,
        order: idx + 1,
        restaurantName: ps.restaurantName,
        lat: ps.lat,
        lng: ps.lng,
        status: delivery?.status ?? 'pending',
        estimatedArrival: delivery?.estimatedArrival ?? null,
        actualArrival: delivery?.actualArrival ?? null,
      };
    });
  }

  // Fallback to server default stopOrder
  const sortedStops = restaurantStops.sort((a, b) => a.stopOrder - b.stopOrder);
  return [...route.deliveries]
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
    .map((d, idx) => {
      const stop = sortedStops[idx];
      return {
        deliveryId: d.deliveryId,
        orderId: d.orderId,
        order: idx + 1,
        restaurantName: stop?.entityName ?? `Đơn #${d.orderId.slice(0, 8).toUpperCase()}`,
        lat: stop?.latitude ?? 0,
        lng: stop?.longitude ?? 0,
        status: d.status,
        estimatedArrival: d.estimatedArrival,
        actualArrival: d.actualArrival,
      };
    });
}

function buildPreviewStops(route: DriverRouteDto): PickupPreviewStop[] {
  return route.stops
    .filter(s => s.entityType === 'restaurant')
    .sort((a, b) => a.stopOrder - b.stopOrder)
    .map((s, idx) => ({
      entityId: s.entityId,
      order: idx + 1,
      restaurantName: s.entityName,
      lat: s.latitude,
      lng: s.longitude,
    }));
}

export const driverRouteStore = {
  /** Fetches today's route(s) and keeps the first one (a driver has at most one active route per day). */
  async load(): Promise<DriverRouteDto | null> {
    const routes = await driverApi.getTodayRoutes();
    _route = routes[0] ?? null;
    if (_route && _previewStops.length === 0) {
      _previewStops = buildPreviewStops(_route);
    }
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
    return _route?.stops.find(s => s.entityType === 'market' || s.stopOrder === 0) ?? _route?.stops[0];
  },

  /** True once at least one Delivery exists for this route (pickup confirmed at least once). */
  hasPickupStarted(): boolean {
    return (_route?.deliveries.length ?? 0) > 0;
  },

  /** Restaurant stops for the "not picked up yet" preview — see PickupPreviewStop. */
  getPickupPreviewStops(): PickupPreviewStop[] {
    return _previewStops;
  },

  /** Reorder preview stops before pickup confirmation. */
  setPickupPreviewStopOrder(entityIds: string[]) {
    const byId = new Map(_previewStops.map(s => [s.entityId, s]));
    const reordered = entityIds
      .map(id => byId.get(id))
      .filter((s): s is PickupPreviewStop => s !== undefined);
    reordered.forEach((s, idx) => { s.order = idx + 1; });
    _previewStops = reordered;
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
