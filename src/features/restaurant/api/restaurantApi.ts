import { apiClient } from '../../../services/api/client';

export interface RestaurantProfileDto {
  name: string;
  address: string;
  contactPerson: string;
  pickupStart: string;
  pickupEnd: string;
}

// API trả về "HH:MM:SS", chỉ giữ "HH:MM"
function toHHMM(t: string): string {
  if (!t) return '';
  return t.slice(0, 5);
}

function normalizeDto(data: RestaurantProfileDto): RestaurantProfileDto {
  return { ...data, pickupStart: toHHMM(data.pickupStart), pickupEnd: toHHMM(data.pickupEnd) };
}

export const restaurantApi = {
  async getRestaurantProfile(): Promise<RestaurantProfileDto> {
    const { data } = await apiClient.get<RestaurantProfileDto>('/api/v1/restaurants/me/profile');
    return normalizeDto(data);
  },

  async updateRestaurantProfile(payload: RestaurantProfileDto): Promise<RestaurantProfileDto> {
    const { data } = await apiClient.put<RestaurantProfileDto>(
      '/api/v1/restaurants/me/profile',
      payload,
    );
    return normalizeDto(data);
  },
};
