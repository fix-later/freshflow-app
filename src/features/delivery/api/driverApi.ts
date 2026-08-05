import { apiClient } from '../../../services/api/client';
import type {
  AttachProofOfDeliveryRequest,
  AttachProofOfDeliveryResponseDto,
  ConfirmPickupRequest,
  ConfirmPickupResponse,
  DeliveryIssueResponseDto,
  DeliveryIssueType,
  DeliveryStatusUpdate,
  DriverRouteDto,
  LoadingManifestDto,
  ProofOfDeliveryUploadSignature,
  ReportDeliveryIssueRequest,
  StartRouteResponseDto,
  UpdateDeliveryStatusRequest,
  UpdateDeliveryStatusResponseDto,
} from '../types/delivery.types';

/**
 * Driver / Delivery API — consumed by the driver-role screens under
 * src/features/delivery/screens. All endpoints require role = driver and an
 * authenticated Bearer token (attached automatically by apiClient).
 */
export const driverApi = {
  /** GET /api/v1/driver/routes — route(s) assigned to the driver. Supports ?date=yyyy-MM-dd */
  async getTodayRoutes(date?: string): Promise<DriverRouteDto[]> {
    const { data } = await apiClient.get('/api/v1/driver/routes', {
      params: date ? { date } : undefined,
    });
    return data;
  },

  /** POST /api/v1/driver/routes/{routeId}/reorder — persist custom stop sequence on server. */
  async reorderRoute(routeId: string, stopOrder: string[]): Promise<void> {
    await apiClient.post(`/api/v1/driver/routes/${routeId}/reorder`, { stopOrder });
  },

  /**
   * GET /api/v1/logistics/routes/{routeId}/loading-manifest — the real orderIds
   * for this route's restaurant stops, needed to build the confirm-pickup checklist.
   */
  async getLoadingManifest(routeId: string): Promise<LoadingManifestDto> {
    const { data } = await apiClient.get(`/api/v1/logistics/routes/${routeId}/loading-manifest`);
    return data;
  },

  /** POST /api/v1/driver/routes/{routeId}/start — mark the route as started. */
  async startRoute(routeId: string): Promise<StartRouteResponseDto> {
    const { data } = await apiClient.post(`/api/v1/driver/routes/${routeId}/start`);
    return data;
  },

  /**
   * POST /api/v1/driver/routes/{routeId}/confirm-pickup — confirm hub pickup for
   * the given orders; the backend creates one delivery per order and returns
   * their ids.
   */
  async confirmPickup(routeId: string, orderIds: string[]): Promise<ConfirmPickupResponse> {
    const body: ConfirmPickupRequest = { orderIds };
    const { data } = await apiClient.post(`/api/v1/driver/routes/${routeId}/confirm-pickup`, body);
    return data;
  },

  /**
   * POST /api/v1/driver/deliveries/{deliveryId}/proof-of-delivery/upload-signature
   * Requests a signed Cloudinary upload payload for a proof-of-delivery asset
   * (photo or signature image). Use with `uploadProofOfDelivery` in
   * ../services/proofOfDeliveryUpload.ts rather than calling this directly.
   */
  async getProofUploadSignature(deliveryId: string): Promise<ProofOfDeliveryUploadSignature> {
    const { data } = await apiClient.post(
      `/api/v1/driver/deliveries/${deliveryId}/proof-of-delivery/upload-signature`,
    );
    return data;
  },

  /** PUT /api/v1/driver/deliveries/{deliveryId}/proof-of-delivery — attach the uploaded proof URL. */
  async attachProofOfDelivery(
    deliveryId: string,
    proofUrl: string,
  ): Promise<AttachProofOfDeliveryResponseDto> {
    const body: AttachProofOfDeliveryRequest = { proofUrl };
    const { data } = await apiClient.put(
      `/api/v1/driver/deliveries/${deliveryId}/proof-of-delivery`,
      body,
    );
    return data;
  },

  /**
   * PATCH /api/v1/driver/deliveries/{deliveryId}/status — update delivery status.
   * `status` must be UPPERCASE (`ARRIVED` | `DELIVERED` | `FAILED`) — this is the
   * write-side enum, distinct from the lowercase `DeliveryStatus` read off
   * `DriverDeliveryDto.status`. `failureReason` is required when status is `FAILED`.
   */
  async updateDeliveryStatus(
    deliveryId: string,
    status: DeliveryStatusUpdate,
    failureReason: string | null = null,
  ): Promise<UpdateDeliveryStatusResponseDto> {
    const body: UpdateDeliveryStatusRequest = { status, failureReason };
    const { data } = await apiClient.patch(`/api/v1/driver/deliveries/${deliveryId}/status`, body);
    return data;
  },

  /**
   * POST /api/v1/driver/deliveries/{deliveryId}/issues — report a delivery issue.
   * `issueType` must be one of `undeliverable | damaged | customer_rejected | other`
   * (case-insensitive) — `DeliveryIssueCommandValidator` rejects anything else.
   */
  async reportDeliveryIssue(
    deliveryId: string,
    issueType: DeliveryIssueType,
    description: string,
  ): Promise<DeliveryIssueResponseDto> {
    const body: ReportDeliveryIssueRequest = { issueType, description };
    const { data } = await apiClient.post(`/api/v1/driver/deliveries/${deliveryId}/issues`, body);
    return data;
  },
};
