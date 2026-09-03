/**
 * Turns a failed API call into a Vietnamese message the user can actually read.
 *
 * Every backend rejection carries a machine-readable `code` (see backend
 * `ErrorExtensions.ToActionResult`); validation failures (`ValidationException`
 * from `ValidationBehavior`) additionally carry `details: [{ field, message }]`.
 * Without this layer, screens fell back to showing that raw English `message`
 * (or the FluentValidation default text) straight to a Vietnamese user — the
 * "hiện tiếng Anh thô" bug found repeatedly across Nhà hàng/Hub/Tài xế
 * screens. `getApiErrorMessage` is the one place that decides what to show;
 * screens should stop hand-rolling their own `error.response.data.message`
 * reads.
 *
 * `API_ERROR_MESSAGES` was generated from `freshflow-web`'s own
 * `error-codes.ts` + `public/i18n/vi.json` (same backend, already-vetted
 * Vietnamese copy) via a one-off script, then merged with codes the web app
 * hasn't caught up to yet (new Procurement/MarketSession contract — see
 * `MARKET_SESSION_*`, `ITEM_NOT_ASSIGNED_TO_AGENT`, `ORDER_MARKET_MISMATCH`).
 * Keep both apps' wording in sync where a code is shared.
 */

// ─── Code → Vietnamese message ──────────────────────────────────────────────
// Backend error `code` (see `ErrorExtensions.ToActionResult`, one entry per
// `Error.Validation/Conflict/Unauthorized/NotFound/...` call site) → the
// Vietnamese sentence to show. An unregistered code falls through to the HTTP
// status bucket below instead of landing here.
export const API_ERROR_MESSAGES: Record<string, string> = {
  "ACCOUNT_INACTIVE": "Tài khoản này đang bị vô hiệu hóa",
  "ACCOUNT_LOCKED": "Tài khoản này đang tạm khóa",
  "AGENT_NOT_ELIGIBLE": "Người dùng không phải nhân viên đang hoạt động của chợ này",
  "ALREADY_APPROVED": "Nhà hàng này đã được duyệt",
  "ALREADY_RECEIVED": "Lịch nhập này đã được ghi nhận",
  "ALREADY_SUSPENDED": "Nhà hàng này đã bị tạm ngưng",
  "ASSISTANT_PROVIDER_AUTH_FAILED": "Trợ lý hiện không khả dụng. Vui lòng thử lại sau.",
  "ASSISTANT_PROVIDER_RATE_LIMITED": "Trợ lý đã đạt giới hạn sử dụng. Vui lòng thử lại sau.",
  "ASSISTANT_PROVIDER_TIMEOUT": "Trợ lý phản hồi quá lâu. Vui lòng thử lại.",
  "ASSISTANT_PROVIDER_UNAVAILABLE": "Trợ lý hiện không khả dụng. Vui lòng thử lại sau.",
  "AUTHORIZATION_ERROR": "Bạn không có quyền thực hiện thao tác này",
  "BATCH_ALREADY_HANDED_OFF": "Lô này đã bàn giao",
  "BATCH_ALREADY_IN_PROGRESS": "Lô này đã bắt đầu chạy",
  "BATCH_CANCELLED": "Lô này đã bị huỷ",
  "BATCH_NOT_CANCELLABLE": "Không huỷ được lô này vì các đơn đã chuyển trạng thái",
  "BATCH_NOT_MANIFESTABLE": "Trạng thái hiện tại của lô không cho phép lập phiếu",
  "BATCH_NOT_MANIFESTED": "Hãy lập phiếu trước khi phân công nhân viên",
  "BATCH_NOT_MERGEABLE": "Lô này không nhận thêm đơn được nữa",
  "BATCH_NOT_PURCHASED": "Hãy xác nhận mua hàng trước khi bàn giao lô",
  "BATCH_NOT_REPORTABLE": "Trạng thái hiện tại của lô không cho phép báo sự cố",
  "BATCH_RESET_NOT_ALLOWED": "Các lô của ngày đó vừa thay đổi — hãy tải lại và thử lại",
  "BUSINESS_RULE_ERROR": "Thao tác này hiện không được phép",
  "BUYER_ADDRESS_REQUIRED": "Hãy bổ sung địa chỉ xuất hoá đơn trong hồ sơ thuế",
  "BUYER_LEGAL_NAME_REQUIRED": "Hãy bổ sung tên pháp nhân trong hồ sơ thuế",
  "BUYER_TAX_CODE_INVALID": "Mã số thuế trong hồ sơ thuế không hợp lệ",
  "BUYER_TAX_CODE_REQUIRED": "Hãy bổ sung mã số thuế trong hồ sơ thuế trước khi phát hành hoá đơn",
  "CANNOT_DEACTIVATE_SELF": "Bạn không thể vô hiệu hóa tài khoản của chính mình",
  "CATEGORY_HAS_ACTIVE_CHILDREN": "Hãy ngừng hoặc chuyển các danh mục con trước",
  "CATEGORY_NAME_CONFLICT": "Đã có danh mục trùng tên",
  "CATEGORY_NOT_FOUND": "Danh mục này không còn tồn tại",
  "CATEGORY_PARENT_NOT_FOUND": "Danh mục cha không còn tồn tại",
  "CHANNEL_NOT_SUPPORTED": "Kênh này hiện chưa được hỗ trợ",
  "CLAIM_INVALID_TRANSITION": "Khiếu nại này đã được xử lý — tải lại để xem kết quả",
  "CLAIM_NOT_FOUND": "Khiếu nại này không còn tồn tại",
  "CLAIM_ORDER_NOT_CLAIMABLE": "Đơn hàng này không ở trạng thái có thể khiếu nại",
  "CREDIT_LIMIT_BELOW_OUTSTANDING_BALANCE": "Hạn mức mới thấp hơn số dư nợ hiện tại của nhà hàng",
  "CREDIT_LIMIT_EXCEEDED": "Đơn này vượt quá hạn mức công nợ còn lại",
  "CREDIT_REFUND_EXCEEDS_BALANCE": "Số tiền hoàn lớn hơn công nợ hiện tại của nhà hàng",
  "CREDIT_REFUND_EXCEEDS_ORDER_CHARGE": "Số tiền hoàn lớn hơn số đã ghi nợ cho đơn hàng này",
  "CREDITSTATEMENT_NOT_FOUND": "Sao kê này không còn tồn tại",
  "DELIVERY_ADDRESS_ALREADY_CAPTURED": "Đơn này đã chốt địa chỉ giao hàng",
  "DELIVERY_ADDRESS_NOT_FOUND": "Địa chỉ giao hàng này không còn tồn tại",
  "DELIVERY_ALREADY_EXISTS": "Đơn này đã có lượt giao hàng",
  "DELIVERY_COORDINATES_REQUIRED": "Địa chỉ này chưa có toạ độ nên không tính được phí giao hàng",
  "DELIVERY_DATE_OUT_OF_WINDOW": "Hãy chọn ngày giao trong khoảng thời gian cho phép",
  "DELIVERY_NOT_FOUND": "Lượt giao hàng không còn tồn tại",
  "DELIVERY_ROUTE_NOT_FOUND": "Không tìm thấy tuyến đường hoặc tuyến không còn tồn tại",
  "DELIVERY_ROUTE_NOT_IN_PROGRESS": "Tuyến phải đang chạy mới cập nhật được lượt giao",
  "DELIVERY_STATUS_INVALID": "Không được chuyển trạng thái giao hàng như vậy",
  "DISCREPANCY_ALREADY_ACKNOWLEDGED": "Sự cố này đã được xác nhận — tải lại để xem trạng thái hiện tại",
  "DRIVER_REQUIRED": "Hãy chọn tài xế",
  "DRIVER_ROUTE_MISMATCH": "Tài xế không phải người được phân công tuyến này",
  "EMAIL_ALREADY_EXISTS": "Email này đã được đăng ký",
  "EMAIL_RECIPIENT_MISSING": "Tài khoản này chưa có email để gửi",
  "EMAIL_SEND_FAILED": "Không gửi được email",
  "FLEET_CAPACITY_EXCEEDED": "Đội xe không chở đủ toàn bộ nhà hàng trong kế hoạch này",
  "FORBIDDEN": "Bạn không có quyền thực hiện thao tác này",
  "HUB_ACCESS_DENIED": "Bạn không có quyền truy cập hub này",
  "HUB_ALREADY_CONFIGURED_FOR_MARKET": "Chợ này đã có hub đang hoạt động",
  "HUB_CAPACITY_BELOW_OCCUPIED": "Sức chứa không được thấp hơn lượng đang chứa",
  "HUB_CAPACITY_EXCEEDED": "Hub không đủ sức chứa cho lượt nhập này",
  "HUB_DISCREPANCY_NOT_FOUND": "Sự cố này không còn tồn tại",
  "HUB_HANDOVER_ALREADY_CHECKED_OUT": "Phiếu bàn giao này đã xuất kho",
  "HUB_HANDOVER_NOT_FOUND": "Phiếu bàn giao không còn tồn tại",
  "HUB_HAS_ACTIVE_PROCUREMENT": "Hub vẫn còn lô thu mua đang chạy",
  "HUB_HAS_PENDING_DELIVERIES": "Hub vẫn còn lượt nhập chưa xử lý",
  "HUB_INACTIVE": "Hub này không hoạt động",
  "HUB_INBOUND_EVENT_NOT_FOUND": "Lượt nhập kho không còn tồn tại",
  "HUB_NOT_CONFIGURED_FOR_MARKET": "Lô này chưa có hub được cấu hình",
  "HUB_NOT_FOUND": "Hub này không còn tồn tại",
  "HUB_OUTBOUND_EVENT_NOT_FOUND": "Lượt xuất kho không còn tồn tại",
  "HUB_RELAY_NOT_SUPPORTED": "Chưa hỗ trợ tuyến trung chuyển qua Hub",
  "INBOUND_NOT_ARRIVED": "Lượt nhập phải tới hub trước khi trung chuyển",
  "INSUFFICIENT_HUB_STOCK": "Tồn kho tại hub không đủ cho lượt xuất này",
  "INSUFFICIENT_STOCK": "Một hoặc nhiều sản phẩm vượt quá số lượng còn lại",
  "INVALID_ACTUAL_QUANTITY": "Số lượng thực tế không hợp lệ cho dòng hàng này",
  "INVALID_ACTUAL_UNIT_PRICE": "Có số lượng thực tế thì phải có đơn giá thực tế lớn hơn 0",
  "INVALID_AGENT": "Hãy chọn một nhân viên chợ",
  "INVALID_AMOUNT": "Số tiền phải lớn hơn 0",
  "INVALID_ASSIGNMENT_TARGET": "Chỉ nhân viên chợ mới được phân công vào chợ",
  "INVALID_BATCH_STATUS": "Trạng thái lô không hợp lệ",
  "INVALID_CATEGORY": "Danh mục không tồn tại hoặc đã ngừng hoạt động",
  "INVALID_CATEGORY_PARENT": "Danh mục cha phải là danh mục gốc đang hoạt động",
  "INVALID_CLAIM_AMOUNT": "Số tiền khiếu nại không hợp lệ với đơn hàng này",
  "INVALID_CLAIM_DECISION_NOTE": "Bắt buộc nhập lý do khi từ chối khiếu nại",
  "INVALID_CREDENTIALS": "Email/số điện thoại hoặc mật khẩu không đúng",
  "INVALID_CREDIT_LIMIT": "Hạn mức công nợ không được âm",
  "INVALID_CURRENT_PASSWORD": "Mật khẩu hiện tại không đúng",
  "INVALID_DELIVERY_FEE": "Cấu hình phí giao hàng không hợp lệ",
  "INVALID_EXCEPTION_QUANTITY": "Số lượng báo cáo không được âm",
  "INVALID_EXCEPTION_TYPE": "Loại sự cố không hợp lệ",
  "INVALID_ISSUE_QUANTITY": "Số lượng bị ảnh hưởng không được vượt quá số lượng đã đặt",
  "INVALID_MARKET": "Chợ đã chọn không hợp lệ",
  "INVALID_PACKING_CODE": "Mã đóng gói không tồn tại hoặc đã ngừng hoạt động",
  "INVALID_PRICE": "Giá không hợp lệ",
  "INVALID_PROCUREMENT_BATCH": "Các đơn đủ điều kiện phải có ít nhất một sản phẩm",
  "INVALID_PRODUCT": "Một hoặc nhiều sản phẩm không còn khả dụng",
  "INVALID_PURCHASE_LINE": "Số lượng và đơn giá thực tế đều phải lớn hơn 0",
  "INVALID_QUANTITY": "Số lượng không hợp lệ",
  "INVALID_REQUEST": "Vui lòng kiểm tra lại các trường được đánh dấu và thử lại",
  "INVALID_ROLE": "Vai trò đã chọn không hợp lệ",
  "INVALID_STOP_ORDER": "Thứ tự điểm dừng phải chứa đúng và đủ các điểm hiện có",
  "INVALID_UNIT": "Đơn vị tính không tồn tại hoặc đã ngừng hoạt động",
  "INVOICE_EXPORT_INCOMPLETE": "Hoá đơn này thiếu dữ liệu bắt buộc để xuất",
  "INVOICE_LINE_UNIT_REQUIRED": "Một dòng hoá đơn thiếu đơn vị tính",
  "INVOICE_NOT_FOUND": "Hoá đơn này không còn tồn tại",
  "INVOICE_NOT_ISSUED": "Chỉ xuất được hoá đơn đã phát hành",
  "INVOICE_PDF_PROVIDER_REQUIRED": "Hóa đơn điện tử này cần được xem qua cổng tra cứu",
  "MARKET_ACCESS_DENIED": "Bạn không được phân công cho chợ này",
  "MARKET_ASSIGNMENT_CONFLICT": "Chợ này đã được phân công cho người dùng đó",
  "MARKET_INACTIVE": "Chợ này đang ngừng hoạt động — hãy kích hoạt lại trước khi niêm yết sản phẩm",
  "MARKET_NOT_FOUND": "Chợ này không còn tồn tại",
  "MARKET_PRODUCT_ALREADY_EXISTS": "Sản phẩm này đã được niêm yết tại chợ này",
  "MARKET_PRODUCT_NOT_FOUND": "Sản phẩm này chưa được niêm yết tại chợ này",
  "MINIMUM_ORDER_QUANTITY_NOT_MET": "Có sản phẩm chưa đạt số lượng đặt tối thiểu",
  "MISSING_COORDINATES": "Có điểm trên tuyến chưa có toạ độ — hãy kiểm tra hub và địa chỉ giao của các nhà hàng trong tuyến.",
  "NOT_ACTIVE": "Chỉ nhà hàng đang hoạt động mới có thể tạm ngưng",
  "NOT_SUSPENDED": "Chỉ nhà hàng đang bị tạm ngưng mới có thể mở lại",
  "NOTIFICATION_NOT_FOUND": "Thông báo này không còn tồn tại",
  "NOTIFICATIONDEVICE_NOT_FOUND": "Thiết bị này không còn đăng ký nhận thông báo đẩy",
  "OPTIMISTIC_CONCURRENCY_CONFLICT": "Người khác vừa cập nhật mục này. Vui lòng tải lại và thử lại",
  "ORDER_ALREADY_IN_ACTIVE_GROUP": "Có đơn đã nằm trong lô thu mua đang chạy",
  "ORDER_CANNOT_ADJUST": "Trạng thái hiện tại của đơn không cho phép điều chỉnh số lượng",
  "ORDER_CANNOT_RESCHEDULE": "Đơn này không còn đổi được lịch giao",
  "ORDER_EMPTY": "Đơn hàng chưa có sản phẩm nào",
  "ORDER_INVALID_TRANSITION": "Đơn hàng đã qua bước này — tải lại để xem trạng thái hiện tại",
  "ORDER_ISSUE_ALREADY_RESOLVED": "Sự cố này đã được xử lý",
  "ORDER_ISSUE_NOT_ALLOWED": "Chỉ báo sự cố với đơn đã giao",
  "ORDER_ITEM_NOT_FOUND": "Dòng hàng này không còn tồn tại — vui lòng tải lại đơn",
  "ORDER_ITEM_NOT_IN_INBOUND": "Dòng hàng không khớp sản phẩm nào trong lượt nhập này",
  "ORDER_MARKET_MISMATCH": "Không thể thêm sản phẩm này — đơn đang chứa sản phẩm của một chợ khác. Hãy hoàn tất hoặc xoá giỏ hiện tại trước khi đặt từ chợ khác.",
  "ORDER_NOT_BATCHED": "Chỉ áp số liệu thu mua thực tế cho đơn đã gom lô",
  "ORDER_NOT_CANCELLABLE": "Không thể hủy đơn hàng này ở trạng thái hiện tại",
  "ORDER_NOT_DELIVERED": "Chỉ xác nhận nhận hàng sau khi đơn đã được giao",
  "ORDER_NOT_DRAFT": "Đơn này không còn ở trạng thái nháp nên không đổi được sản phẩm",
  "ORDER_NOT_FOUND": "Đơn hàng này không còn tồn tại",
  "ORDER_NOT_ON_ROUTE": "Nhà hàng của đơn không nằm trong điểm dừng của tuyến",
  "ORDER_RECEIPT_ALREADY_CONFIRMED": "Đơn này đã được xác nhận nhận hàng",
  "ORDER_STATUS_NOT_ADVANCEABLE": "Không thể đẩy đơn hàng này sang bước tiếp theo",
  "OTP_INVALID": "Mã xác thực không đúng hoặc đã hết hạn",
  "OUTBOUND_ROUTE_INVALID": "Tuyến xuất kho không tồn tại",
  "PACKING_CODE_CONFLICT": "Đã có mã đóng gói trùng",
  "PACKINGCODE_NOT_FOUND": "Quy cách đóng gói này không còn tồn tại",
  "PENDING_HUB_DISCREPANCY": "Hub còn sai lệch chưa xử lý — hãy xử lý trước khi xuất phát",
  "PHONE_ALREADY_EXISTS": "Số điện thoại này đã được đăng ký",
  "PICKUP_ORDERS_INCOMPLETE": "Phải lấy đủ mọi đơn được gán cho tuyến và hub này",
  "PLATE_NUMBER_DUPLICATE": "Đã có xe trùng biển số",
  "PROCUREMENT_BATCH_NOT_FOUND": "Lô thu mua không còn tồn tại",
  "PROCUREMENT_HANDOVER_CONFLICT": "Người khác vừa cập nhật mục này. Vui lòng tải lại và thử lại",
  "PROCUREMENT_ORDER_MISSING": "Một số đơn trong lô không còn tồn tại",
  "PROCUREMENT_ORDER_STATE_CONFLICT": "Các đơn trong lô phải cùng vào hub một lượt",
  "PRODUCT_NOT_FOUND": "Sản phẩm này không còn tồn tại",
  "PRODUCT_NOT_IN_BATCH": "Sản phẩm không thuộc lô này",
  "PURCHASE_ACTUALS_MISMATCH": "Cần đúng một dòng thực tế cho mỗi sản phẩm đã đặt",
  // Overrides the older, more generic wording now that `ConfirmPurchase` matches strictly
  // against the calling agent's own assigned items (see ProcurementBatch.ConfirmPurchase).
  "PURCHASE_LINES_MISMATCH": "Danh sách gửi lên không khớp với các mặt hàng được giao cho bạn — vui lòng tải lại lô rồi thử lại.",
  "RATE_LIMIT_EXCEEDED": "Quá nhiều yêu cầu, vui lòng đợi một lát và thử lại",
  "RATE_LIMITED": "Quá nhiều yêu cầu, vui lòng đợi một lát và thử lại",
  "REFERENCE_PRICE_MISSING": "Có sản phẩm trong lô chưa có giá tham chiếu",
  "REFRESH_TOKEN_EXPIRED": "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
  "REFRESH_TOKEN_INVALID": "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
  "REFRESH_TOKEN_REUSE": "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
  "REFRESH_TOKEN_REVOKED": "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
  "RESET_TOKEN_EXPIRED": "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
  "RESET_TOKEN_INVALID": "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
  "RESTAURANT_NOT_ACTIVE": "Chỉ nhà hàng đang hoạt động mới có thể tạm ngưng",
  "RESTAURANT_NOT_APPROVED": "Nhà hàng của bạn đang chờ quản trị viên duyệt",
  "RESTAURANT_NOT_FOUND": "Không tìm thấy nhà hàng với mã này",
  "ROLE_NOT_CONFIGURED": "Đăng ký hiện tạm gián đoạn, vui lòng thử lại sau",
  "ROUTE_HAS_NO_DELIVERIES": "Hãy điều phối tuyến trước khi bắt đầu",
  "ROUTE_HAS_NO_DRIVER": "Tuyến này chưa có tài xế",
  "ROUTE_HUB_MISMATCH": "Tuyến này thuộc hub khác",
  "ROUTE_INVALID_TRANSITION": "Trạng thái hiện tại của tuyến không cho phép thực hiện bước này",
  "ROUTE_LOCKED_FOR_SORTING": "Thứ tự điểm dừng đã khoá vì hub bắt đầu phân loại",
  "ROUTE_NOT_ASSIGNED": "Hãy phân công tuyến trước khi bàn giao",
  "ROUTE_NOT_REORDERABLE": "Chỉ đổi thứ tự điểm dừng khi tuyến đã phân công và chưa khởi hành",
  "ROUTE_NOT_STARTABLE": "Hãy phân công tuyến trước khi bắt đầu",
  "SCAN_NO_MATCH": "Mã quét không khớp lượt nhập nào đang chờ",
  "SCHEDULED_FOR_TOO_SOON": "Thời gian đặt lịch phải cách hiện tại ít nhất 2 giờ",
  "SCHEDULED_ORDER_ALREADY_CANCELLED": "Lịch đặt định kỳ này đã bị huỷ",
  "SCHEDULED_ORDER_FIRST_RUN_IN_PAST": "Lần chạy đầu tiên phải ở tương lai",
  "SCHEDULED_ORDER_NOT_ACTIVE": "Lịch đặt định kỳ này không còn hoạt động",
  "SCHEDULED_ORDER_NOT_FOUND": "Lịch đặt định kỳ này không còn tồn tại",
  "SERIALIZATION_CONFLICT": "Người khác vừa cập nhật mục này. Vui lòng tải lại và thử lại",
  "SESSION_CONFLICT": "Người khác vừa cập nhật mục này. Vui lòng tải lại và thử lại",
  "SESSION_NOT_FOUND": "Cuộc trò chuyện đã hết hạn — hãy bắt đầu cuộc mới",
  "STATEMENT_GENERATION_CONFLICT": "Người khác vừa cập nhật mục này. Vui lòng tải lại và thử lại",
  "STATEMENT_PERIOD_NOT_CLOSED": "Chỉ có thể tạo sao kê khi kỳ đó đã kết thúc hoàn toàn",
  "STOCK_RESERVATION_CONFLICT": "Người khác vừa cập nhật mục này. Vui lòng tải lại và thử lại",
  "STOP_LIMIT_EXCEEDED": "Mỗi tuyến tối đa 20 điểm dừng — hãy tách thành nhiều tuyến",
  "TOKEN_EXPIRED": "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
  "TOKEN_INVALID": "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
  "TOKEN_NOT_FOUND": "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
  "TOO_MANY_REQUESTS": "Quá nhiều yêu cầu, vui lòng đợi một lát và thử lại",
  "UNAUTHORIZED": "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
  "UNIT_NAME_CONFLICT": "Đã có đơn vị tính trùng tên",
  "UNITOFMEASUREMENT_NOT_FOUND": "Đơn vị tính này không còn tồn tại",
  "USER_NOT_FOUND": "Người dùng này không còn tồn tại",
  "VALIDATION_ERROR": "Vui lòng kiểm tra lại các trường được đánh dấu và thử lại",
  "VAT_RATE_MISSING": "Một sản phẩm trong đơn chưa được cấu hình thuế suất VAT",
  "VEHICLE_NOT_AVAILABLE": "Phương tiện không sẵn sàng hoặc đã được phân tuyến khác trong ngày này",
  "VEHICLE_NOT_ELIGIBLE": "Phương tiện hoặc tài xế chưa đáp ứng điều kiện của tuyến này",
  "VEHICLE_NOT_FOUND": "Không tìm thấy phương tiện hoặc phương tiện không còn tồn tại",
  "WEAK_PASSWORD": "Mật khẩu chưa đáp ứng yêu cầu độ mạnh",

  // ── Market sessions + per-item assignment (14/08/2026 backend contract change) ──
  // Not yet mapped on the web side either — these codes are newer than the
  // web's own error-codes.ts. Wording follows the same voice as the ported set.
  "ITEM_NOT_ASSIGNED_TO_AGENT": "Bạn chưa được giao mặt hàng nào trong lô này.",
  "BATCH_INCOMPLETE": "Lô thu mua chưa hoàn tất — còn sản phẩm chưa được xác nhận mua.",
  "ITEM_ALREADY_PURCHASED": "Sản phẩm này đã được xác nhận mua rồi — hãy tải lại lô.",
  "MARKET_SESSION_NOT_OPEN": "Phiên chợ chưa mở nên chưa thể đặt hàng lúc này.",
  "MARKET_SESSION_NOT_AVAILABLE": "Chợ này hiện chưa có phiên chợ khả dụng cho ngày đã chọn.",
  "MARKET_SESSION_NOT_CLOSED": "Phiên chợ chưa đóng nên chưa thể thực hiện thao tác này.",
  "MARKET_SESSION_CLOSED": "Phiên chợ đã đóng — không thể thay đổi đơn hàng cho phiên này nữa.",
  "MARKET_SESSION_CUTOFF_PASSED": "Đã quá giờ chốt đơn của phiên chợ này.",
  "MARKET_SESSION_CONFLICT": "Phiên chợ vừa được cập nhật bởi người khác — vui lòng tải lại và thử lại.",
  "MARKET_SESSION_NOT_READY": "Phiên chợ chưa sẵn sàng (còn thiếu hub/nhân sự/xe) — vui lòng thử lại sau.",
  "INVALID_MARKET_SESSION": "Phiên chợ không hợp lệ.",
};

// ─── Exact backend message text → Vietnamese ────────────────────────────────
// FluentValidation `.WithMessage(...)` overrides send constant, matchable
// text. Ported 1:1 from the same validators the web app reads.
export const API_MESSAGE_TEXT: Record<string, string> = {
  "All orders must be confirmed before grouping": "Tất cả đơn hàng phải được xác nhận trước khi gộp",
  "An order must have at least one item.": "Đơn hàng phải có ít nhất một sản phẩm",
  "At least one order must be provided": "Phải có ít nhất một đơn hàng",
  "Authentication is required": "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
  "Auto-batch is already running": "Tiến trình gộp tự động đang chạy cho ngày này",
  "AvatarUrl must be a valid absolute HTTPS or HTTP URL.": "Ảnh đại diện không hợp lệ",
  "BusinessLicenseUrl must be a valid absolute HTTPS or HTTP URL.": "Ảnh giấy phép kinh doanh không hợp lệ",
  "Cannot calculate a route for more than 20 orders at once": "Không thể xử lý quá 20 đơn hàng cùng lúc",
  "Capacity must be greater than 0": "Sức chứa phải lớn hơn 0",
  "End date must be on or after start date": "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu",
  "Identifier must be a valid email address or phone number": "Phải là email hoặc số điện thoại hợp lệ",
  "Latitude must be between -90 and 90.": "Vĩ độ phải nằm trong khoảng -90 đến 90",
  "Longitude must be between -180 and 180.": "Kinh độ phải nằm trong khoảng -180 đến 180",
  "Must be a valid email address": "Email không hợp lệ",
  "Must be a valid phone number (7–15 digits, optional leading +)": "Số điện thoại không hợp lệ (7–15 chữ số, có thể có dấu + ở đầu)",
  "Must be at least 8 characters": "Phải có ít nhất 8 ký tự",
  "Must be greater than 0": "Giá phải lớn hơn 0",
  "Must contain at least one number": "Phải có ít nhất một chữ số",
  "Must contain at least one special character": "Phải có ít nhất một ký tự đặc biệt",
  "Must contain at least one uppercase letter": "Phải có ít nhất một chữ hoa",
  "Must not exceed 200 characters": "Không được vượt quá 200 ký tự",
  "Must not exceed 255 characters": "Không được vượt quá 255 ký tự",
  "New password must be different from current password": "Mật khẩu mới phải khác mật khẩu hiện tại",
  "New password must be different from current password.": "Mật khẩu mới phải khác mật khẩu hiện tại",
  "One or more fields failed validation.": "Vui lòng kiểm tra lại các trường được đánh dấu và thử lại",
  "One or more orders are already in an active order group": "Một hoặc nhiều đơn hàng đã thuộc một nhóm đang hoạt động",
  "Order cannot be cancelled in its current status": "Không thể hủy đơn hàng này ở trạng thái hiện tại",
  "OrderItemId must be null or a non-empty id.": "Không lưu được mục này. Vui lòng tải lại và thử lại",
  "Password must contain at least one digit.": "Phải có ít nhất một chữ số",
  "Password must contain at least one special character.": "Phải có ít nhất một ký tự đặc biệt",
  "Password must contain at least one uppercase letter.": "Phải có ít nhất một chữ hoa",
  "Phone must be a valid phone number (7–15 digits, optional leading +).": "Số điện thoại không hợp lệ (7–15 chữ số, có thể có dấu + ở đầu)",
  "Pickup end time must be after pickup start time.": "Kiểm tra lại khung giờ nhận hàng",
  "Price must be greater than 0": "Giá phải lớn hơn 0",
  "Price must have at most 2 decimal places": "Giá chỉ được có tối đa 2 chữ số thập phân",
  "Quantity must be 0 or greater": "Số lượng phải bằng 0 hoặc lớn hơn",
  "Quantity must be a whole number": "Số lượng phải là số nguyên",
  "Quantity must be greater than 0": "Số lượng phải lớn hơn 0",
  "RecurrenceType must be 'daily' or 'weekly'.": "Chọn hằng ngày hoặc hằng tuần",
  "Requested quantity exceeds available hub stock": "Số lượng yêu cầu vượt quá tồn kho tại hub",
  "Role must be one of the accepted values": "Tài khoản không phù hợp với thao tác này",
  "Scheduled time must be at least 2 hours from now": "Thời gian đặt lịch phải cách hiện tại ít nhất 2 giờ",
  "You are not authorized to update prices at this market": "Bạn không được phân công cho chợ này",
  "You do not have permission to perform this action": "Bạn không có quyền thực hiện thao tác này",
  "Your restaurant account is pending Admin approval": "Nhà hàng của bạn đang chờ quản trị viên duyệt",
};

// ─── FluentValidation default message shapes ────────────────────────────────
// Defaults interpolate the property name (and, for length rules, what the
// user typed) so they can't be matched exactly — only by shape. Without
// these, any bare `NotEmpty()`/`EmailAddress()`/`MaximumLength()` rule (most
// of them — the backend overrides `.WithMessage(...)` on only a handful)
// reaches the user as raw English.
const MESSAGE_PATTERNS: { pattern: RegExp; build: (match: RegExpMatchArray) => string }[] = [
  { pattern: /^'.+' must not be empty\.$/, build: () => 'Trường này là bắt buộc' },
  { pattern: /^'.+' is not a valid email address\.$/, build: () => 'Email không hợp lệ' },
  {
    pattern: /^The length of '.+' must be (\d+) characters or fewer/,
    build: (m) => `Không được vượt quá ${m[1]} ký tự`,
  },
  {
    pattern: /^The length of '.+' must be at least (\d+) characters/,
    build: (m) => `Phải có ít nhất ${m[1]} ký tự`,
  },
  { pattern: /^'.+' must be greater than '(.+)'\.$/, build: (m) => `Phải lớn hơn ${m[1]}` },
  {
    pattern: /^'.+' must be greater than or equal to '(.+)'\.$/,
    build: (m) => `Phải từ ${m[1]} trở lên`,
  },
  {
    pattern: /^'.+' must be less than or equal to '(.+)'\.$/,
    build: (m) => `Không được vượt quá ${m[1]}`,
  },
  {
    pattern: /^'.+' must be between (.+) and (.+)\.$/,
    build: (m) => `Phải nằm trong khoảng ${m[1]} đến ${m[2]}`,
  },
  { pattern: /^'.+' is not in the correct format\.$/, build: () => 'Sai định dạng' },
  { pattern: /^'.+' must not be equal to '.+'\.$/, build: () => 'Phải khác giá trị hiện tại' },
];

// ─── HTTP status → Vietnamese category ──────────────────────────────────────
// Safety net for a rejection whose code isn't registered above (an
// unregistered backend code falls through to a bare 500 — see
// `ErrorExtensions.ToActionResult`'s own doc comment).
const API_STATUS_MESSAGES: Record<number, string> = {
  400: 'Vui lòng kiểm tra lại các trường được đánh dấu và thử lại',
  401: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
  403: 'Bạn không có quyền thực hiện thao tác này',
  404: 'Không tìm thấy mục yêu cầu hoặc mục này không còn tồn tại',
  409: 'Thao tác xung đột với trạng thái hiện tại — vui lòng tải lại và thử lại',
  422: 'Thao tác này hiện không được phép',
  429: 'Quá nhiều yêu cầu, vui lòng đợi một lát và thử lại',
  500: 'Đã xảy ra sự cố, vui lòng thử lại sau giây lát',
  502: 'Đã xảy ra sự cố, vui lòng thử lại sau giây lát',
  503: 'Đã xảy ra sự cố, vui lòng thử lại sau giây lát',
  504: 'Đã xảy ra sự cố, vui lòng thử lại sau giây lát',
};

const DEFAULT_FALLBACK = 'Đã xảy ra lỗi, vui lòng thử lại';

// A thrown library/network error can bypass the normal response envelope. Never
// surface implementation terms or machine codes from those messages to users.
const TECHNICAL_MESSAGE_PATTERN = /\b(?:api|backend|server|rest|signalr|endpoint|payload|token|jwt|https?|exception|stack|database|sql|guid|cloudinary|provider)\b/i;
const MACHINE_CODE_PATTERN = /(?:^|[\s(:])[A-Z][A-Z0-9_]{2,}(?=$|[\s).,:])/;

function isUserFacingMessage(message: string): boolean {
  const trimmed = message.trim();
  return trimmed.length > 0
    && !TECHNICAL_MESSAGE_PATTERN.test(trimmed)
    && !MACHINE_CODE_PATTERN.test(trimmed);
}

/**
 * Marks an `Error` whose `.message` may not be Vietnamese — thrown by
 * `uploadImageToCloudinary`/`uploadProofOfDelivery` when Cloudinary rejects an
 * upload, since their message is `cloudinaryMessage ?? vietnameseFallback`
 * and Cloudinary's own text is English. Every *other* thrown `Error` in the
 * app (route-store guards, hub-load aggregation errors, etc.) is already
 * app-authored Vietnamese and safe to show verbatim — this class exists so
 * only the genuinely-tainted case is distrusted, instead of a hand-maintained
 * whitelist that would silently swallow every future Vietnamese `Error` that
 * forgets to be added to it.
 */
export class UntrustedUploadError extends Error {}

interface NormalizedApiError {
  code?: string;
  message?: string;
  details?: Array<{ field?: string; message?: string }>;
  status?: number;
}

/** `apiClient`'s response interceptor normalizes both envelope shapes onto `error.response.data`. */
function readApiError(error: unknown): NormalizedApiError | null {
  const response = (error as { response?: { status?: number; data?: unknown } })?.response;
  if (!response) return null;

  const data = (response.data ?? {}) as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };

  return {
    code: typeof data.code === 'string' && data.code ? data.code : undefined,
    message: typeof data.message === 'string' && data.message ? data.message : undefined,
    details: Array.isArray(data.details)
      ? data.details.filter((d): d is { field?: string; message?: string } => typeof d === 'object' && d !== null)
      : undefined,
    status: response.status,
  };
}

function localizeMessageText(text: string | undefined): string | undefined {
  const trimmed = text?.trim();
  if (!trimmed) return undefined;

  const exact = API_MESSAGE_TEXT[trimmed];
  if (exact) return exact;

  for (const { pattern, build } of MESSAGE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return build(match);
  }
  return undefined;
}

/**
 * Localizes a `{ code, message }` pair that arrived in a **successful** response
 * body rather than as a rejection — e.g. the confirm-order preview's
 * `issues[]`, a 200 whose payload lists (in the backend's English) every
 * reason the order would currently be refused. Same specificity order as
 * {@link getApiErrorMessage}: message text first, then the code, then the
 * caller's fallback.
 */
export function describeApiCode(
  code: string | null | undefined,
  message: string | null | undefined,
  fallback: string = DEFAULT_FALLBACK,
): string {
  const localizedMessage = localizeMessageText(message ?? undefined);
  if (localizedMessage) return localizedMessage;
  if (code && API_ERROR_MESSAGES[code]) return API_ERROR_MESSAGES[code];
  return fallback;
}

/**
 * Resolves any failed API call (or thrown `Error`) to a Vietnamese message, in
 * order of specificity:
 *  1. per-field validation detail (`details[]`), each localized and joined —
 *     the specific reason(s) a `ValidationException` actually failed for;
 *  2. an exact/pattern-matched top-level validator message;
 *  3. a message for the backend `code`;
 *  4. a message for the HTTP status category;
 *  5. a network/thrown-`Error` message (already Vietnamese — every thrown
 *     `Error` in the app is app-authored text, except {@link UntrustedUploadError}
 *     which may carry Cloudinary's own English and is never trusted verbatim);
 *  6. the caller's `fallback`, or a generic default.
 *
 * The backend's raw English is never surfaced as-is — an unmapped string
 * falls through to the next level instead of being shown directly.
 */
export function getApiErrorMessage(error: unknown, fallback: string = DEFAULT_FALLBACK): string {
  const info = readApiError(error);

  if (!info) {
    if (error instanceof UntrustedUploadError) return fallback;
    if (error instanceof Error && isUserFacingMessage(error.message)) return error.message;
    return fallback;
  }

  if (info.details?.length) {
    const localized = [...new Set(info.details.map((d) => d.message).filter((m): m is string => !!m))]
      .map(localizeMessageText)
      .filter((m): m is string => !!m);
    if (localized.length > 0) return localized.join(' ');
  }

  const localizedMessage = localizeMessageText(info.message);
  if (localizedMessage) return localizedMessage;

  if (info.code && API_ERROR_MESSAGES[info.code]) return API_ERROR_MESSAGES[info.code];

  if (info.status && API_STATUS_MESSAGES[info.status]) {
    return API_STATUS_MESSAGES[info.status];
  }

  return fallback;
}
