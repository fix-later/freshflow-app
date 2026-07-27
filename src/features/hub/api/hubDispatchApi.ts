import { apiClient, getCursorPaged } from '../../../services/api/client';

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
  productName: string;
  quantity: number;
  capacityKg: number | null;
}

export interface LoadingStopDto {
  stopOrder: number;
  restaurantId: string;
  restaurantName: string;
  orders?: LoadingOrderDto[];
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

export interface HubDispatchPlanItem {
  route: HubDispatchRouteDto;
  manifest: LoadingManifestDto;
}

export interface HubDispatchPlan {
  fromDate: string;
  toDate: string;
  routes: HubDispatchPlanItem[];
  vehicles: HubVehicleDto[];
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

    const [routeGroups, vehicles] = await Promise.all([
      Promise.all(serviceDates.map(getAllRoutes)),
      getAllActiveVehicles(),
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

    const manifests = await Promise.all(
      routes.map(async (route) => {
        const { data } = await apiClient.get<LoadingManifestDto>(
          `/api/v1/logistics/routes/${route.id}/loading-manifest`,
        );
        return data;
      }),
    );

    return {
      fromDate: serviceDates[0],
      toDate: serviceDates[serviceDates.length - 1],
      routes: routes.map((route, index) => ({ route, manifest: manifests[index] })),
      vehicles: vehicles.sort((left, right) => left.capacityKg - right.capacityKg),
    };
  },

  async checkVehicle(routeId: string, vehicleId: string): Promise<VehicleEligibilityDto> {
    const { data } = await apiClient.get<VehicleEligibilityDto>(
      `/api/v1/logistics/routes/${routeId}/eligibility`,
      { params: { vehicleId } },
    );
    return data;
  },

  async assignVehicle(routeId: string, vehicleId: string): Promise<HubDispatchRouteDto> {
    const { data } = await apiClient.post<HubDispatchRouteDto>(
      `/api/v1/logistics/routes/${routeId}/assign-vehicle`,
      { vehicleId, driverUserId: null },
    );
    return data;
  },
};
