import { apiClient, getCursorPaged } from '../../../services/api/client';
import {
  findUnitByProductName,
  getHubProductCatalog,
  type HubProductCatalog,
} from './hubCatalogApi';

export interface AssignedHubDto {
  hubId: string;
  marketId: string | null;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  capacityKg: number;
  occupiedCapacityKg: number;
  availableCapacityKg: number;
  isActive: boolean;
  managedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HubInboundItemDto {
  marketProductId: string;
  productId: string | null;
  quantityKg: number;
  /** Current BE may omit this field; screens must keep an id-based fallback. */
  productName?: string | null;
}

export interface HubInboundDto {
  inboundId: string;
  hubId: string;
  sourceMarketId: string | null;
  deliveryRouteId: string | null;
  deliveryScheduleId: string | null;
  items: HubInboundItemDto[];
  totalQuantityKg: number;
  arrivedAt: string;
  recordedBy: string | null;
  hubStaffUserId: string | null;
  status: 'PENDING' | 'ARRIVED_AT_HUB' | string;
  conditionStatus: string;
  discrepancyNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HubInboundTask extends HubInboundDto {
  hub: AssignedHubDto;
}

export type HubDiscrepancyCondition = 'MISSING' | 'DAMAGED' | 'PARTIAL';

export interface HubDiscrepancyDto {
  discrepancyId: string;
  hubId: string;
  inboundEventId: string;
  orderId: string;
  orderItemId: string;
  affectedQuantity: number;
  conditionStatus: HubDiscrepancyCondition;
  notes: string | null;
  status: 'OPEN' | 'ACKNOWLEDGED' | string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecordHubDiscrepancyRequest {
  orderItemId: string;
  affectedQuantity: number;
  conditionStatus: HubDiscrepancyCondition;
  notes?: string | null;
}

export interface HubWorkDto {
  assignedHubs: AssignedHubDto[];
  inboundTasks: HubInboundTask[];
  warnings: string[];
}

export function normalizeInboundStatus(status: string | null | undefined): string {
  return (status ?? '').trim().toUpperCase();
}

export function isInboundReceived(status: string | null | undefined): boolean {
  return normalizeInboundStatus(status) === 'ARRIVED_AT_HUB';
}

export type HubProcurementStatus =
  | 'Built'
  | 'Manifested'
  | 'Purchasing'
  | 'HandedOff'
  | 'Cancelled';

export interface HubProcurementItemDto {
  marketProductId: string;
  productName: string;
  targetQuantity: number;
  actualQuantity: number | null;
  actualUnitPrice: number | null;
  purchasedAt: string | null;
  /** Enriched by the App from GET /markets/{marketId}/products. */
  unit?: string | null;
}

export interface HubProcurementOrderItemDto {
  orderItemId: string;
  marketProductId: string | null;
  productName: string;
  quantity: number;
  unit: string | null;
}

export interface HubProcurementOrderDto {
  orderId: string;
  restaurantId: string;
  restaurantName: string;
  deliveryOrder: number | null;
  items: HubProcurementOrderItemDto[];
}

export interface HubProcurementBatchDto {
  batchId: string;
  marketId: string;
  status: HubProcurementStatus;
  handedOffAt: string | null;
  orderIds: string[];
  items: HubProcurementItemDto[];
  /** Forward-compatible contract; current BE does not return this field yet. */
  orders?: HubProcurementOrderDto[];
}

export interface HubProcurementPlanDto {
  hubId: string;
  date: string;
  batches: HubProcurementBatchDto[];
}

export interface HubProcurementDayPlan extends HubProcurementPlanDto {
  hub: AssignedHubDto;
}

export interface HubOrderLineDto {
  orderId: string;
  orderItemId: string;
  productName: string;
  marketProductId: string;
  productId: string;
  quantity: number;
  capacityKg: number | null;
  orderedQuantity: number;
  packingCode: string | null;
  packageCount: number | null;
  sortedQuantityKg: number;
  remainingQuantityKg: number;
  status: string;
  /** Enriched by the App from the market-product catalog. */
  unit?: string | null;
}

export interface HubSortingOrderDto {
  orderId: string;
  status: string;
  lines: HubOrderLineDto[];
}

export interface HubRestaurantOrdersDto {
  restaurantId: string;
  restaurantName: string;
  orderCount: number;
  orders: HubSortingOrderDto[];
  /** Flattened compatibility view used by the sorting screen. */
  lines: HubOrderLineDto[];
}

export interface HubOrdersByRestaurantDto {
  hubId: string;
  serviceDate: string;
  restaurants: HubRestaurantOrdersDto[];
}

export interface HubSortingDayPlan extends HubOrdersByRestaurantDto {
  hub: AssignedHubDto;
}

export interface HubSortingWeekDto {
  plans: HubSortingDayPlan[];
  warnings: string[];
}

const PENDING_PAGE_SIZE = 200;

async function getAllPendingInbound(hubId: string): Promise<HubInboundDto[]> {
  const items: HubInboundDto[] = [];
  let cursor: string | undefined;

  do {
    const page = await getCursorPaged<HubInboundDto>(
      `/api/v1/hubs/${hubId}/pending-inbound`,
      {
        params: {
          cursor,
          page_size: PENDING_PAGE_SIZE,
        },
      },
    );

    items.push(...page.data);
    cursor = page.meta.nextCursor ?? undefined;
  } while (cursor);

  return items;
}

async function getOrdersByRestaurant(
  hubId: string,
  serviceDate: string,
  includeBatched: boolean,
): Promise<HubOrdersByRestaurantDto> {
  interface BackendOrderItemDto {
    orderItemId: string;
    productName: string;
    marketProductId: string;
    productId: string;
    unit: string | null;
    orderedQuantity: number;
    requiredQuantity: number;
    packingCode: string | null;
    packingCapacityKg: number | null;
    packageCount: number | null;
    sortedQuantityKg: number;
    remainingQuantityKg: number;
    status: string;
  }

  interface BackendOrderDto {
    orderId: string;
    status: string;
    items: BackendOrderItemDto[];
  }

  interface BackendRestaurantDto {
    restaurantId: string;
    restaurantName: string;
    orderCount: number;
    orders: BackendOrderDto[];
  }

  interface BackendResponseDto {
    hubId: string;
    serviceDate: string;
    restaurants: BackendRestaurantDto[];
  }

  const { data } = await apiClient.get<BackendResponseDto>(
    `/api/v1/hubs/${hubId}/orders-by-restaurant`,
    { params: { service_date: serviceDate, include_batched: includeBatched } },
  );

  return {
    ...data,
    restaurants: data.restaurants.map((restaurant) => {
      const orders = restaurant.orders.map((order): HubSortingOrderDto => ({
        orderId: order.orderId,
        status: order.status,
        lines: order.items.map((item): HubOrderLineDto => ({
          orderId: order.orderId,
          orderItemId: item.orderItemId,
          productName: item.productName,
          marketProductId: item.marketProductId,
          productId: item.productId,
          quantity: item.requiredQuantity,
          capacityKg: item.packingCapacityKg,
          orderedQuantity: item.orderedQuantity,
          packingCode: item.packingCode,
          packageCount: item.packageCount,
          sortedQuantityKg: item.sortedQuantityKg,
          remainingQuantityKg: item.remainingQuantityKg,
          status: item.status,
          unit: item.unit,
        })),
      }));

      return {
        restaurantId: restaurant.restaurantId,
        restaurantName: restaurant.restaurantName,
        orderCount: restaurant.orderCount,
        orders,
        lines: orders.flatMap((order) => order.lines),
      };
    }),
  };
}

function enrichRestaurantOrders(
  value: HubOrdersByRestaurantDto,
  catalog: HubProductCatalog,
): HubOrdersByRestaurantDto {
  return {
    ...value,
    restaurants: value.restaurants.map((restaurant) => ({
      ...restaurant,
      orders: restaurant.orders.map((order) => ({
        ...order,
        lines: order.lines.map((line) => ({
          ...line,
          unit: line.unit ?? findUnitByProductName(catalog, line.productName),
        })),
      })),
      lines: restaurant.lines.map((line) => ({
        ...line,
        unit: line.unit ?? findUnitByProductName(catalog, line.productName),
      })),
    })),
  };
}

function mapProcurementOrders(
  details: HubOrdersByRestaurantDto | undefined,
): ReadonlyMap<string, HubProcurementOrderDto> {
  const result = new Map<string, HubProcurementOrderDto>();
  details?.restaurants.forEach((restaurant) => {
    restaurant.orders.forEach((order) => {
      result.set(order.orderId, {
        orderId: order.orderId,
        restaurantId: restaurant.restaurantId,
        restaurantName: restaurant.restaurantName,
        deliveryOrder: null,
        items: order.lines.map((line) => ({
          orderItemId: line.orderItemId,
          marketProductId: line.marketProductId,
          productName: line.productName,
          quantity: line.quantity,
          unit: line.unit ?? null,
        })),
      });
    });
  });
  return result;
}

function normalizeProductName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('vi-VN');
}

function getVietnamDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(parsed);
  const read = (type: Intl.DateTimeFormatPartTypes) => (
    parts.find((part) => part.type === type)?.value ?? ''
  );
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function addIsoDays(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export const hubApi = {
  /** Hubs that Admin/Operations Manager assigned to the authenticated Hub Staff. */
  async getAssignedHubs(): Promise<AssignedHubDto[]> {
    const { data } = await apiClient.get<AssignedHubDto[]>('/api/v1/hubs/assigned');
    return Array.isArray(data) ? data : [];
  },

  /** Pending and arrived inbound work for one assigned hub. */
  getPendingInbound(hubId: string): Promise<HubInboundDto[]> {
    return getAllPendingInbound(hubId);
  },

  /** Aggregate the authenticated staff member's work across every assigned hub. */
  async getMyWork(): Promise<HubWorkDto> {
    const assignedHubs = await this.getAssignedHubs();
    const results = await Promise.allSettled(
      assignedHubs.map(async (hub) => {
        const tasks = await getAllPendingInbound(hub.hubId);
        return tasks.map((task): HubInboundTask => ({ ...task, hub }));
      }),
    );

    const pages = results
      .filter((result): result is PromiseFulfilledResult<HubInboundTask[]> => result.status === 'fulfilled')
      .map((result) => result.value);
    const failedHubs = results.flatMap((result, index) => (
      result.status === 'rejected' ? [assignedHubs[index]] : []
    ));

    if (failedHubs.length > 0 && pages.length === 0) {
      throw new Error(`Không tải được task của ${failedHubs.map((hub) => hub.name).join(', ')}.`);
    }

    const inboundTasks = pages
      .flat()
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    return {
      assignedHubs,
      inboundTasks,
      warnings: failedHubs.map((hub) => `Không tải được task của ${hub.name} (${hub.hubId}).`),
    };
  },

  /** Procurement expected at one assigned hub on one business date. */
  async getProcurementPlan(hubId: string, date: string): Promise<HubProcurementPlanDto> {
    const { data } = await apiClient.get<HubProcurementPlanDto>(
      `/api/v1/hubs/${hubId}/procurement-plan`,
      { params: { date } },
    );
    return data;
  },

  /** One batch with restaurant/order lines, used by the dedicated batch-order screen. */
  async getProcurementBatchDetail(
    hubId: string,
    date: string,
    batchId: string,
  ): Promise<HubProcurementBatchDto | null> {
    const plan = await this.getProcurementPlan(hubId, date);
    const batch = plan.batches.find((item) => item.batchId === batchId);
    if (!batch) return null;

    const catalog = await getHubProductCatalog([batch.marketId]);
    let orderDetails = new Map<string, HubProcurementOrderDto>();
    try {
      const details = enrichRestaurantOrders(
        await getOrdersByRestaurant(hubId, date, true),
        catalog,
      );
      orderDetails = new Map(mapProcurementOrders(details));
    } catch {
      // Keep the batch/order identifiers usable even when the optional detail API is unavailable.
    }

    const marketProductIdByName = new Map(batch.items.map((item) => [
      normalizeProductName(item.productName),
      item.marketProductId,
    ]));

    return {
      ...batch,
      items: batch.items.map((item) => ({
        ...item,
        unit: item.unit
          ?? catalog.byMarketProductId.get(item.marketProductId)?.unit
          ?? null,
      })),
      orders: batch.orderIds.flatMap((orderId) => {
        const order = orderDetails.get(orderId);
        return order ? [{
          ...order,
          items: order.items.map((item) => ({
            ...item,
            marketProductId: item.marketProductId
              ?? marketProductIdByName.get(normalizeProductName(item.productName))
              ?? null,
          })),
        }] : [];
      }),
    };
  },

  /** Resolve the procurement batch linked to a physical inbound task. */
  async getInboundBatchDetail(task: HubInboundTask): Promise<HubProcurementBatchDto | null> {
    if (!task.deliveryScheduleId) return null;

    const centerDate = getVietnamDate(task.arrivedAt);
    const offsets = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, 6, 7];
    for (let index = 0; index < offsets.length; index += 3) {
      const dates = offsets.slice(index, index + 3).map((offset) => addIsoDays(centerDate, offset));
      const results = await Promise.allSettled(dates.map((date) => (
        this.getProcurementPlan(task.hubId, date)
      )));
      const matchedIndex = results.findIndex((result) => (
        result.status === 'fulfilled'
        && result.value.batches.some((batch) => batch.batchId === task.deliveryScheduleId)
      ));
      if (matchedIndex >= 0) {
        return this.getProcurementBatchDetail(
          task.hubId,
          dates[matchedIndex],
          task.deliveryScheduleId,
        );
      }
    }

    return null;
  },

  /** Orders staged at one Hub, grouped by restaurant without requiring a route. */
  getOrdersByRestaurant(
    hubId: string,
    serviceDate: string,
    includeBatched = false,
  ): Promise<HubOrdersByRestaurantDto> {
    return getOrdersByRestaurant(hubId, serviceDate, includeBatched);
  },

  /** Route-free sorting work for every assigned Hub in a date window. */
  async getSortingWeek(
    assignedHubs: AssignedHubDto[],
    dates: string[],
  ): Promise<HubSortingWeekDto> {
    const requests = assignedHubs.flatMap((hub) => (
      dates.map((date) => ({ hub, date }))
    ));
    const results = await Promise.allSettled(requests.map(async ({ hub, date }) => ({
      ...await getOrdersByRestaurant(hub.hubId, date, true),
      hub,
    })));
    const fulfilled = results.flatMap((result) => (
      result.status === 'fulfilled' ? [result.value] : []
    ));

    if (fulfilled.length === 0 && requests.length > 0) {
      throw new Error('Không tải được đơn phân loại của các Hub được phân công.');
    }

    const catalog = await getHubProductCatalog(
      assignedHubs.flatMap((hub) => hub.marketId ? [hub.marketId] : []),
    );
    const plans = fulfilled.map((plan): HubSortingDayPlan => ({
      ...enrichRestaurantOrders(plan, catalog),
      hub: plan.hub,
    }));
    const warnings = results.flatMap((result, index) => (
      result.status === 'rejected'
        ? [`Không tải được đơn phân loại của ${requests[index].hub.name} ngày ${requests[index].date}.`]
        : []
    ));

    return {
      plans: plans.sort((left, right) => (
        left.serviceDate.localeCompare(right.serviceDate)
        || left.hub.name.localeCompare(right.hub.name)
      )),
      warnings,
    };
  },

  /** Aggregate daily procurement plans without mixing them with physical inbound tasks. */
  async getProcurementWeek(
    assignedHubs: AssignedHubDto[],
    dates: string[],
  ): Promise<HubProcurementDayPlan[]> {
    const plans = await Promise.all(
      assignedHubs.flatMap((hub) => (
        dates.map(async (date): Promise<HubProcurementDayPlan> => ({
          ...await this.getProcurementPlan(hub.hubId, date),
          hub,
        }))
      )),
    );

    const catalog = await getHubProductCatalog(
      plans.flatMap((plan) => plan.batches.map((batch) => batch.marketId)),
    );
    const plansWithBatches = plans.filter((plan) => plan.batches.length > 0);
    const orderDetailResults = await Promise.allSettled(plansWithBatches.map((plan) => (
      getOrdersByRestaurant(plan.hubId, plan.date, true)
    )));
    const detailsByPlan = new Map<string, ReadonlyMap<string, HubProcurementOrderDto>>();
    orderDetailResults.forEach((result, index) => {
      if (result.status !== 'fulfilled') return;
      const enriched = enrichRestaurantOrders(result.value, catalog);
      const plan = plansWithBatches[index];
      detailsByPlan.set(`${plan.hubId}:${plan.date}`, mapProcurementOrders(enriched));
    });
    const enrichedPlans = plans.map((plan): HubProcurementDayPlan => ({
      ...plan,
      batches: plan.batches.map((batch) => {
        const orderDetails = detailsByPlan.get(`${plan.hubId}:${plan.date}`);
        return {
          ...batch,
          items: batch.items.map((item) => ({
            ...item,
            unit: item.unit
              ?? catalog.byMarketProductId.get(item.marketProductId)?.unit
              ?? null,
          })),
          orders: batch.orderIds.flatMap((orderId) => {
            const order = orderDetails?.get(orderId);
            return order ? [order] : [];
          }),
        };
      }),
    }));

    return enrichedPlans.sort((left, right) => (
      left.date.localeCompare(right.date) || left.hub.name.localeCompare(right.hub.name)
    ));
  },

  /** Confirm an expected inbound delivery using the BE scan contract (code = inbound id). */
  async confirmInbound(inboundId: string): Promise<HubInboundDto> {
    const { data } = await apiClient.post<HubInboundDto>('/api/v1/hubs/scan', {
      code: inboundId,
    });
    return data;
  },

  async recordDiscrepancy(
    hubId: string,
    inboundId: string,
    request: RecordHubDiscrepancyRequest,
  ): Promise<HubDiscrepancyDto> {
    const { data } = await apiClient.post<HubDiscrepancyDto>(
      `/api/v1/hubs/${hubId}/inbound/${inboundId}/discrepancy`,
      request,
    );
    return data;
  },

  async getDiscrepancies(hubId: string, status?: string): Promise<HubDiscrepancyDto[]> {
    const discrepancies: HubDiscrepancyDto[] = [];
    let cursor: string | undefined;
    do {
      const page = await getCursorPaged<HubDiscrepancyDto>(
        `/api/v1/hubs/${hubId}/discrepancies`,
        { params: { status, cursor, page_size: PENDING_PAGE_SIZE } },
      );
      discrepancies.push(...page.data);
      cursor = page.meta.nextCursor ?? undefined;
    } while (cursor);
    return discrepancies;
  },
};
