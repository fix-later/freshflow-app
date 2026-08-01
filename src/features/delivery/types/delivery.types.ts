// Types for the Driver / Delivery API — consumed by src/features/delivery/api/driverApi.ts.
//
// Verified directly against the backend source (freshflow-backend/src/Modules/Logistics),
// not just the Postman collection — see DriverController.cs and the DTOs under
// FreshFlow.Logistics.Application/Dtos + each Commands/<Name>/*Response.cs.

/**
 * Status of a `Delivery` row as returned by the API (GET routes/today, and as the
 * read-side value in PATCH .../status responses). Lowercase — mirrors
 * `Delivery.StatusPending/Arrived/Delivered/Failed` in the domain entity.
 *
 * NOT the same casing as what you send to update it — see `DeliveryStatusUpdate`.
 */
export type DeliveryStatus = 'pending' | 'arrived' | 'delivered' | 'failed';

/**
 * Value accepted by the request body of PATCH /driver/deliveries/{id}/status.
 * UPPERCASE — `UpdateDeliveryStatusCommandValidator` matches this exact casing
 * (`AllowedStatuses = ["ARRIVED", "DELIVERED", "FAILED"]`); sending lowercase
 * values fails validation. There is no "PENDING" transition — pending is the
 * initial state set by confirm-pickup, never a target status here.
 */
export type DeliveryStatusUpdate = 'ARRIVED' | 'DELIVERED' | 'FAILED';

/** `RouteStatus` enum values (Logistics.Domain/Enums/RouteStatus.cs). */
export type RouteStatus =
  | 'planned'
  | 'selected'
  | 'reviewed'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/** `StopEntityType` enum values — a stop is a physical waypoint, not a per-order delivery. */
export type StopEntityType = 'market' | 'restaurant';

/** Allowed `issueType` values (`DeliveryIssue.Type*` constants), matched case-insensitively. */
export type DeliveryIssueType = 'undeliverable' | 'damaged' | 'customer_rejected' | 'other';

/**
 * A physical waypoint on the route (hub/market or restaurant) — mirrors `RouteStopDto`.
 * Carries no order/delivery info; correlate to orders via `entityId` (= restaurantId
 * for `entityType: 'restaurant'`) against `DriverRouteDto.deliveries[].orderId`'s order.
 */
export interface DriverRouteStopDto {
  stopOrder: number;
  entityType: StopEntityType;
  entityId: string;
  entityName: string;
  latitude: number;
  longitude: number;
  estimatedArrivalAt: string | null;
  estimatedDepartureAt: string | null;
}

/** One order's delivery progress on the route — mirrors `DriverDeliveryDto`. Created by confirm-pickup. */
export interface DriverDeliveryDto {
  deliveryId: string;
  orderId: string;
  sequenceNumber: number;
  status: DeliveryStatus;
  estimatedArrival: string | null;
  actualArrival: string | null;
}

/**
 * Mirrors `DriverRouteDto` exactly: stops (waypoints) and deliveries (per-order
 * status) are separate lists, not merged. No `vehicle` field exists on this DTO.
 */
export interface DriverRouteDto {
  routeId: string;
  serviceDate: string;
  status: RouteStatus;
  stops: DriverRouteStopDto[];
  deliveries: DriverDeliveryDto[];
}

// ─── GET /logistics/routes/{routeId}/loading-manifest ──────────────────────────
// Not under /driver — lives in RoutesController, mirrors LoadingManifestDto. Requires
// the backend to grant the `driver` role (+ a route-ownership check) on this action;
// until then this call 403s for a driver token.

/** One product line to load, tied to the order/order-item it belongs to. Mirrors `LoadingLineDto`. */
export interface LoadingLineDto {
  orderId: string;
  orderItemId: string;
  productName: string;
  quantity: number;
  capacityKg: number | null;
}

/**
 * One restaurant stop's lines to load. `stopOrder` here is the *loading* sequence
 * (reverse of the delivery `stopOrder` on `DriverRouteStopDto` — furthest stop
 * loaded first/innermost), not the order stops get visited in.
 */
export interface LoadingStopDto {
  stopOrder: number;
  restaurantId: string;
  restaurantName: string;
  lines: LoadingLineDto[];
}

/** Mirrors `LoadingManifestDto` — the only source of real order IDs before confirm-pickup. */
export interface LoadingManifestDto {
  routeId: string;
  status: RouteStatus;
  serviceDate: string;
  stops: LoadingStopDto[];
}

// ─── POST /api/v1/driver/routes/{routeId}/reorder ──────────────────────────────

export interface ReorderRouteRequest {
  stopOrder: string[];
}

// ─── POST /driver/routes/{routeId}/start ───────────────────────────────────────

/** Mirrors `StartRouteResultDto`. */
export interface StartRouteResponseDto {
  routeId: string;
  status: RouteStatus;
  startedOrderCount: number;
}

// ─── POST /driver/routes/{routeId}/confirm-pickup ──────────────────────────────

export interface ConfirmPickupRequest {
  orderIds: string[];
}

/** Mirrors `ConfirmPickupResultDto(RouteId, DeliveryIds)`. */
export interface ConfirmPickupResponse {
  routeId: string;
  deliveryIds: string[];
}

// ─── POST /driver/deliveries/{deliveryId}/proof-of-delivery/upload-signature ───
// Signed Cloudinary upload payload (same convention as the other `*/upload-signature`
// endpoints in the API — products/image, profile/me/avatar, restaurants/me/business-license).

export interface ProofOfDeliveryUploadSignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

// ─── PUT /driver/deliveries/{deliveryId}/proof-of-delivery ─────────────────────

export interface AttachProofOfDeliveryRequest {
  proofUrl: string;
}

/** Mirrors `AttachProofOfDeliveryResponse`. */
export interface AttachProofOfDeliveryResponseDto {
  deliveryId: string;
  proofUrl: string;
}

// ─── PATCH /driver/deliveries/{deliveryId}/status ──────────────────────────────

export interface UpdateDeliveryStatusRequest {
  status: DeliveryStatusUpdate;
  /** Required (non-empty) when `status` is `'FAILED'`, per the FluentValidation rule. */
  failureReason: string | null;
}

/** Mirrors `UpdateDeliveryStatusResponse`. */
export interface UpdateDeliveryStatusResponseDto {
  deliveryId: string;
  routeId: string;
  status: DeliveryStatus;
  actualArrival: string | null;
  failureReason: string | null;
}

// ─── POST /driver/deliveries/{deliveryId}/issues ───────────────────────────────

export interface ReportDeliveryIssueRequest {
  issueType: DeliveryIssueType;
  description: string;
}

/** Mirrors `DeliveryIssueDto` — the created issue record. */
export interface DeliveryIssueResponseDto {
  id: string;
  deliveryId: string;
  issueType: DeliveryIssueType;
  description: string;
  status: string;
  createdAt: string;
}
