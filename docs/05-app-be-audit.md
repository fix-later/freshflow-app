# 5. App ↔ Backend Consistency & UX Audit

| | |
|---|---|
| **Date** | 2026-08-13 |
| **Scope** | Every mobile-app flow (`freshflow-app`) checked against the real current backend (`freshflow-backend`) — request/response shapes, error-code handling, business-rule gaps, and UI/UX quality. Web (`freshflow-web`) not included in this pass. |
| **Method** | 5 parallel research passes (one per role: Restaurant ordering, Restaurant account, Market Agent, Hub Staff, Driver), each reading actual handler/controller/entity code rather than docs (`freshflow-backend/CLAUDE.md` warns docs predate the code). |
| **Status** | Findings are tagged `[BE-MISMATCH]` (app disagrees with what the backend actually does) or `[UX]` (works, but rough). Fixed items are marked **✅ ĐÃ SỬA** with the date — everything else in this doc is still open. |

---

## 0. Ưu tiên nếu chỉ chọn vài điểm để sửa trước demo

1. ~~`OrderDetailScreen.tsx` vẫn còn bug "số sản phẩm = tổng kg"~~ — **✅ ĐÃ SỬA (13/08/2026)**: đổi `itemCount` sang `items.length`, đồng bộ với `CreateOrderScreen`/`ConfirmOrderScreen`.
2. **Market Agent: xác nhận mua hàng có thể fail cứng khi 1 phiên chợ chia cho nhiều agent** — app gửi cả dòng không thuộc về mình, backend từ chối cả yêu cầu, agent không hiểu vì sao. *(chưa sửa)*
3. ~~Hub: sức chứa hub chỉ tăng, không bao giờ giảm~~ — **✅ ĐÃ SỬA (13/08/2026)**: `DriverHandoffScreen` giờ gọi `POST /hubs/{hubId}/outbound` trước khi bàn giao. **Còn giới hạn:** loading-manifest chưa trả `marketProductId`, app phải tra theo tên sản phẩm (có thể bỏ sót nếu trùng tên giữa 2 chợ) — đã gửi spec nhờ BE thêm field, xem §6.
4. ~~Tài xế: màn "Nhận hàng tại Hub" rò rỉ nguyên văn tên trạng thái enum + câu "vào Admin Backend đổi trạng thái"~~ — **✅ ĐÃ SỬA (13/08/2026)**: đổi thành câu trung tính cho người dùng.
5. **Sắp xếp lại điểm dừng của tài xế (kéo-thả) lưu thất bại âm thầm** — tài xế tưởng đã lưu nhưng server chưa nhận. *(chưa sửa)*
6. **Toàn bộ luồng vẫn còn tái diễn kiểu lỗi "hiện tiếng Anh thô"** đã phát hiện ở phiên chợ trước — không phải 1 chỗ mà rải khắp Nhà hàng/Hub/Tài xế. Đây chính là việc xây "tầng dịch lỗi chung" đã thống nhất làm nhưng đang tạm dừng giữa chừng. *(chưa làm)*

---

## 1. Nhà hàng — Đặt hàng

### OrderListScreen (giỏ hàng)
- **[BE-MISMATCH]** Giỏ hàng không tự xoá khi đổi chợ, và backend cũng không chặn thêm sản phẩm khác chợ vào cùng giỏ — lỗi "khác chợ" (`ORDER_MARKET_MISMATCH`) chỉ lộ ra ở bước xác nhận cuối cùng, sau khi nhà hàng đã chọn ngày giao + địa chỉ. Nên chặn/tự xoá giỏ ngay khi đổi chợ.

### CreateOrderScreen / ConfirmOrderScreen (đặt hàng thường)
- **[UX]** Danh sách "issues" ở bước preview xác nhận hiện **nguyên văn tiếng Anh** từ backend (`ConfirmOrderScreen.tsx:290-298`, `OrderDetailScreen.tsx:371-374`) — đây là **đường khác** dẫn tới cùng kiểu lỗi vừa sửa (MARKET_SESSION_NOT_OPEN), lần này qua preview chứ không phải qua confirm-error, nên bản vá trước chưa che hết.
- **[BE-MISMATCH]** Catch lỗi khi confirm chỉ xử lý 4/9 mã lỗi có thể xảy ra thực tế (`INSUFFICIENT_STOCK`, `RESTAURANT_NOT_APPROVED/ACTIVE`, `DELIVERY_DATE_OUT_OF_WINDOW`, `CREDIT_LIMIT_EXCEEDED`) — còn thiếu `ORDER_NOT_DRAFT`, `ORDER_EMPTY`, `ORDER_MARKET_MISMATCH`, `MARKET_SESSION_NOT_AVAILABLE/NOT_OPEN`... đều rơi về tiếng Anh thô. Có 1 mã `INSUFFICIENT_CREDIT` app đang check nhưng **backend không bao giờ gửi mã này** (dead code).

### OrderDetailScreen
- ~~**[BE-MISMATCH]** `itemCount = items.reduce((sum, it) => sum + (it.quantity ?? 0), 0)`~~ — **✅ ĐÃ SỬA (13/08/2026)**: đổi sang `items.length`.

### CreateRecurringOrderScreen / ManageRecurringOrdersScreen
- **[BE-MISMATCH]** Sửa danh sách sản phẩm của lịch đặt định kỳ **bị vô hiệu hoá hoàn toàn** vì 1 lỗi thật ở backend (`UpdateScheduledOrderCommandHandler` khiến EF đánh dấu item là Modified thay vì Added → update 0 dòng/409). Nhà hàng muốn đổi 1 sản phẩm trong lịch tuần phải **huỷ và tạo lại cả lịch** (mất lịch sử/ghi chú) — nên coi đây là việc cần backend sửa, không phải chỉ FE.

### AddDraftOrderItemScreen
- **[UX]** Không kiểm tra trạng thái đơn trước khi thêm sản phẩm — hiếm gặp nhưng nếu đơn chuyển trạng thái đúng lúc màn này đang mở, lỗi hiện chung chung thay vì "đơn không còn ở trạng thái nháp".

---

## 2. Nhà hàng — Tài khoản / Công nợ / Hoá đơn

### RestaurantProfileScreen
- **[BE-MISMATCH]** Lỗi validate từ backend (VD số điện thoại sai định dạng) hiện **nguyên văn tiếng Anh** trong khi toàn màn hình là tiếng Việt.
- **[UX]** `pickupStart`/`pickupEnd` vẫn phải gửi lại mỗi lần lưu chỉ để tránh bị null hoá — dọn được nhưng không gấp.

### Công nợ (CreditOverviewScreen / CreditStatementsScreen)
- **Xác nhận: dữ liệu thật, không phải placeholder** — số liệu khớp 100% với backend, ngưỡng cảnh báo 80%/100% đúng y hệt logic backend. Không có vấn đề.

### Hoá đơn (InvoiceListScreen / InvoiceDetailScreen)
- **[BE-MISMATCH]** Backend có cờ `IsSandbox`/`ProviderName` (phân biệt hoá đơn thật đã phát hành hợp lệ vs hoá đơn test qua provider giả lập) nhưng app **không hiện field này ở đâu cả** — nhà hàng không biết hoá đơn mình xem là thật hay test. Đáng chú ý vì đây là tính năng liên quan pháp lý (VAT).

### Yêu thích (FavoritesScreen)
- **[UX]** Khi bấm tim mà lỗi mạng, tim tự động revert về trạng thái cũ nhưng **không báo gì cho người dùng biết vì sao**.

### Thông báo
- **[BE-MISMATCH] — lỗ hổng chức năng thật sự**: Backend đã xây đầy đủ API đăng ký push-token thiết bị (`NotificationDeviceController`), nhưng **app chưa từng gọi tới** — chỉ nhận thông báo qua SignalR khi app đang mở nền trước (foreground). Nghĩa là **tắt app hoặc app chạy nền là mất hết thông báo** (cảnh báo công nợ, cập nhật đơn hàng...), dù backend đã sẵn sàng.

### Trợ lý AI
- Không phát hiện vấn đề gì.

---

## 3. Market Agent

### Nhiệm vụ thu mua (MarketAgentTasksScreen / ProcurementTaskDetailScreen)
- **[BE-MISMATCH] (ưu tiên cao)** Khi 1 phiên chợ được chia việc cho nhiều market agent, app **không lọc** danh sách sản phẩm theo đúng phần được giao — gửi luôn cả sản phẩm của agent khác khi xác nhận mua hàng → backend từ chối **toàn bộ** yêu cầu (`PURCHASE_LINES_MISMATCH`) với thông báo chung chung, agent không hiểu vì sao.
- **[BE-MISMATCH]** Nút "Bàn giao lô cho Hub" chỉ kiểm tra trạng thái `Purchasing`, không kiểm tra đã xác nhận giá **tất cả** sản phẩm chưa — bỏ sót 1 món vẫn bấm được, rồi nhận lỗi chung chung thay vì "còn 3 món chưa nhập giá".
- **[UX]** Badge "Đang cập nhật trực tiếp" là giả — không có SignalR thật, cờ này luôn `false`, chỉ là polling 30 giây.
- **[UX]** Tab "Nhiệm vụ" tính cả batch trạng thái `Built` (admin còn đang soạn, chưa có gì để agent làm) là "cần xử lý", dẫn agent vào việc chưa sẵn sàng.

### Cập nhật giá (UpdatePriceScreen)
- **[BE-MISMATCH]** Không dùng optimistic concurrency mà backend đã hỗ trợ (`ExpectedVersion`) → 2 market agent sửa cùng sản phẩm cùng lúc, ai lưu sau thắng, không cảnh báo gì.
- **[BE-MISMATCH]** Không kết nối `PricingHub` (SignalR) dù backend có — lưu xong không có xác nhận realtime là đã lan tới nơi khác.
- **[UX]** Lưu hàng loạt mà fail 1 phần chỉ báo "Thành công: X, Thất bại: Y", không nêu tên sản phẩm nào fail.

---

## 4. Hub Staff

### Màn hình chết còn sót trong code
- **[UX]** `CheckInScreen`/`QualityCheckScreen`/`IncidentReportScreen` (bản cũ) **không còn đường vào** từ luồng thật (`InboundQueueScreen`/`HubDashboardScreen` luôn đi qua `AssignedInboundTaskScreen`) nhưng vẫn chạy trên dữ liệu giả lập cứng, kể cả nút "Gửi báo cáo sự cố" chỉ hiện Alert giả, không gọi API nào. Rủi ro nếu sau này có ai vô tình điều hướng tới mà thiếu `assignedTask`.

### AssignedInboundTaskScreen (màn nhận hàng + kiểm tra chất lượng + báo sai lệch thật)
- **[BE-MISMATCH]** Backend hỗ trợ đính kèm **ảnh bằng chứng** khi báo sai lệch (`proofImageUrl` + API lấy chữ ký upload Cloudinary riêng) nhưng app **không gửi field này, không gọi API lấy chữ ký** — hub staff không thể đính ảnh bằng chứng dù đây là cách chính để vận hành xử lý khiếu nại.
- **[UX]** Lỗi hiện tiếng Anh thô, không map mã lỗi nào (trong khi `MarketDispatchScreen` cùng module đã có sẵn kiểu map này).
- **[BE-MISMATCH]** Nếu 2 thiết bị cùng quét 1 lô hàng gần như đồng thời, người quét sau nhận lỗi "mã quét không khớp" — gây hiểu lầm là quét sai, thực ra là "đã được người khác nhận trước rồi".

### MarketDispatchScreen / DriverHandoffScreen
- ~~**[BE-MISMATCH] (ưu tiên cao)** App không bao giờ gọi API ghi nhận outbound~~ — **✅ ĐÃ SỬA (13/08/2026)**: `DriverHandoffScreen` giờ gọi `hubDispatchApi.recordOutbound()` (mới) trước `createHandover()`, lấy `outboundEventId` thật thay vì `null`. Số lượng gộp theo `marketProductId`, dùng số lượng thô (không làm tròn theo kiện) để khớp cách nhập kho đã ghi nhận trước đó. Có cơ chế chống ghi outbound 2 lần nếu bấm lại sau khi `createHandover` fail (lưu `outboundEventId` vào state, tái sử dụng thay vì gọi lại).
  - **Giới hạn còn lại:** `marketProductId` phải tra theo tên sản phẩm (`hubCatalogApi.ts`) vì loading-manifest chưa trả field này — sản phẩm trùng tên giữa 2 chợ sẽ bị bỏ qua khi ghi outbound (chỉ log cảnh báo console, không chặn bàn giao). Đã gửi spec nhờ BE thêm `marketProductId` vào `loading-manifest` (§6) — sửa xong bên đó thì bỏ được cách tra tên này.
- **[UX]** Luôn hiện tên tài xế giả "Tài xế FreshFlow" thay vì tên/SĐT thật — vì DTO tài xế không có field tên. *(chưa sửa)*

---

## 5. Tài xế

### DriverHomeScreen (kéo-thả sắp xếp điểm dừng)
- **[BE-MISMATCH] (ưu tiên cao)** Lưu thứ tự điểm dừng sau khi kéo-thả là **fire-and-forget, lỗi bị nuốt hoàn toàn** (`.catch(() => {})`) — nếu backend từ chối (route đã khoá, thứ tự không hợp lệ...), tài xế không hề biết, màn hình vẫn hiện như đã lưu thành công.

### PickupConfirmScreen
- ~~**[UX] (ưu tiên cao)** Thông báo trạng thái rỗng hiện thẳng thuật ngữ nội bộ~~ — **✅ ĐÃ SỬA (13/08/2026)**: đổi thành *"Chưa có đơn hàng nào sẵn sàng để nhận tại Hub cho tuyến này. Vui lòng đợi nhân viên Hub bàn giao."*, bỏ hẳn tên enum và nhắc tới Admin Backend.
- **[BE-MISMATCH]** Xác nhận nhận hàng + bắt đầu tuyến gộp chung 1 catch — không phân biệt được các lỗi như "phiên chợ có sai lệch chưa xử lý" (`PENDING_HUB_DISCREPANCY`) khiến tài xế bấm "thử lại" vô ích mãi. *(chưa sửa)*

### NavigationScreen
- **[UX]** Không có địa chỉ/SĐT nhà hàng ở đâu trong app — chỉ có toạ độ GPS thô, mở bản đồ bằng toạ độ. Nếu định vị lệch hoặc cổng khoá, tài xế không có cách gọi cho nhà hàng ngay trong app.
- **[BE-MISMATCH]** 1 mã lỗi backend (`DELIVERY_ROUTE_NOT_IN_PROGRESS`) chưa được đăng ký trong tầng map lỗi chung của backend → trả về 500 thay vì lỗi nghiệp vụ rõ ràng (lỗi backend, không phải app).

### ProofOfDeliveryScreen
- **[UX]** Nếu upload ảnh thành công nhưng bước cập nhật trạng thái "Đã giao" fail ngay sau đó, màn hình reset về "chưa nộp" — tài xế phải **chụp và tải ảnh lại từ đầu** thay vì chỉ cần xác nhận lại.

### ReportDeliveryIssueScreen
- **[BE-MISMATCH]** Báo sự cố rồi cập nhật trạng thái "Thất bại" chạy tuần tự, gộp 1 catch — nếu bước 2 lỗi mà tài xế bấm thử lại, **có thể tạo trùng báo cáo sự cố** (không có cơ chế chống trùng).

---

## 6. Ghi nhận thêm — vấn đề nằm ở Backend (không phải do App)

Những điểm dưới đây App không làm gì sai, nhưng khiến App phải né tránh/gánh hậu quả:

- Sửa item của lịch đặt định kỳ bị lỗi ở `UpdateScheduledOrderCommandHandler` (EF đánh dấu Modified thay vì Added).
- 4 mã lỗi chưa được đăng ký trong `ErrorExtensions.ToActionResult` nên trả về 500 thay vì mã nghiệp vụ đúng: `BATCH_NOT_REPORTABLE`, `INVALID_EXCEPTION_QUANTITY`, `PROCUREMENT_HANDOVER_CONFLICT`, `DELIVERY_ROUTE_NOT_IN_PROGRESS`.
- `AttachProofOfDelivery` không có guard chặn gắn bằng chứng vào 1 delivery đã ở trạng thái cuối (`delivered`/`failed`) — chưa gây lỗi thực tế qua luồng app hiện tại, nhưng là lỗ hổng nếu flow thay đổi sau này.
- **Mới (13/08/2026) — cần BE thêm `marketProductId` vào response `loading-manifest`.** Dữ liệu này **đã có sẵn trong câu SQL** (`OrderPackingLineRowConfiguration.cs` đã `INNER JOIN market_products mp`), chỉ chưa được `SELECT` ra. Chỉ cần: (1) thêm `mp."Id" AS "MarketProductId"` vào SELECT, (2) thêm property vào `OrderPackingLineRow`/`OrderPackingLine`/`OrderPackingLines`, (3) thêm field vào `LoadingLineDto` (`Modules/Logistics/.../Dtos/LoadingManifestDto.cs:20-25`) và map trong `GetLoadingManifestQueryHandler.cs:64-65`. Sửa xong, app sẽ đọc thẳng field này thay vì tra theo tên sản phẩm (đang làm tạm ở `hubCatalogApi.ts`, xem §4).

---

## 7. Việc đã thống nhất làm nhưng đang dang dở

Bạn đã chọn hướng **"xây tầng dịch lỗi chung cho cả app"** (giống `error-codes.ts` bên web) khi phát hiện lỗi tiếng Anh thô ở màn xác nhận đơn — audit này cho thấy **đây không phải vấn đề của riêng 1 màn hình mà lặp lại ở gần như mọi vai trò** (Nhà hàng, Market Agent, Hub, Tài xế). Nên làm tầng dùng chung 1 lần rồi áp dụng dần, thay vì vá từng chỗ.
