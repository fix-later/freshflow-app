# FreshFlow — Hướng dẫn cấu trúc dự án

> Đọc file này trước khi bắt đầu code. Mục tiêu: biết file nào làm gì, đặt code ở đâu.

---

## 1. Công nghệ chính

| Thành phần        | Package                                 | Trạng thái                                                         |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------ |
| Framework         | React Native 0.81 + Expo 54             | ✅ đã cài                                                           |
| Ngôn ngữ          | TypeScript 5.9 strict                   | ✅ đã cài                                                           |
| Navigation        | React Navigation 7 (Stack + BottomTabs) | ✅ đã cài                                                           |
| Auth state        | React Context                           | ✅ tạm dùng → migrate Zustand sau                                   |
| HTTP client       | axios                                   | ⏳ chưa cài — `npm install axios`                                   |
| Secure storage    | expo-secure-store                       | ⏳ chưa cài — `npx expo install expo-secure-store`                  |
| Server state      | @tanstack/react-query                   | ⏳ chưa cài — `npm install @tanstack/react-query`                   |
| Form              | react-hook-form + zod                   | ⏳ chưa cài — `npm install react-hook-form zod @hookform/resolvers` |
| Global state      | zustand                                 | ⏳ chưa cài — `npm install zustand`                                 |
| Real-time         | @microsoft/signalr                      | ⏳ chưa cài — `npm install @microsoft/signalr`                      |
| Maps + GPS        | expo-location + react-native-maps       | ⏳ chưa cài                                                         |
| Push notification | expo-notifications                      | ⏳ chưa cài                                                         |

---

## 2. Vai trò người dùng (4 roles)

| Role constant  | Tên hiển thị  | Mô tả                                                          |
| -------------- | ------------- | -------------------------------------------------------------- |
| `RESTAURANT`   | Nhà hàng      | Đặt đơn hàng, xem giá, theo dõi giao hàng                      |
| `MARKET_AGENT` | Market Agent  | Đi chợ, cập nhật giá, quản lý tồn kho tại điểm                 |
| `HUB_STAFF`    | Nhân viên Hub | Nhận hàng từ chợ, phân loại, lên kế hoạch tuyến giao           |
| `DRIVER`       | Tài xế        | Nhận tuyến giao, điều hướng GPS, cập nhật trạng thái điểm dừng |

---

## 3. Cấu trúc thư mục tổng quan

```
src/
├── constants/     Hằng số dùng toàn app
├── types/         TypeScript interface dùng chung
├── config/        Biến môi trường + design tokens
├── store/         Auth state (Context → Zustand)
├── providers/     Bọc các provider ở root app
├── navigation/    Điều hướng theo role
├── components/    Component dùng chung (chưa có nhiều)
├── services/      Shared services dùng toàn app (HTTP, storage, realtime, notification)
│   ├── api/           Axios client + interceptors
│   ├── storage/       SecureStore wrapper
│   ├── signalr/       SignalR connection manager
│   └── notification/  Push notification service
├── features/      Module tính năng — MỖI FEATURE TỰ ĐỦ
│   ├── auth/
│   ├── orders/
│   ├── pricing/
│   ├── hub/
│   ├── logistics/
│   ├── delivery/
│   ├── inventory/
│   └── analytics/
└── screens/       Màn hình dùng chung (không thuộc feature nào)
```

---

## 4. Chi tiết từng thư mục gốc

### `src/constants/`
Không bao giờ hardcode màu, tên role, tên route — luôn import từ đây.

| File             | Nội dung                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `colors.ts`      | Tất cả màu của app — `Colors.primary`, `Colors.background`...                            |
| `roles.ts`       | `UserRole.RESTAURANT`, `UserRole.MARKET_AGENT`, `UserRole.HUB_STAFF`, `UserRole.DRIVER`  |
| `orderStatus.ts` | `OrderStatus.PENDING/CONFIRMED/IN_HUB/DELIVERING/DELIVERED/CANCELLED` + label tiếng Việt |
| `routes.ts`      | Tên các route navigation dưới dạng constant                                              |
| `index.ts`       | Re-export tất cả — `import { Colors, UserRole } from '../constants'`                     |

---

### `src/types/`
Type dùng **chung toàn app**. Type chỉ dùng trong 1 feature thì để trong `features/<tên>/types/`.

| File              | Nội dung                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `common.types.ts` | `User`, `Order`, `OrderItem`, `Product`, `Route`, `DeliveryStop`, `InventoryItem`, `HubBatch` |
| `api.types.ts`    | `ApiResponse<T>`, `PaginatedResponse<T>`, `ApiError`, `LoginRequest`, `LoginResponse`         |
| `index.ts`        | Re-export tất cả                                                                              |

---

### `src/config/`

| File       | Nội dung                                                                         |
| ---------- | -------------------------------------------------------------------------------- |
| `env.ts`   | Đọc `EXPO_PUBLIC_*` từ `.env` → dùng qua `ENV.API_URL`, `ENV.SIGNALR_URL`        |
| `theme.ts` | Design tokens: `theme.spacing`, `theme.radius`, `theme.fontSize`, `theme.shadow` |

> ⚠️ **File `.env` không được commit.** Tạo tay ở root dự án:
> ```
> EXPO_PUBLIC_API_URL=http://192.168.x.x:5000
> EXPO_PUBLIC_SIGNALR_URL=http://192.168.x.x:5000/hubs
> EXPO_PUBLIC_APP_ENV=development
> ```

---

### `src/store/`
Hiện dùng React Context. Sau khi cài Zustand sẽ chuyển sang `create()` — interface `AuthStore` giữ nguyên.

| File               | Nội dung                                                                  |
| ------------------ | ------------------------------------------------------------------------- |
| `authStore.ts`     | `AuthContext` + `useAuthStore()` — đọc `user`, `token`, `isAuthenticated` |
| `AuthProvider.tsx` | Component cung cấp context, quản lý `signIn(user, token)` và `signOut()`  |
| `index.ts`         | Re-export `AuthProvider` và `useAuthStore`                                |

**Dùng trong bất kỳ screen nào:**
```tsx
const { user, isAuthenticated, signIn, signOut } = useAuthStore();
```

---

### `src/providers/`
`AppProviders.tsx` bọc toàn bộ app. Thêm provider mới (React Query, Theme...) vào đây.

```
SafeAreaProvider
  └── AuthProvider          ← đã có
        └── QueryProvider   ← thêm sau khi cài react-query
              └── {children}
```

---

### `src/services/`
Shared services dùng **toàn app** — không thuộc feature nào. Chia theo loại:

| Subfolder | Package cần cài | Vai trò |
|---|---|---|
| `api/` | `axios` + `expo-secure-store` | Axios instance, interceptors gắn token, xử lý lỗi 401 |
| `storage/` | `expo-secure-store` | Wrapper đọc/ghi/xóa SecureStore |
| `signalr/` | `@microsoft/signalr` | Quản lý kết nối SignalR (dùng bởi pricing + orders) |
| `notification/` | `expo-notifications` | Đăng ký push token, nhận notification |

**File quan trọng nhất — `services/api/client.ts`:**
```ts
// Tạo 1 lần, tất cả feature dùng chung
export const apiClient = axios.create({ baseURL: ENV.API_URL, timeout: 10_000 });

// Interceptor tự gắn token — feature không cần lo
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor xử lý lỗi tập trung — 401 → xóa token, mất mạng → báo lỗi rõ
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => { ... }
);
```

**Feature gọi API bằng cách import `apiClient`:**
```ts
// features/auth/api/auth.api.ts
import { apiClient } from '../../../services/api/client';

export const authApi = {
  login: (data: LoginRequest) => apiClient.post('/auth/login', data),
  getMe: ()                   => apiClient.get('/auth/me'),
};
```

> **Phân biệt `src/services/` vs `features/*/services/`**
> - `src/services/` = infrastructure dùng chung (HTTP client, SecureStore, SignalR manager)
> - `features/*/services/` = logic nền riêng của feature (GPS tracker, subscribe SignalR event cụ thể)

---

### `src/navigation/`

#### Luồng điều hướng

```
App.tsx
  └── AppProviders
        └── AppNavigator           ← đọc user.role từ useAuthStore
              │
              ├── (chưa đăng nhập) → AuthStack
              │                         └── LoginScreen
              │
              ├── RESTAURANT       → RestaurantTabs (BottomTab)
              │                         ├── Đơn hàng     (OrderListScreen)
              │                         ├── Giá thị trường (PriceListScreen)
              │                         └── Theo dõi     (TrackOrderScreen)
              │
              ├── MARKET_AGENT     → MarketAgentStack (BottomTab)
              │                         ├── Tổng quan    (MarketAgentHomeScreen)
              │                         ├── Tồn kho      (InventoryScreen)
              │                         └── Cập nhật giá (UpdatePriceScreen)
              │
              ├── HUB_STAFF        → HubStack (BottomTab)
              │                         ├── Tổng quan    (HubDashboardScreen)
              │                         ├── Nhận hàng    (CheckInScreen)
              │                         └── Phân loại    (SortingScreen)
              │
              └── DRIVER           → DriverStack (NativeStack — flow tuyến tính)
                                        ├── Trang chủ    (DriverHomeScreen)
                                        ├── Điểm dừng    (StopListScreen)
                                        └── Bản đồ       (NavigationScreen)
```

> **Tại sao Driver dùng Stack thay vì Tab?**
> Driver có flow tuyến tính: vào app → xem route → chọn điểm dừng → mở bản đồ.
> Không có lý do để nhảy ngang giữa các màn, Stack phù hợp hơn.

#### Các file navigation

| File                   | Vai trò                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| `AppNavigator.tsx`     | Đọc `user.role` → render đúng navigator. **Không thêm logic khác vào đây.** |
| `types.ts`             | `ParamList` TypeScript cho tất cả stacks. Cập nhật khi thêm màn hình mới.   |
| `AuthStack.tsx`        | Stack cho flow chưa đăng nhập                                               |
| `RestaurantTabs.tsx`   | BottomTab cho Nhà hàng                                                      |
| `MarketAgentStack.tsx` | BottomTab cho Market Agent                                                  |
| `HubStack.tsx`         | BottomTab cho Hub Staff                                                     |
| `DriverStack.tsx`      | NativeStack cho Tài xế                                                      |

#### Thêm màn hình mới — 3 bước

```
1. Tạo file:  src/features/<tên>/screens/XxxScreen.tsx
2. Khai báo:  src/navigation/types.ts → thêm route vào đúng ParamList
3. Đăng ký:   src/navigation/Xxx(Stack|Tabs).tsx → thêm <Tab.Screen> hoặc <Stack.Screen>
```

---

### `src/components/`
Component UI tái sử dụng **giữa nhiều feature**. Hiện chỉ có `Screen.tsx` (legacy).

> Khi làm feature cần component mới, hỏi: "Component này dùng ở 2+ feature không?"
> - **Có** → đặt vào `src/components/`
> - **Không** → đặt vào `features/<tên>/components/`

---

### `src/screens/`
Màn hình không thuộc feature nào cụ thể.

| File                      | Dùng khi nào                                                    |
| ------------------------- | --------------------------------------------------------------- |
| `SplashScreen.tsx`        | Màn hình loading khi app khởi động (chưa dùng trong navigation) |
| `NotificationsScreen.tsx` | Màn hình thông báo — tất cả role có thể vào                     |

---

## 5. Anatomy của một Feature

Mỗi feature là một **module tự đủ** với 8 subfolder:

```
features/<tên>/
├── api/          Hàm gọi HTTP (Axios) — chỉ fetch, không có state
├── components/   Component UI chỉ dùng trong feature này
├── hooks/        Custom hooks — nối api/ + store/ + React Query
├── screens/      Màn hình — layout + gọi hook, KHÔNG gọi api/ trực tiếp
├── services/     Logic nền: SignalR, GPS background task
├── store/        Zustand store cục bộ (chỉ khi cần local state phức tạp)
├── types/        Interface chỉ dùng trong feature này
└── utils/        Helper thuần túy (transform, format, validate)
```

#### Luồng dữ liệu bắt buộc

```
Screen  ──→  Hook  ──→  API  ──→  Backend
              │            │
           Store        Service
```

- `screens/` **chỉ** import từ `hooks/` và `components/`
- `hooks/` gọi `api/`, đọc/ghi `store/`, dùng `services/`
- `api/` không có state, không có side effect
- `services/` cho SignalR và GPS (chỉ `pricing/` và `delivery/` cần)
- `store/` chỉ tạo khi cần giữ state qua nhiều màn (ví dụ: filter đang chọn, giỏ hàng tạm)

#### Folder nào cần tạo ngay, folder nào để trống đến khi cần

| Folder        | Ngay từ đầu | Khi cần                           |
| ------------- | ----------- | --------------------------------- |
| `screens/`    | ✅           |                                   |
| `hooks/`      | ✅           |                                   |
| `api/`        | ✅           |                                   |
| `components/` |             | ✅ khi screen > 200 dòng cần tách  |
| `types/`      |             | ✅ khi có type riêng nhiều         |
| `store/`      |             | ✅ khi cần local state phức tạp    |
| `services/`   |             | ✅ chỉ `delivery` và `pricing`     |
| `utils/`      |             | ✅ khi có transform/format đặc thù |

---

## 6. Chi tiết từng Feature

### `features/auth/` — Tất cả role

```
screens/
  LoginScreen.tsx       Form email + password → gọi authApi.login() → signIn()
  RegisterScreen.tsx    Đăng ký (dự phòng)
hooks/
  useAuth.ts            Gọi authApi, lưu token vào SecureStore, cập nhật authStore
api/
  auth.api.ts           POST /auth/login, POST /auth/logout, GET /auth/me
                        → import { apiClient } from '../../../services/api/client'
```

---

### `features/orders/` — RESTAURANT

```
screens/
  OrderListScreen.tsx     Danh sách đơn hàng, filter trạng thái, pull-to-refresh
  CreateOrderScreen.tsx   Form chọn sản phẩm + số lượng
  OrderDetailScreen.tsx   Chi tiết đơn: sản phẩm, timeline trạng thái, nút Hủy
hooks/
  useOrders.ts            GET /orders — list + pagination
  useOrderDetail.ts       GET /orders/:id
  useCreateOrder.ts       POST /orders
  useCancelOrder.ts       PUT /orders/:id/cancel
api/
  orders.api.ts           Toàn bộ HTTP calls của feature orders
components/
  OrderCard.tsx           1 item trong list: mã đơn, tổng tiền, badge trạng thái
  OrderStatusBadge.tsx    Badge màu theo OrderStatus
  OrderStatusTimeline.tsx Dòng thời gian PENDING → DELIVERED
```

---

### `features/pricing/` — RESTAURANT (xem) + MARKET_AGENT (cập nhật)

```
screens/
  PriceListScreen.tsx     Danh sách giá thực phẩm, cập nhật real-time qua SignalR
  UpdatePriceScreen.tsx   Form nhập giá mới tại điểm chợ (Market Agent)
hooks/
  usePricing.ts           GET /pricing + subscribe SignalR PriceUpdated event
  useUpdatePrice.ts       PUT /pricing/:id
api/
  pricing.api.ts          GET /pricing, PUT /pricing/:id
services/
  pricing.hub.ts          Kết nối SignalR hub "pricing", lắng nghe sự kiện giá mới
components/
  PriceRow.tsx            1 sản phẩm: tên, giá, đơn vị, % thay đổi
  PriceChangeTag.tsx      Tag "↑ +5%" / "↓ -2%"
```

---

### `features/hub/` — HUB_STAFF

```
screens/
  HubDashboardScreen.tsx  Tổng quan: batch về hôm nay, đơn chờ xử lý
  CheckInScreen.tsx       Nhận hàng từ chợ, nhập số lượng từng mặt hàng
  SortingScreen.tsx       Gán hàng trong batch → đúng đơn hàng
hooks/
  useHubDashboard.ts      GET /hub/today-orders + /hub/incoming
  useCheckIn.ts           POST /hub/check-in
  useSorting.ts           POST /hub/sort
api/
  hub.api.ts              Toàn bộ HTTP calls của feature hub
components/
  BatchCard.tsx           Thông tin 1 batch: thời gian, mặt hàng, trạng thái
  SortingItemRow.tsx      1 dòng phân loại: sản phẩm → đơn nào
```

---

### `features/logistics/` — HUB_STAFF

```
screens/
  LogisticsDashboardScreen.tsx  Danh sách tuyến giao theo ngày
  RouteDetailScreen.tsx         Chi tiết tuyến: điểm dừng, phân công tài xế
hooks/
  useLogistics.ts               GET /logistics/routes
  useRouteDetail.ts             GET /logistics/routes/:id
  useOptimizeRoute.ts           POST /logistics/optimize
  useAssignDriver.ts            PUT /logistics/routes/:id/assign
api/
  logistics.api.ts              Toàn bộ HTTP calls của feature logistics
components/
  RouteCard.tsx                 1 tuyến: số điểm dừng, tài xế, tiến độ
  DriverPicker.tsx              Dropdown chọn tài xế
```

---

### `features/delivery/` — DRIVER (điều hướng) + RESTAURANT (theo dõi)

```
screens/
  DriverHomeScreen.tsx    Tuyến hôm nay, nút bắt đầu ca
  StopListScreen.tsx      Danh sách điểm dừng, cập nhật Done/Failed từng điểm
  NavigationScreen.tsx    Bản đồ full-screen, GPS real-time (react-native-maps)
  TrackOrderScreen.tsx    Restaurant xem vị trí tài xế real-time
hooks/
  useDelivery.ts          GET /delivery/my-route
  useStopStatus.ts        PUT /delivery/stops/:id/status
  useLocationTracker.ts   Start/stop background GPS task, POST /delivery/location
api/
  delivery.api.ts         Toàn bộ HTTP calls của feature delivery
services/
  locationTracker.ts      expo-task-manager background task gửi GPS liên tục
components/
  StopCard.tsx            1 điểm dừng: địa chỉ, nhà hàng, trạng thái, nút Done
  LiveDriverMap.tsx       Map + marker tài xế + marker các điểm dừng
```

---

### `features/inventory/` — MARKET_AGENT

```
screens/
  MarketAgentHomeScreen.tsx   Dashboard: hàng sắp hết, giá hôm nay, cảnh báo
  InventoryScreen.tsx         Danh sách tồn kho, cập nhật số lượng
hooks/
  useInventory.ts             GET /inventory
  useUpdateInventory.ts       PUT /inventory/:id
api/
  inventory.api.ts            Toàn bộ HTTP calls của feature inventory
components/
  InventoryRow.tsx            1 mặt hàng: tên, số lượng, thanh progress
  LowStockAlert.tsx           Banner khi tồn kho < minQuantity
```

---

### `features/analytics/` — (TBD — chưa phân role)

```
screens/
  AnalyticsDashboardScreen.tsx  Charts giá, KPI giao hàng, tỷ lệ on-time
hooks/
  usePriceTrend.ts              GET /analytics/price-trend → tín hiệu BUY_NOW / WAIT
  useDeliveryStats.ts           GET /analytics/delivery
api/
  analytics.api.ts              Toàn bộ HTTP calls của feature analytics
components/
  PriceTrendChart.tsx           Biểu đồ đường giá (cần cài chart library)
  KPICard.tsx                   Card số liệu + % so kỳ trước
  SignalBadge.tsx               Badge "MUA NGAY" / "CHỜ"
```

---

## 7. Quy ước đặt tên

| Loại             | Convention               | Ví dụ                                   |
| ---------------- | ------------------------ | --------------------------------------- |
| Screen component | PascalCase + `Screen`    | `OrderListScreen`                       |
| Hook             | camelCase + `use` prefix | `useOrders`, `useAuthStore`             |
| API module       | camelCase + `.api.ts`    | `orders.api.ts`                         |
| Type file        | camelCase + `.types.ts`  | `common.types.ts`                       |
| Service          | camelCase + `.ts`        | `locationTracker.ts`                    |
| Navigator        | PascalCase + Stack/Tabs  | `RestaurantTabs`, `DriverStack`         |
| Constant         | PascalCase object        | `UserRole.RESTAURANT`, `Colors.primary` |
| Component        | PascalCase               | `OrderCard`, `PriceChangeTag`           |

---

## 8. Trạng thái hiện tại

| Hạng mục                   | Trạng thái                              |
| -------------------------- | --------------------------------------- |
| Cấu trúc thư mục           | ✅ Hoàn chỉnh                            |
| Navigation 4 roles         | ✅ Hoàn chỉnh                            |
| Auth state (Context)       | ✅ Hoàn chỉnh (tạm)                      |
| LoginScreen                | ✅ Dev mode — role selector tạm          |
| Tất cả feature screens     | ⏳ Placeholder — chỉ hiển thị tên screen |
| API calls                  | ⏳ Chưa implement                        |
| Auth thật (email/password) | ⏳ Việc tiếp theo                        |
