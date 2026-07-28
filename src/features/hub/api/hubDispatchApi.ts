import { apiClient, getCursorPaged } from '../../../services/api/client';
import {
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
      lines: stop.lines.map((line) => ({
        ...line,
        unit: line.unit ?? findUnitByProductName(catalog, line.productName),
      })),
    })),
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

  async createHandover(
    hubId: string,
    deliveryRouteId: string,
    driverUserId: string,
    notes?: string,
  ): Promise<{ handoverId: string }> {
    const { data } = await apiClient.post<{ handoverId: string }>(
      `/api/v1/hubs/${hubId}/handover`,
      { deliveryRouteId, driverUserId, outboundEventId: null, notes: notes ?? null },
    );
    return data;
  },
};
