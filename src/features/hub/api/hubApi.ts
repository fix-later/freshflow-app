import { apiClient, getCursorPaged } from '../../../services/api/client';

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
}

export interface HubProcurementBatchDto {
  batchId: string;
  marketId: string;
  status: HubProcurementStatus;
  handedOffAt: string | null;
  orderIds: string[];
  items: HubProcurementItemDto[];
}

export interface HubProcurementPlanDto {
  hubId: string;
  date: string;
  batches: HubProcurementBatchDto[];
}

export interface HubProcurementDayPlan extends HubProcurementPlanDto {
  hub: AssignedHubDto;
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

    return plans.sort((left, right) => (
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
};
