export type StopStatus = 'pending' | 'arrived' | 'delivered' | 'failed';

export interface MockStopItem {
  name: string;
  quantity: number;
  unit: string;
}

export interface MockStop {
  id: string;
  order: number;
  restaurantName: string;
  address: string;
  contactName: string;
  contactPhone: string;
  items: MockStopItem[];
  status: StopStatus;
  notes?: string;
  lat: number;
  lng: number;
}

export interface MockRoute {
  id: string;
  serviceDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  totalStops: number;
  completedStops: number;
  totalDistanceKm: number;
  vehicle: { plateNumber: string; type: string };
}

export const MOCK_STOPS: MockStop[] = [
  {
    id: 'stop-001', order: 1,
    restaurantName: 'Nhà hàng Phở Bắc',
    address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
    contactName: 'Nguyễn Văn An', contactPhone: '0901234567',
    items: [
      { name: 'Cà chua', quantity: 20, unit: 'kg' },
      { name: 'Thịt bò', quantity: 5, unit: 'kg' },
    ],
    status: 'delivered', lat: 10.7769, lng: 106.7009,
  },
  {
    id: 'stop-002', order: 2,
    restaurantName: 'Quán Bún Bò Huế',
    address: '45 Lê Lợi, Quận 1, TP.HCM',
    contactName: 'Trần Thị Bình', contactPhone: '0912345678',
    items: [{ name: 'Rau sống', quantity: 3, unit: 'kg' }],
    status: 'delivered', lat: 10.7731, lng: 106.6988,
  },
  {
    id: 'stop-003', order: 3,
    restaurantName: 'Nhà hàng Cơm Tấm Sài Gòn',
    address: '78 Hai Bà Trưng, Quận 3, TP.HCM',
    contactName: 'Lê Hoàng Cường', contactPhone: '0923456789',
    items: [
      { name: 'Gạo jasmine', quantity: 20, unit: 'kg' },
      { name: 'Sườn heo', quantity: 8, unit: 'kg' },
      { name: 'Gạo', quantity: 20, unit: 'kg' },
      { name: 'Sườn', quantity: 8, unit: 'kg' },
    ],
    status: 'arrived', lat: 10.7830, lng: 106.6980,
  },
  {
    id: 'stop-004', order: 4,
    restaurantName: 'Lẩu Dê Mỹ Tho',
    address: '12 Đinh Tiên Hoàng, Bình Thạnh, TP.HCM',
    contactName: 'Phạm Thị Dung', contactPhone: '0934567890',
    items: [
      { name: 'Thịt dê', quantity: 6, unit: 'kg' },
      { name: 'Rau muống', quantity: 2, unit: 'kg' },
    ],
    status: 'pending', lat: 10.7960, lng: 106.7150,
  },
  {
    id: 'stop-005', order: 5,
    restaurantName: 'Hải Sản Bình Điền',
    address: '99 Võ Văn Kiệt, Quận 5, TP.HCM',
    contactName: 'Hoàng Văn Em', contactPhone: '0945678901',
    items: [
      { name: 'Tôm tươi', quantity: 4, unit: 'kg' },
      { name: 'Mực', quantity: 3, unit: 'kg' },
    ],
    status: 'pending', lat: 10.7520, lng: 106.6750,
  },
];

export interface MockHub {
  id: string;
  name: string;
  address: string;
  contactPhone: string;
  lat: number;
  lng: number;
}

export const MOCK_HUB: MockHub = {
  id: 'hub-001',
  name: 'Trung tâm phân phối Bình Điền',
  address: '99A Võ Văn Kiệt, Quận 8, TP.HCM',
  contactPhone: '028 1234 5678',
  lat: 10.7520,
  lng: 106.6750,
};

export const MOCK_STOP_MAP: Record<string, MockStop> = Object.fromEntries(
  MOCK_STOPS.map(s => [s.id, s]),
);

export const MOCK_ROUTE: MockRoute = {
  id: 'route-001',
  serviceDate: '13/07/2026',
  status: 'in_progress',
  totalStops: MOCK_STOPS.length,
  completedStops: MOCK_STOPS.filter(s => s.status === 'delivered').length,
  totalDistanceKm: 12.4,
  vehicle: { plateNumber: '51G-123.45', type: 'Van tải' },
};
