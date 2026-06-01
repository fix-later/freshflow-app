import * as signalR from '@microsoft/signalr';
import { SIGNALR_BASE_URL, HUB_PRICING, HUB_ORDERS, HUB_DELIVERY, SIGNALR_RECONNECT } from '../constants';
import { storage } from '../utils/storage';

class SignalRService {
  constructor() {
    this._pricingHub = null;
    this._ordersHub = null;
    this._deliveryHub = null;
  }

  _buildConnection(hubPath) {
    return new signalR.HubConnectionBuilder()
      .withUrl(`${SIGNALR_BASE_URL}${hubPath}`, {
        accessTokenFactory: async () => {
          return await storage.getAccessToken();
        },
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          const delay = Math.min(
            SIGNALR_RECONNECT.INITIAL_DELAY_MS * Math.pow(2, retryContext.previousRetryCount),
            SIGNALR_RECONNECT.MAX_DELAY_MS
          );
          return delay;
        },
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();
  }

  // ── Pricing Hub ─────────────────────────────────────────────────────────────
  async connectPricingHub({ onPriceUpdated, onSignificantPriceAlert, onReconnected } = {}) {
    if (this._pricingHub?.state === signalR.HubConnectionState.Connected) return;

    this._pricingHub = this._buildConnection(HUB_PRICING);

    if (onPriceUpdated) {
      this._pricingHub.on('PriceUpdated', onPriceUpdated);
    }
    if (onSignificantPriceAlert) {
      this._pricingHub.on('SignificantPriceAlert', onSignificantPriceAlert);
    }
    if (onReconnected) {
      this._pricingHub.onreconnected(onReconnected);
    }

    await this._pricingHub.start();
    return this._pricingHub;
  }

  async joinMarketGroup(marketId) {
    if (this._pricingHub?.state === signalR.HubConnectionState.Connected) {
      await this._pricingHub.invoke('JoinMarketGroup', marketId);
    }
  }

  async leaveMarketGroup(marketId) {
    if (this._pricingHub?.state === signalR.HubConnectionState.Connected) {
      await this._pricingHub.invoke('LeaveMarketGroup', marketId);
    }
  }

  async disconnectPricingHub() {
    if (this._pricingHub) {
      await this._pricingHub.stop();
      this._pricingHub = null;
    }
  }

  // ── Orders Hub ──────────────────────────────────────────────────────────────
  async connectOrdersHub({ onOrderStatusChanged, onOrderGrouped, onPaymentFailed, onReconnected } = {}) {
    if (this._ordersHub?.state === signalR.HubConnectionState.Connected) return;

    this._ordersHub = this._buildConnection(HUB_ORDERS);

    if (onOrderStatusChanged) {
      this._ordersHub.on('OrderStatusChanged', onOrderStatusChanged);
    }
    if (onOrderGrouped) {
      this._ordersHub.on('OrderGrouped', onOrderGrouped);
    }
    if (onPaymentFailed) {
      this._ordersHub.on('PaymentFailed', onPaymentFailed);
    }
    if (onReconnected) {
      this._ordersHub.onreconnected(onReconnected);
    }

    await this._ordersHub.start();
    return this._ordersHub;
  }

  async disconnectOrdersHub() {
    if (this._ordersHub) {
      await this._ordersHub.stop();
      this._ordersHub = null;
    }
  }

  // ── Delivery Hub ────────────────────────────────────────────────────────────
  async connectDeliveryHub({ onDeliveryStarted, onDeliveryCompleted, onDeliveryStatusChanged, onHubDiscrepancy, onReconnected } = {}) {
    if (this._deliveryHub?.state === signalR.HubConnectionState.Connected) return;

    this._deliveryHub = this._buildConnection(HUB_DELIVERY);

    if (onDeliveryStarted) {
      this._deliveryHub.on('DeliveryStarted', onDeliveryStarted);
    }
    if (onDeliveryCompleted) {
      this._deliveryHub.on('DeliveryCompleted', onDeliveryCompleted);
    }
    if (onDeliveryStatusChanged) {
      this._deliveryHub.on('DeliveryStatusChanged', onDeliveryStatusChanged);
    }
    if (onHubDiscrepancy) {
      this._deliveryHub.on('HubDiscrepancyNotification', onHubDiscrepancy);
    }
    if (onReconnected) {
      this._deliveryHub.onreconnected(onReconnected);
    }

    await this._deliveryHub.start();
    return this._deliveryHub;
  }

  async disconnectDeliveryHub() {
    if (this._deliveryHub) {
      await this._deliveryHub.stop();
      this._deliveryHub = null;
    }
  }

  // ── Disconnect all ──────────────────────────────────────────────────────────
  async disconnectAll() {
    await Promise.allSettled([
      this.disconnectPricingHub(),
      this.disconnectOrdersHub(),
      this.disconnectDeliveryHub(),
    ]);
  }
}

export const signalRService = new SignalRService();
