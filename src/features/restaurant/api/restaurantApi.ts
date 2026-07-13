import { apiClient } from '../../../services/api/client';

export type RestaurantApprovalStatus = 'pending' | 'active' | 'suspended';

export interface RestaurantProfileDto {
  restaurantId: string;
  name: string;
  status: RestaurantApprovalStatus | null;
  address: string;
  contactPerson: string;
  pickupStart: string;
  pickupEnd: string;
  updatedAt: string;
  businessLicenseUrl: string | null;
}

export interface UpdateRestaurantProfilePayload {
  name: string;
  address: string | null;
  contactPerson: string | null;
  pickupStart: string | null;
  pickupEnd: string | null;
  businessLicenseUrl: string | null;
}

export interface ApprovalStatusDto {
  restaurantId: string;
  status: RestaurantApprovalStatus;
  updatedAt: string;
}

interface RestaurantProfileApiDto {
  restaurantId: string;
  name: string;
  status?: RestaurantApprovalStatus;
  address: string | null;
  contactPerson: string | null;
  pickupStart: string | null;
  pickupEnd: string | null;
  updatedAt: string;
  businessLicenseUrl?: string | null;
}

function toHHMM(time: string | null | undefined): string {
  if (!time) return '';
  return time.slice(0, 5);
}

function normalizeDto(data: RestaurantProfileApiDto): RestaurantProfileDto {
  return {
    restaurantId: data.restaurantId,
    name: data.name ?? '',
    status: data.status ?? null,
    address: data.address ?? '',
    contactPerson: data.contactPerson ?? '',
    pickupStart: toHHMM(data.pickupStart),
    pickupEnd: toHHMM(data.pickupEnd),
    updatedAt: data.updatedAt,
    businessLicenseUrl: data.businessLicenseUrl ?? null,
  };
}

export const restaurantApi = {
  async getRestaurantProfile(): Promise<RestaurantProfileDto> {
    const { data } = await apiClient.get<RestaurantProfileApiDto>(
      '/api/v1/restaurants/me/profile',
    );
    return normalizeDto(data);
  },

  async updateRestaurantProfile(
    payload: UpdateRestaurantProfilePayload,
  ): Promise<RestaurantProfileDto> {
    const { data } = await apiClient.put<RestaurantProfileApiDto>(
      '/api/v1/restaurants/me/profile',
      payload,
    );
    return normalizeDto(data);
  },

  async getApprovalStatus(): Promise<ApprovalStatusDto> {
    const { data } = await apiClient.get<ApprovalStatusDto>(
      '/api/v1/restaurants/me/approval-status',
    );
    return data;
  },
};
