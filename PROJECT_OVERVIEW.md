# FreshFlow App — Tổng quan dự án

## Giới thiệu

**FreshFlow** là nền tảng thu mua thực phẩm thông minh, xây dựng trên React Native (Expo). Ứng dụng phục vụ nhiều vai trò trong chuỗi cung ứng thực phẩm: từ nhà hàng đặt hàng, kiosk cập nhật giá, nhân viên hub xử lý hàng hoá, tài xế giao hàng, đến quản trị viên theo dõi toàn hệ thống.

---

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Framework | React Native 0.81 + Expo 54 |
| Ngôn ngữ | TypeScript 5.3 |
| Navigation | React Navigation 6 (Stack + Bottom Tabs) |
| State management | Zustand 5 (persist với SecureStore) |
| Server state / caching | TanStack React Query 5 |
| Form | React Hook Form + Zod |
| HTTP client | Axios |
| Real-time | Microsoft SignalR 8 |
| Maps & GPS | react-native-maps + expo-location |
| Push notification | expo-notifications |
| Secure storage | expo-secure-store |
| Animation | react-native-reanimated 4 |

---

## Kiến trúc thư mục

```
src/
├── api/                  # Axios instance, interceptors, danh sách endpoints
├── config/               # env, theme, queryClient, secure storage
├── constants/            # colors, roles, status, routes
├── types/                # Kiểu dữ liệu chung (api, navigation, common)
├── store/                # Zustand stores (auth, pricing, notification)
├── navigation/           # AppNavigator, stacks, tabs theo vai trò
├── providers/            # AppProviders, QueryProvider, ThemeProvider
├── services/
│   ├── signalr/          # SignalR client, pricing hub, order hub
│   ├── storage/          # SecureStorage wrapper
│   └── notification/     # Push notification service
├── hooks/                # useDebounce, usePermissions, useNetwork
├── utils/                # currency, date, validation, formatter
├── components/
│   ├── ui/               # Button, Input, Card (design system cơ bản)
│   ├── common/           # EmptyState, ErrorView, Loading
│   ├── layout/           # ScreenContainer, Header
│   └── forms/            # FormInput, PasswordInput
├── features/             # Tính năng theo module (xem bên dưới)
└── screens/              # Màn hình dùng chung (Notifications, Admin, Splash)
```

---

## Vai trò người dùng

```
Chưa đăng nhập → AuthStack (LoginScreen)
         │
         ├── RESTAURANT    → RestaurantTabs   (Orders, Pricing, Tracking)
         ├── KIOSK_STAFF   → KioskStack       (Dashboard, Inventory, UpdatePrice)
         ├── HUB_STAFF     → HubStack         (Dashboard, CheckIn, Sorting)
         ├── DRIVER        → DriverStack      (Home, StopList, Navigation)
         └── ADMIN         → AdminTabs        (Analytics, Logistics, Users, Settings)
```

Navigation được điều hướng tự động theo `role` trong `authStore` — xem [AppNavigator](src/navigation/AppNavigator.tsx).

---

## Các module tính năng (src/features/)

### `auth`
- Đăng nhập bằng email/password
- Token được lưu vào SecureStore, tự động gắn vào mọi request qua Axios interceptor
- Zustand `authStore` persist phiên đăng nhập

### `pricing`
- Nhà hàng xem danh sách giá thực phẩm hiện tại
- Kiosk Staff cập nhật giá tại điểm thu mua
- Giá cập nhật real-time qua SignalR `pricing` hub

### `orders`
- Nhà hàng tạo, xem, hủy đơn hàng
- Vòng đời đơn hàng: `PENDING → CONFIRMED → IN_HUB → DELIVERING → DELIVERED` (hoặc `CANCELLED`)
- Màn hình: OrderList, CreateOrder, OrderDetail

### `hub`
- Hub Staff nhận hàng từ thị trường (check-in batch)
- Phân loại/sorting hàng hoá theo đơn
- Dashboard hiển thị hàng về trong ngày và tuyến giao

### `logistics`
- Admin xem và tối ưu tuyến giao (route optimization)
- Phân công tài xế cho từng tuyến
- Màn hình: LogisticsDashboard, RouteDetail

### `delivery`
- Tài xế xem route trong ngày, danh sách điểm dừng
- Theo dõi GPS real-time qua `locationTracker` service (background task)
- Nhà hàng track đơn hàng theo thời gian thực

### `inventory`
- Kiosk Staff quản lý tồn kho tại điểm

### `analytics`
- Admin theo dõi xu hướng giá (BUY_NOW / WAIT)
- Hiệu suất giao hàng (on-time rate, số route hoàn thành)

---

## Real-time (SignalR)

`SignalRClient` (`src/services/signalr/signalr.client.ts`) quản lý nhiều hub connection song song:

| Hub | Dùng bởi | Sự kiện |
|---|---|---|
| `pricing` | Restaurant, Kiosk | Cập nhật giá mới |
| `order` | Restaurant, Hub, Driver | Thay đổi trạng thái đơn |

Kết nối tự động reconnect, xác thực bằng Bearer token từ SecureStore.

---

## Vòng đời đơn hàng

```
Restaurant tạo đơn
        │  PENDING
        ▼
   Hub xác nhận
        │  CONFIRMED
        ▼
  Hàng về Hub
        │  IN_HUB
        ▼
  Tài xế lấy hàng
        │  DELIVERING
        ▼
  Giao thành công
           DELIVERED

  (Có thể hủy ở bất kỳ bước nào → CANCELLED)
```

---

## Cấu hình môi trường

File `.env` (không commit):

```env
EXPO_PUBLIC_API_URL=http://localhost:5000
EXPO_PUBLIC_SIGNALR_URL=http://localhost:5000/hubs
EXPO_PUBLIC_APP_ENV=development
```

---

## Chạy dự án

```bash
npm install
npx expo start          # chạy Expo dev server
npx expo start --android
npx expo start --ios
```

---

## API Endpoints chính

| Nhóm | Endpoint |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Pricing | `GET /pricing`, `PUT /pricing/:id` |
| Orders | `GET /orders`, `POST /orders`, `GET /orders/:id`, `PUT /orders/:id/cancel` |
| Hub | `GET /hub/incoming`, `POST /hub/check-in`, `POST /hub/sort` |
| Logistics | `GET /logistics/routes`, `POST /logistics/optimize`, `PUT /logistics/routes/:id/assign` |
| Delivery | `GET /delivery/my-route`, `PUT /delivery/stops/:id/status`, `POST /delivery/location` |
| Inventory | `GET /inventory`, `PUT /inventory/:id` |
| Analytics | `GET /analytics/price-trend`, `GET /analytics/demand`, `GET /analytics/delivery` |

---

## Điểm đặc biệt

- **Role-based navigation**: mỗi vai trò có stack/tab riêng, không có màn hình thừa
- **Secure persistence**: token và session lưu trong `expo-secure-store`, không lộ ra AsyncStorage thường
- **Background GPS**: tài xế tracking vị trí liên tục kể cả khi app ở background (expo-task-manager)
- **Optimistic UI**: React Query xử lý cache, refetch, loading state nhất quán toàn app
