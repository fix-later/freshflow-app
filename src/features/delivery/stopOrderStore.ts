// Shared mutable store for the driver's custom delivery stop order.
// Written by PickupConfirmScreen on confirm, read by StopListScreen on mount.
let _ids: string[] = [];

export const stopOrderStore = {
  get(): string[] {
    return _ids;
  },
  set(ids: string[]) {
    _ids = [...ids];
  },
  isEmpty(): boolean {
    return _ids.length === 0;
  },
};
