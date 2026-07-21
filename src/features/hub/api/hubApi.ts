import { apiClient, getCursorPaged } from '../../../services/api/client';

export interface AssignedHubDto {
  hubId: string;
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
    const pages = await Promise.all(
      assignedHubs.map(async (hub) => {
        const tasks = await getAllPendingInbound(hub.hubId);
        return tasks.map((task): HubInboundTask => ({ ...task, hub }));
      }),
    );

    const inboundTasks = pages
      .flat()
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    return { assignedHubs, inboundTasks };
  },

  /** Confirm an expected inbound delivery using the BE scan contract (code = inbound id). */
  async confirmInbound(inboundId: string): Promise<HubInboundDto> {
    const { data } = await apiClient.post<HubInboundDto>('/api/v1/hubs/scan', {
      code: inboundId,
    });
    return data;
  },
};
