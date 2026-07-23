import { apiClient, getCursorPaged } from '../../../services/api/client';

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  payload: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export const notificationApi = {
  list(params?: { cursor?: string; pageSize?: number; isRead?: boolean }) {
    return getCursorPaged<NotificationDto>('/api/v1/notifications', {
      params: {
        cursor: params?.cursor,
        page_size: params?.pageSize ?? 30,
        is_read: params?.isRead,
      },
    });
  },

  async markRead(notificationId: string): Promise<NotificationDto> {
    const { data } = await apiClient.patch<NotificationDto>(
      `/api/v1/notifications/${notificationId}/read`,
    );
    return data;
  },
};
