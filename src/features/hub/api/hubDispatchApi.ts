import { apiClient, getCursorPaged } from '../../../services/api/client';
import {
  findMarketProductByName,
  findUnitByProductName,
  getHubProductCatalog,
  type HubProductCatalog,
} from './hubCatalogApi';

export type HubDispatchRouteStatus =
  | 'planned'
  | 'selected'
  | 'reviewed'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface HubDispatchRouteStopDto {
  stopOrder: number;
  entityType: 'market' | 'restaurant';
  entityId: string;
  entityName: string;
  latitude: number;
  longitude: number;
  estimatedArrivalAt: string | null;
  estimatedDepartureAt: string | null;
}

export interface HubDispatchRouteDto {
  id: string;
  routeType: string;
  status: HubDispatchRouteStatus;
  serviceDate: string;
  stops: HubDispatchRouteStopDto[];
  totalDistanceKm: number | null;
  estimatedDurationMinutes: number | null;
  estimatedCost: number | null;
  optimizationCriteria: string | null;
  vehicleId: string | null;
  driverUserId: string | null;
  orderGroupId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HubVehicleDto {
  id: string;
  plateNumber: string;
  capacityKg: number;
  vehicleType: 'van' | 'truck' | 'motorbike' | string;
  isAvailable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoadingLineDto {
  orderId: string;
  orderItemId: string;
  productName: string;
  quantity: number;
  capacityKg: number | null;
  /** Enriched by the App because loading-manifest currently omits the catalog unit. */
  unit?: string | null;
  /**
   * Enriched by the App, matched by product name against the catalog — the loading-manifest
   * response has no marketProductId either. `null` when the name didn't resolve to exactly one
   * market listing; such lines are skipped when building an outbound request (see
   * {@link buildOutboundItems}), since `POST /hubs/{hubId}/outbound` requires it.
   */
  marketProductId?: string | null;
  productId?: string | null;
}

export interface LoadingStopDto {
  stopOrder: number;
  restaurantId: string;
  restaurantName: string;
  lines: LoadingLineDto[];
}

export interface LoadingOrderDto {
  orderId: string;
  lines: LoadingLineDto[];
}

export interface LoadingManifestDto {
  routeId: string;
  status: HubDispatchRouteStatus;
  serviceDate: string;
  stops: LoadingStopDto[];
}

export interface VehicleEligibilityDto {
  isEligible: boolean;
  reasons: string[];
}

export interface HubSortingProgressDto {
  routeId: string;
  orderItemId: string;
  sortedQuantityKg: number;
  status: string;
  sortedByUserId: string;
  sortedAt: string;
}

export interface EligibleDriverDto {
  userId: string;
  roleName: string;
  isActive: boolean;
}

export interface RecordOutboundItemInput {
  marketProductId: string;
  productId: string | null;
  quantityKg: number;
}

export interface HubOutboundEventDto {
  outboundId: string;
  hubId: string;
  destinationRouteId: string;
  totalQuantityKg: number;
  dispatchedAt: string;
}

export interface HubDispatchPlanItem {
  route: HubDispatchRouteDto;
  manifest: LoadingManifestDto;
}

export interface HubDispatchPlan {
  fromDate: string;
  toDate: string;
  routes: HubDispatchPlanItem[];
  vehicles: HubVehicleDto[];
  warnings?: string[];
}

const PAGE_SIZE = 200;

async function getAllRoutes(serviceDate: string): Promise<HubDispatchRouteDto[]> {
  const routes: HubDispatchRouteDto[] = [];
  let cursor: string | undefined;

  do {
    const page = await getCursorPaged<HubDispatchRouteDto>('/api/v1/logistics/routes', {
      params: {
        cursor,
        page_size: PAGE_SIZE,
        service_date: serviceDate,
      },
    });
    routes.push(...page.data);
    cursor = page.meta.nextCursor ?? undefined;
  } while (cursor);

  return routes.filter((route) => route.status !== 'cancelled');
}

async function getAllRoutesWithoutDate(): Promise<HubDispatchRouteDto[]> {
  const routes: HubDispatchRouteDto[] = [];
  let cursor: string | undefined;

  do {
    const page = await getCursorPaged<HubDispatchRouteDto>('/api/v1/logistics/routes', {
      params: { cursor, page_size: PAGE_SIZE },
    });
    routes.push(...page.data);
    cursor = page.meta.nextCursor ?? undefined;
  } while (cursor);

  return routes.filter((route) => route.status !== 'cancelled');
}

async function getAllActiveVehicles(): Promise<HubVehicleDto[]> {
  const vehicles: HubVehicleDto[] = [];
  let cursor: string | undefined;

  do {
    const page = await getCursorPaged<HubVehicleDto>('/api/v1/logistics/vehicles', {
      params: {
        cursor,
        page_size: PAGE_SIZE,
        is_active: true,
      },
    });
    vehicles.push(...page.data);
    cursor = page.meta.nextCursor ?? undefined;
  } while (cursor);

  return vehicles.filter((vehicle) => vehicle.isActive);
}

function enrichManifestUnits(
  manifest: LoadingManifestDto,
  catalog: HubProductCatalog,
): LoadingManifestDto {
  return {
    ...manifest,
    stops: manifest.stops.map((stop) => ({
      ...stop,
      lines: stop.lines.map((line) => {
        const match = findMarketProductByName(catalog, line.productName);
        return {
          ...line,
          unit: line.unit ?? findUnitByProductName(catalog, line.productName),
          marketProductId: line.marketProductId ?? match?.marketProductId ?? null,
          productId: line.productId ?? match?.productId ?? null,
        };
      }),
    })),
  };
}

/**
 * Aggregates a loading manifest's lines into `POST /hubs/{hubId}/outbound` items — one entry per
 * distinct `marketProductId`, quantities summed across every stop/order on the route. Raw
 * `line.quantity` (not rounded up to a whole packing case): inbound recorded the same raw
 * quantity per `OrderItem` (`ScanInboundCommandHandler` sums `HubInboundEvent.Items[].QuantityKg`,
 * itself built 1:1 from the procurement batch's purchased lines) — rounding up here would ask to
 * dispatch more than was ever recorded as received, and the backend would refuse it as
 * `INSUFFICIENT_HUB_STOCK`.
 *
 * A line whose product name didn't resolve to exactly one market listing (see
 * `findMarketProductByName`) is skipped and its id returned in `unmatchedProductNames` — that
 * product's hub stock will not be decremented by this dispatch, so the caller should surface the
 * gap rather than silently drop it.
 */
export function buildOutboundItems(
  manifest: LoadingManifestDto,
): { items: RecordOutboundItemInput[]; unmatchedProductNames: string[] } {
  const quantityByProduct = new Map<string, RecordOutboundItemInput>();
  const unmatchedProductNames = new Set<string>();

  for (const stop of manifest.stops) {
    for (const line of stop.lines) {
      if (!line.marketProductId) {
        unmatchedProductNames.add(line.productName);
        continue;
      }
      const existing = quantityByProduct.get(line.marketProductId);
      if (existing) {
        existing.quantityKg += line.quantity;
      } else {
        quantityByProduct.set(line.marketProductId, {
          marketProductId: line.marketProductId,
          productId: line.productId ?? null,
          quantityKg: line.quantity,
        });
      }
    }
  }

  return {
    items: [...quantityByProduct.values()],
    unmatchedProductNames: [...unmatchedProductNames],
  };
}

export const hubDispatchApi = {
  async getPlan(serviceDates: string[], marketIds: string[]): Promise<HubDispatchPlan> {
    if (serviceDates.length === 0) {
      throw new Error('Cần ít nhất một ngày giao hàng để tải kế hoạch.');
    }

    if (marketIds.length === 0) {
      return {
        fromDate: serviceDates[0],
        toDate: serviceDates[serviceDates.length - 1],
        routes: [],
        vehicles: [],
      };
    }

    const [routeGroups, vehicles, catalog] = await Promise.all([
      Promise.all(serviceDates.map(getAllRoutes)),
      getAllActiveVehicles(),
      getHubProductCatalog(marketIds),
    ]);
    const assignedMarketIds = new Set(marketIds);
    const routes = routeGroups
      .flat()
      .filter((route) => route.stops.some(
        (stop) => stop.entityType === 'market' && assignedMarketIds.has(stop.entityId),
      ))
      .sort((left, right) => (
        left.serviceDate.localeCompare(right.serviceDate)
        || left.createdAt.localeCompare(right.createdAt)
      ));

    const manifestResults = await Promise.allSettled(
      routes.map(async (route) => {
        const { data } = await apiClient.get<LoadingManifestDto>(
          `/api/v1/logistics/routes/${route.id}/loading-manifest`,
        );
        return data;
      }),
    );
    const planRoutes = routes.flatMap((route, index) => {
      const result = manifestResults[index];
      return result.status === 'fulfilled'
        ? [{ route, manifest: enrichManifestUnits(result.value, catalog) }]
        : [];
    });
    const failedManifestCount = manifestResults.filter((result) => result.status === 'rejected').length;

    return {
      fromDate: serviceDates[0],
      toDate: serviceDates[serviceDates.length - 1],
      routes: planRoutes,
      vehicles: vehicles.sort((left, right) => left.capacityKg - right.capacityKg),
      warnings: failedManifestCount > 0
        ? [`Không tải được loading-manifest của ${failedManifestCount}/${routes.length} tuyến.`]
        : [],
    };
  },

  async checkVehicle(
    routeId: string,
    vehicleId: string,
    driverUserId?: string,
  ): Promise<VehicleEligibilityDto> {
    const { data } = await apiClient.get<VehicleEligibilityDto>(
      `/api/v1/logistics/routes/${routeId}/eligibility`,
      { params: { vehicleId, driver_user_id: driverUserId } },
    );
    return data;
  },

  async assignVehicle(
    routeId: string,
    vehicleId: string,
    driverUserId: string | null = null,
  ): Promise<HubDispatchRouteDto> {
    const { data } = await apiClient.post<HubDispatchRouteDto>(
      `/api/v1/logistics/routes/${routeId}/assign-vehicle`,
      { vehicleId, driverUserId },
    );
    return data;
  },

  async getSortingPlan(marketIds: string[]): Promise<HubDispatchPlan> {
    if (marketIds.length === 0) {
      return { fromDate: '', toDate: '', routes: [], vehicles: [] };
    }

    const assignedMarketIds = new Set(marketIds);
    const activeStatuses = new Set<HubDispatchRouteStatus>(['planned', 'selected', 'reviewed', 'assigned']);
    const routes = (await getAllRoutesWithoutDate())
      .filter((route) => activeStatuses.has(route.status))
      .filter((route) => route.stops.some(
        (stop) => stop.entityType === 'market' && assignedMarketIds.has(stop.entityId),
      ))
      .sort((left, right) => (
        right.serviceDate.localeCompare(left.serviceDate)
        || right.createdAt.localeCompare(left.createdAt)
      ));

    const [manifestResults, catalog] = await Promise.all([
      Promise.allSettled(routes.map(async (route) => {
        const { data } = await apiClient.get<LoadingManifestDto>(
          `/api/v1/logistics/routes/${route.id}/loading-manifest`,
        );
        return data;
      })),
      getHubProductCatalog(marketIds),
    ]);

    const planRoutes = routes.flatMap((route, index) => {
      const result = manifestResults[index];
      return result.status === 'fulfilled'
        ? [{ route, manifest: enrichManifestUnits(result.value, catalog) }]
        : [];
    });
    const failedManifestCount = manifestResults.filter((result) => result.status === 'rejected').length;

    return {
      fromDate: planRoutes.at(-1)?.route.serviceDate ?? '',
      toDate: planRoutes[0]?.route.serviceDate ?? '',
      routes: planRoutes,
      vehicles: [],
      warnings: failedManifestCount > 0
        ? [`Không tải được loading-manifest của ${failedManifestCount}/${routes.length} tuyến.`]
        : [],
    };
  },

  async getSortingProgress(hubId: string, routeId: string): Promise<HubSortingProgressDto[]> {
    const { data } = await apiClient.get<HubSortingProgressDto[]>(
      `/api/v1/hubs/${hubId}/routes/${routeId}/sorting-progress`,
    );
    return data;
  },

  async markLineSorted(
    hubId: string,
    routeId: string,
    orderItemId: string,
    sortedQuantityKg: number,
  ): Promise<HubSortingProgressDto> {
    const { data } = await apiClient.post<HubSortingProgressDto>(
      `/api/v1/hubs/${hubId}/routes/${routeId}/sorting`,
      { orderItemId, sortedQuantityKg },
    );
    return data;
  },

  async getEligibleDrivers(hubId: string): Promise<EligibleDriverDto[]> {
    const { data } = await apiClient.get<EligibleDriverDto[]>(
      `/api/v1/hubs/${hubId}/drivers/eligible`,
    );
    return data.filter((driver) => driver.isActive);
  },

  /**
   * Records the goods leaving the hub for `destinationRouteId` — the counterpart to inbound
   * scanning, so `Hub.OccupiedCapacityKg`/`HubInventory` actually decrease when a load departs
   * instead of only ever growing. Build `items` with {@link buildOutboundItems}.
   */
  async recordOutbound(
    hubId: string,
    destinationRouteId: string,
    items: RecordOutboundItemInput[],
    dispatchedAt: string,
  ): Promise<HubOutboundEventDto> {
    const { data } = await apiClient.post<HubOutboundEventDto>(
      `/api/v1/hubs/${hubId}/outbound`,
      {
        destinationRouteId,
        items: items.map((item) => ({
          marketProductId: item.marketProductId,
          productId: item.productId,
          quantityKg: item.quantityKg,
        })),
        dispatchedAt,
      },
    );
    return data;
  },

  async createHandover(
    hubId: string,
    deliveryRouteId: string,
    driverUserId: string,
    outboundEventId: string | null,
    notes?: string,
  ): Promise<{ handoverId: string }> {
    const { data } = await apiClient.post<{ handoverId: string }>(
      `/api/v1/hubs/${hubId}/handover`,
      { deliveryRouteId, driverUserId, outboundEventId, notes: notes ?? null },
    );
    return data;
  },
};
