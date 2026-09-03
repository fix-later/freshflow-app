export type MarketDispatchStatus = 'ready' | 'on_route' | 'at_hub';

export type MarketDispatch = {
  id: string;
  marketName: string;
  shortName: string;
  orderCount: number;
  weightKg: number;
  pickupWindow: string;
  distanceKm: number;
  vehicle: string;
  driver: string;
  fillRate: number;
  status: MarketDispatchStatus;
};

export type InboundTrip = {
  id: string;
  code: string;
  marketName: string;
  vehicle: string;
  driver: string;
  eta: string;
  dock: string;
  expectedCrates: number;
  receivedCrates: number;
  expectedKg: number;
  status: 'approaching' | 'waiting' | 'checking' | 'received';
};

export type DeliveryStop = {
  id: string;
  sequence: number;
  restaurant: string;
  district: string;
  timeWindow: string;
  orderCount: number;
};

export type DeliveryRoute = {
  id: string;
  code: string;
  zone: string;
  status: 'draft' | 'optimized' | 'ready';
  orderCount: number;
  totalKg: number;
  distanceKm: number;
  durationMinutes: number;
  savingKm: number;
  vehicle: string | null;
  driver: string | null;
  fillRate: number;
  stops: DeliveryStop[];
};

export const MARKET_DISPATCHES: MarketDispatch[] = [
  {
    id: 'market-1',
    marketName: 'Chợ đầu mối Bình Điền',
    shortName: 'Bình Điền',
    orderCount: 18,
    weightKg: 560,
    pickupWindow: '04:30 - 06:00',
    distanceKm: 12.4,
    vehicle: '51D-482.16',
    driver: 'Nguyễn Minh Khang',
    fillRate: 80,
    status: 'on_route',
  },
  {
    id: 'market-2',
    marketName: 'Chợ đầu mối Thủ Đức',
    shortName: 'Thủ Đức',
    orderCount: 14,
    weightKg: 420,
    pickupWindow: '05:00 - 06:30',
    distanceKm: 18.7,
    vehicle: '51C-731.05',
    driver: 'Trần Quốc Duy',
    fillRate: 70,
    status: 'ready',
  },
  {
    id: 'market-3',
    marketName: 'Chợ đầu mối Hóc Môn',
    shortName: 'Hóc Môn',
    orderCount: 10,
    weightKg: 260,
    pickupWindow: '05:30 - 07:00',
    distanceKm: 16.2,
    vehicle: '51D-195.44',
    driver: 'Lê Hoàng Nam',
    fillRate: 52,
    status: 'at_hub',
  },
];

export const MARKET_VEHICLES = [
  { id: 'vehicle-1', plate: '51D-482.16', capacityKg: 700, type: 'Xe tải lạnh 1.5T', available: true },
  { id: 'vehicle-2', plate: '51C-731.05', capacityKg: 600, type: 'Xe tải thùng 1.25T', available: true },
  { id: 'vehicle-3', plate: '51D-195.44', capacityKg: 500, type: 'Xe tải lạnh 1T', available: true },
  { id: 'vehicle-4', plate: '51C-260.83', capacityKg: 450, type: 'Xe tải thùng 1T', available: true },
  { id: 'vehicle-5', plate: '51D-908.72', capacityKg: 700, type: 'Xe tải lạnh 1.5T', available: false },
];

export const MARKET_DRIVERS = [
  { id: 'driver-1', name: 'Nguyễn Minh Khang', phone: '090 382 1162', available: true },
  { id: 'driver-2', name: 'Trần Quốc Duy', phone: '093 731 0505', available: true },
  { id: 'driver-3', name: 'Lê Hoàng Nam', phone: '091 195 4440', available: true },
  { id: 'driver-4', name: 'Phạm Anh Tú', phone: '098 260 8383', available: true },
];

export const INBOUND_TRIPS: InboundTrip[] = [
  {
    id: 'inbound-1',
    code: 'BD-0713-01',
    marketName: 'Bình Điền',
    vehicle: '51D-482.16',
    driver: 'Nguyễn Minh Khang',
    eta: '06:42',
    dock: 'Cửa 02',
    expectedCrates: 38,
    receivedCrates: 0,
    expectedKg: 560,
    status: 'approaching',
  },
  {
    id: 'inbound-2',
    code: 'TD-0713-01',
    marketName: 'Thủ Đức',
    vehicle: '51C-731.05',
    driver: 'Trần Quốc Duy',
    eta: '07:05',
    dock: 'Chờ xếp cửa',
    expectedCrates: 31,
    receivedCrates: 0,
    expectedKg: 420,
    status: 'waiting',
  },
  {
    id: 'inbound-3',
    code: 'HM-0713-01',
    marketName: 'Hóc Môn',
    vehicle: '51D-195.44',
    driver: 'Lê Hoàng Nam',
    eta: 'Đã đến 06:18',
    dock: 'Cửa 01',
    expectedCrates: 22,
    receivedCrates: 18,
    expectedKg: 260,
    status: 'checking',
  },
  {
    id: 'inbound-4',
    code: 'HM-0713-00',
    marketName: 'Hóc Môn',
    vehicle: '51C-260.83',
    driver: 'Phạm Anh Tú',
    eta: 'Đã nhận 05:52',
    dock: 'Cửa 01',
    expectedCrates: 16,
    receivedCrates: 16,
    expectedKg: 190,
    status: 'received',
  },
];

export const DELIVERY_ROUTES: DeliveryRoute[] = [
  {
    id: 'route-1',
    code: 'RT-Q1Q3-01',
    zone: 'Quận 1 · Quận 3',
    status: 'optimized',
    orderCount: 12,
    totalKg: 348,
    distanceKm: 21.6,
    durationMinutes: 96,
    savingKm: 7.8,
    vehicle: '51D-482.16',
    driver: 'Nguyễn Minh Khang',
    fillRate: 87,
    stops: [
      { id: 'stop-1', sequence: 1, restaurant: 'Bếp Nhà Mộc', district: 'Quận 3', timeWindow: '08:00 - 08:30', orderCount: 3 },
      { id: 'stop-2', sequence: 2, restaurant: 'An Nam Kitchen', district: 'Quận 1', timeWindow: '08:35 - 09:00', orderCount: 4 },
      { id: 'stop-3', sequence: 3, restaurant: 'Lúa Bistro', district: 'Quận 1', timeWindow: '09:05 - 09:30', orderCount: 5 },
    ],
  },
  {
    id: 'route-2',
    code: 'RT-BT-PN-02',
    zone: 'Bình Thạnh · Phú Nhuận',
    status: 'ready',
    orderCount: 16,
    totalKg: 456,
    distanceKm: 27.3,
    durationMinutes: 118,
    savingKm: 9.2,
    vehicle: null,
    driver: null,
    fillRate: 76,
    stops: [
      { id: 'stop-4', sequence: 1, restaurant: 'Mùa Bistro', district: 'Phú Nhuận', timeWindow: '08:00 - 08:40', orderCount: 5 },
      { id: 'stop-5', sequence: 2, restaurant: 'Bếp Xanh', district: 'Bình Thạnh', timeWindow: '08:45 - 09:20', orderCount: 6 },
      { id: 'stop-6', sequence: 3, restaurant: 'Vị Quê', district: 'Bình Thạnh', timeWindow: '09:25 - 10:00', orderCount: 5 },
    ],
  },
  {
    id: 'route-3',
    code: 'RT-Q7-NB-03',
    zone: 'Quận 7 · Nhà Bè',
    status: 'draft',
    orderCount: 14,
    totalKg: 436,
    distanceKm: 34.8,
    durationMinutes: 136,
    savingKm: 0,
    vehicle: null,
    driver: null,
    fillRate: 73,
    stops: [
      { id: 'stop-7', sequence: 1, restaurant: 'Cơm Niêu Phố', district: 'Quận 7', timeWindow: '08:30 - 09:00', orderCount: 5 },
      { id: 'stop-8', sequence: 2, restaurant: 'Vườn Mộc', district: 'Quận 7', timeWindow: '09:05 - 09:40', orderCount: 4 },
      { id: 'stop-9', sequence: 3, restaurant: 'Bến Xanh', district: 'Nhà Bè', timeWindow: '09:45 - 10:30', orderCount: 5 },
    ],
  },
];

export const HUB_TODAY = {
  hubName: 'Hub FreshFlow Tân Bình',
  serviceDate: 'Thứ Hai, 13/07/2026',
  orderCount: 42,
  totalWeightKg: 1240,
  marketCount: 3,
  availableVehicles: 4,
  totalVehicles: 5,
  receivedPercent: 36,
  sortedPercent: 24,
  dispatchedPercent: 0,
};

export type SortItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
};

export type RestaurantSortGroup = {
  id: string;
  orderCode: string;
  restaurantName: string;
  district: string;
  slot: string;
  status: 'not_started' | 'in_progress' | 'completed';
  items: SortItem[];
};

export const SORT_GROUPS: RestaurantSortGroup[] = [
  {
    id: 'sort-1', orderCode: 'FF-240713-018', restaurantName: 'Bếp Nhà Mộc', district: 'Quận 3', slot: 'A-01', status: 'in_progress',
    items: [
      { id: 's-1', name: 'Cà chua beef', quantity: 18, unit: 'kg' },
      { id: 's-2', name: 'Cải thìa', quantity: 12, unit: 'kg' },
      { id: 's-3', name: 'Khoai tây Đà Lạt', quantity: 25, unit: 'kg' },
    ],
  },
  {
    id: 'sort-2', orderCode: 'FF-240713-021', restaurantName: 'An Nam Kitchen', district: 'Quận 1', slot: 'A-02', status: 'not_started',
    items: [
      { id: 's-4', name: 'Dưa leo', quantity: 16, unit: 'kg' },
      { id: 's-5', name: 'Xà lách lô lô', quantity: 10, unit: 'kg' },
      { id: 's-6', name: 'Hành tây', quantity: 14, unit: 'kg' },
    ],
  },
  {
    id: 'sort-3', orderCode: 'FF-240713-024', restaurantName: 'Lúa Bistro', district: 'Quận 1', slot: 'A-03', status: 'completed',
    items: [
      { id: 's-7', name: 'Cà chua beef', quantity: 22, unit: 'kg' },
      { id: 's-8', name: 'Ớt chuông đỏ', quantity: 8, unit: 'kg' },
    ],
  },
];

export const HANDOFF_PACKAGES = [
  { id: 'pkg-1', code: 'PK-A01', restaurant: 'Bếp Nhà Mộc', packageCount: 3 },
  { id: 'pkg-2', code: 'PK-A02', restaurant: 'An Nam Kitchen', packageCount: 3 },
  { id: 'pkg-3', code: 'PK-A03', restaurant: 'Lúa Bistro', packageCount: 2 },
];
