import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export const RESTAURANT_POLICY_VERSION = '1.0';
export const RESTAURANT_POLICY_EFFECTIVE_DATE = '06/08/2026';

export type RestaurantPolicySection = {
  id: string;
  title: string;
  summary: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  items: string[];
};

export const RESTAURANT_POLICY_SECTIONS: RestaurantPolicySection[] = [
  {
    id: 'scope',
    title: 'Phạm vi và điều kiện sử dụng',
    summary: 'Đối tượng áp dụng và trách nhiệm về thông tin nhà hàng.',
    icon: 'business-outline',
    items: [
      'Chính sách áp dụng cho nhà hàng đặt hàng, theo dõi giao nhận và quản lý công nợ qua ứng dụng FreshFlow.',
      'Nhà hàng chỉ có thể xác nhận đơn khi tài khoản đã được phê duyệt và đang hoạt động.',
      'Nhà hàng chịu trách nhiệm duy trì chính xác thông tin người nhận, số điện thoại, địa chỉ và tọa độ giao hàng. Thông tin tại thời điểm xác nhận sẽ được lưu cùng đơn hàng.',
    ],
  },
  {
    id: 'order-confirmation',
    title: 'Đặt hàng và xác nhận đơn',
    summary: 'Khi nào đơn được ghi nhận và các điều kiện cần đáp ứng.',
    icon: 'receipt-outline',
    items: [
      'Đơn ở trạng thái Bản nháp có thể thêm, sửa hoặc xóa sản phẩm và chưa được xem là đơn đã đặt thành công.',
      'Khi xác nhận, FreshFlow kiểm tra số lượng tối thiểu của từng sản phẩm, tồn kho, địa chỉ giao hàng và hạn mức tín dụng; đồng thời xác định thuế, phí giao và khóa giá của đơn.',
      'Đơn chỉ được ghi nhận thành công khi ứng dụng hiển thị trạng thái Đã xác nhận. Nếu một điều kiện không còn đáp ứng, nhà hàng cần điều chỉnh đơn theo thông báo trên ứng dụng.',
      'Giá và thông tin sản phẩm hiển thị trong giỏ hàng là dữ liệu tham khảo trước xác nhận; số tiền chính thức được thể hiện tại bước Xem xác nhận.',
    ],
  },
  {
    id: 'delivery-schedule',
    title: 'Lịch giao và thời điểm chốt đơn',
    summary: 'Cách FreshFlow xác định ngày giao sớm nhất.',
    icon: 'calendar-outline',
    items: [
      'Nhà hàng có thể chọn “Sớm nhất có thể” hoặc chọn thời gian trong khoảng giao hàng đang áp dụng.',
      'Đơn xác nhận trước thời điểm chốt hằng ngày được xếp ngày giao sớm nhất từ ngày kế tiếp (D+1); đơn xác nhận từ thời điểm chốt trở đi được xếp sớm nhất từ D+2.',
      'Nếu thời gian nhà hàng chọn sớm hơn mốc hợp lệ, FreshFlow tự điều chỉnh sang thời gian giao sớm nhất và hiển thị lại trước hoặc sau khi xác nhận.',
      'Thời gian giao là dự kiến và có thể thay đổi theo tình trạng thu mua, phân loại, tuyến giao hoặc sự kiện bất khả kháng. Thay đổi quan trọng sẽ được cập nhật qua trạng thái đơn hoặc thông báo trong ứng dụng.',
    ],
  },
  {
    id: 'pricing',
    title: 'Số lượng, giá, thuế và phí giao hàng',
    summary: 'Nguyên tắc tính tổng tiền theo dữ liệu thực tế của đơn.',
    icon: 'calculator-outline',
    items: [
      'Số lượng tối thiểu được áp dụng theo từng sản phẩm. Đơn không đạt mức tối thiểu sẽ chưa thể xác nhận.',
      'Tổng thanh toán gồm tiền hàng, thuế giá trị gia tăng áp dụng cho từng mặt hàng và phí giao hàng.',
      'Phí giao hàng được tính theo khoảng cách từ điểm xuất phát xa nhất trong đơn đến địa chỉ nhận, theo đơn giá vận hành hiện hành. Khoảng cách và phí dự kiến được hiển thị tại bước xác nhận.',
      'Số lượng và đơn giá thực tế có thể được cập nhật theo kết quả thu mua/kiểm đếm. Nhà hàng có thể đối chiếu số đặt và số lượng thực tế trong chi tiết đơn.',
    ],
  },
  {
    id: 'credit',
    title: 'Tín dụng, công nợ và hóa đơn',
    summary: 'Hạn mức khả dụng, ghi nhận công nợ và thông tin thuế.',
    icon: 'card-outline',
    items: [
      'Đơn chỉ được xác nhận khi hạn mức tín dụng khả dụng đủ cho tổng giá trị đơn.',
      'Giá trị đơn được ghi nhận vào công nợ khi xác nhận. Nhà hàng có thể theo dõi hạn mức, dư nợ, giao dịch và sao kê tại mục Tín dụng & Thanh toán.',
      'Nếu đơn được hủy hợp lệ trước khi vào phiên thu mua, khoản công nợ liên quan sẽ được hoàn hoặc miễn trừ theo kết quả xử lý.',
      'Nhà hàng cần cập nhật đúng mã số thuế, tên pháp lý, địa chỉ và email nhận hóa đơn để FreshFlow phát hành hóa đơn VAT khi đủ điều kiện.',
    ],
  },
  {
    id: 'changes-cancellation',
    title: 'Thay đổi, hủy và đặt hàng định kỳ',
    summary: 'Giới hạn chỉnh sửa theo từng trạng thái đơn.',
    icon: 'create-outline',
    items: [
      'Sản phẩm và số lượng chỉ có thể chỉnh sửa khi đơn còn ở trạng thái Bản nháp.',
      'Nhà hàng có thể hủy đơn khi đơn còn là Bản nháp hoặc Đã xác nhận. Sau khi đơn đã được gom vào phiên thu mua, nhà hàng không thể tự hủy riêng đơn đó.',
      'Lịch đặt hàng định kỳ chỉ là mẫu tạo đơn theo chu kỳ. Mỗi đơn phát sinh vẫn phải đáp ứng tồn kho, giá, lịch giao và hạn mức tại thời điểm xử lý.',
      'Việc hủy lịch định kỳ không làm hủy các đơn đã được tạo trước đó; nhà hàng cần kiểm tra và xử lý từng đơn nếu cần.',
    ],
  },
  {
    id: 'receiving',
    title: 'Giao nhận và kiểm đếm',
    summary: 'Những việc nhà hàng cần thực hiện khi nhận hàng.',
    icon: 'checkmark-done-outline',
    items: [
      'Nhà hàng cần bố trí người nhận tại địa chỉ đã xác nhận, giữ điện thoại liên lạc và phối hợp với tài xế trong quá trình giao.',
      'Khi nhận hàng, vui lòng đối chiếu sản phẩm, số lượng, tình trạng hàng và thông tin trong chi tiết đơn trước khi xác nhận đã nhận.',
      'Chỉ xác nhận Đã nhận hàng sau khi hoàn tất kiểm tra. Việc xác nhận được ghi nhận một lần trên đơn đã giao.',
      'Nếu phát hiện thiếu, sai hoặc hư hỏng, nhà hàng nên ghi nhận rõ sản phẩm, số lượng bị ảnh hưởng và mô tả hiện trạng ngay trên ứng dụng.',
    ],
  },
  {
    id: 'complaints',
    title: 'Báo sự cố và xử lý khiếu nại',
    summary: 'Các trường hợp được ghi nhận sau giao hàng.',
    icon: 'alert-circle-outline',
    items: [
      'Chức năng Báo sự cố được mở khi đơn đã chuyển sang trạng thái Đã giao.',
      'FreshFlow tiếp nhận ba nhóm vấn đề: thiếu hàng, sai hàng và hàng hư hỏng. Nhà hàng cần chọn đúng sản phẩm, nhập số lượng bị ảnh hưởng và mô tả chi tiết.',
      'Số lượng báo sự cố phải lớn hơn 0 và không vượt quá số lượng đã đặt của sản phẩm tương ứng.',
      'FreshFlow sẽ đối chiếu dữ liệu đơn hàng, kết quả kiểm đếm và thông tin giao nhận. Khoản điều chỉnh hoặc hoàn công nợ, nếu có, được thực hiện theo kết quả phê duyệt.',
    ],
  },
  {
    id: 'force-majeure',
    title: 'Bất khả kháng và gián đoạn dịch vụ',
    summary: 'Cách xử lý khi vận hành bị ảnh hưởng ngoài khả năng kiểm soát.',
    icon: 'thunderstorm-outline',
    items: [
      'Trong trường hợp thiên tai, dịch bệnh, cấm đường, sự cố hạ tầng, gián đoạn chợ/nguồn cung hoặc sự kiện ngoài khả năng kiểm soát, lịch giao và khả năng đáp ứng có thể thay đổi.',
      'FreshFlow sẽ cập nhật trạng thái, điều phối lại hoặc hủy theo tình hình thực tế; các điều chỉnh công nợ liên quan được xử lý theo trạng thái cuối cùng của đơn.',
    ],
  },
  {
    id: 'updates',
    title: 'Cập nhật và hiệu lực',
    summary: 'Phiên bản áp dụng của chính sách vận hành.',
    icon: 'refresh-circle-outline',
    items: [
      `Phiên bản ${RESTAURANT_POLICY_VERSION} có hiệu lực từ ngày ${RESTAURANT_POLICY_EFFECTIVE_DATE}.`,
      'FreshFlow có thể cập nhật chính sách để phù hợp với quy trình vận hành và các tính năng đang cung cấp. Phiên bản hiển thị trong ứng dụng là phiên bản áp dụng tại thời điểm nhà hàng tra cứu.',
      'Các thông số vận hành như thời điểm chốt đơn, khoảng đặt lịch, giá, thuế và phí có thể thay đổi và sẽ được hiển thị tại bước xác nhận; thông tin tại bước xác nhận được ưu tiên nếu khác với nội dung mô tả chung.',
    ],
  },
];
