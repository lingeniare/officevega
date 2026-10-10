# Bảng điều khiển trợ lý AI

Mọi trình soạn thảo đều có thể gọi bảng AI: chọn một nội dung, đưa ra chỉ dẫn, rồi xem kết quả hiện dần từng phần.

## Mở và sử dụng

![Bảng AI trong Docs](img/ai-panel.png)

- Các lối vào: **nút AI** trên dải lệnh của từng trình soạn thảo, **Hỏi AI** trong menu ngữ cảnh, hoặc Hỏi AI trên thanh đánh dấu.
- Mô tả công việc bằng ngôn ngữ tự nhiên (viết lại đoạn này / đổi cột này thành phần trăm / bố trí lại trang này...) rồi nhấn Enter.
- Câu trả lời hiển thị **dạng luồng**. Khi AI cần công cụ (đọc tài liệu, sửa tài liệu), nó sẽ thực thi và tiếp tục cho đến khi xong.
- **Dừng**: bạn có thể ngắt lượt hiện tại bất cứ lúc nào.

## AI có thể làm gì

- **Docs**: viết lại, mở rộng, dịch, tóm tắt, chèn bảng và hình ảnh, điều chỉnh định dạng; mỗi lượt đều chụp ảnh trạng thái trước khi thay đổi.
- **Sheets**: công thức, điền dữ liệu, biến đổi hàng loạt, định dạng.
- **Slides**: tạo cả bộ trình chiếu, điều chỉnh bố cục, viết lại nội dung.
- **PDF**: hỏi đáp và tóm tắt dựa trên văn bản hoặc các trang đã chọn.
- **Markdown / HTML**: viết lại, mở rộng, dịch.

## Lịch sử trò chuyện

- Mỗi cuộc trò chuyện được tự động lưu và chỉ nằm trên máy tính này. Ngày mai mở lại bảng, bạn có thể tiếp tục đúng chỗ đã dừng.
- Bắt đầu một cuộc trò chuyện mới bằng **Cuộc trò chuyện mới**; chuyển giữa các cuộc trò chuyện cũ trong danh sách lịch sử ở đầu bảng.
- Đổi tên cuộc trò chuyện để tìm nhanh hơn; xóa để gỡ hẳn. Việc xóa một cuộc trò chuyện không bao giờ ảnh hưởng đến tài liệu của bạn.

## Quay lui và an toàn

- Bảng của Docs giữ một **danh sách phiên bản**: mỗi lượt có một ảnh chụp, bạn có thể quay lui về bất kỳ ảnh nào, và chính thao tác quay lui cũng có thể hoàn tác bằng Ctrl+Z. Ảnh chụp vẫn còn sau khi mở lại tài liệu.
- Các chỉnh sửa của AI đi qua cùng quy trình chỉnh sửa như chỉnh sửa thủ công (hoàn tác được, phải qua xác nhận lưu) — không có gì vượt qua bước xác nhận lưu của bạn.

## Quyền riêng tư và ẩn danh hóa

- Chỉ dẫn và nội dung tài liệu liên quan được gửi tới **dịch vụ mô hình bạn đã cấu hình** (VEGA lưu trữ hoặc một điểm cuối tùy chỉnh, xem chương tiếp theo); nếu chưa cấu hình thì không có gì được gửi đi.
- **Ẩn danh hóa (152-FZ)**: trước khi gửi, ứng dụng có thể che các dữ liệu cá nhân — họ tên, số điện thoại, email, thông tin hộ chiếu — để mô hình không bao giờ nhìn thấy chúng. Bật tùy chọn này trong Cài đặt ▸ AI; các phần đã che sẽ tự động được khôi phục trong tài liệu khi câu trả lời quay về.
- **Không có thống kê theo dõi**: OfficeVega không đi kèm Google Analytics hay bất kỳ trình theo dõi bên thứ ba nào. Vì không có gì để tắt, nên cũng không có công tắc thống kê sử dụng — nội dung tài liệu và trò chuyện không bao giờ rời khỏi đường dẫn bạn đã cấu hình.
- Tệp cục bộ không được tải lên nơi nào khác; khóa BYOK được lưu trong tệp cài đặt của ứng dụng trên máy này và chỉ được gửi trong phần đầu của yêu cầu.
