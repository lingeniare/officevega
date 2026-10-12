# Bảng điều khiển trợ lý AI

Mọi trình soạn thảo đều có thể gọi bảng AI: chọn một nội dung, đưa ra chỉ dẫn, rồi xem kết quả hiện dần từng phần.

## Mở và sử dụng

![Bảng AI trong Docs](img/ai-panel.png)

- Các lối vào: **nút AI** trên dải ruy-bâng của từng trình soạn thảo, **Hỏi AI** trong menu ngữ cảnh, hoặc Hỏi AI trên thanh đánh dấu.
- Mô tả công việc bằng ngôn ngữ tự nhiên (viết lại đoạn này / biến cột này thành phần trăm / bố cục lại trang này...) rồi nhấn Enter.
- Câu trả lời hiển thị **dạng luồng**; khi AI cần công cụ (đọc tài liệu, sửa tài liệu) thì nó thực thi và tiếp tục cho tới khi xong.
- **Dừng**: có thể ngắt lượt hiện tại bất cứ lúc nào.
- **Hàng đợi**: khi phản hồi đang truyền, Enter đưa tin nhắn của bạn vào hàng đợi thay vì bỏ đi — dải phía trên ô nhập đếm chúng; mở ra để sửa, bỏ, đổi thứ tự, tạm dừng hay dọn sạch. Tin tiếp theo tự gửi khi lượt kết thúc; Esc vẫn dừng lượt như cũ.

## AI có thể làm gì

- **Docs**: viết lại, mở rộng, dịch, tóm tắt, chèn bảng và hình ảnh, điều chỉnh định dạng; mỗi lượt đều chụp ảnh trạng thái trước khi thay đổi.
- **Sheets**: công thức, điền dữ liệu, biến đổi hàng loạt, định dạng.
- **Slides**: tạo cả bộ trình chiếu, điều chỉnh bố cục, viết lại nội dung.
- **PDF**: hỏi đáp và tóm tắt dựa trên văn bản hoặc các trang đã chọn.
- **Markdown / HTML**: viết lại, mở rộng, dịch.
- **Trang chủ ▸ Ask AI** trả lời từ các tệp bạn đánh sao và trích dẫn chúng — bảng cơ sở tri thức có mục riêng trong chương Trang chủ, và bảng AI của Docs cũng mang kỹ năng ấy.

## Lịch sử trò chuyện

- Mỗi cuộc trò chuyện được tự động lưu và chỉ nằm trên máy tính này. Ngày mai mở lại bảng, bạn có thể tiếp tục đúng chỗ đã dừng.
- Bắt đầu một cuộc trò chuyện mới bằng **Cuộc trò chuyện mới**; chuyển giữa các cuộc trò chuyện cũ trong danh sách lịch sử ở đầu bảng.
- Đổi tên cuộc trò chuyện để tìm nhanh hơn; xóa để gỡ hẳn. Việc xóa một cuộc trò chuyện không bao giờ ảnh hưởng đến tài liệu của bạn.

## Quay lui và an toàn

- Bảng của Docs giữ một **danh sách phiên bản**: mỗi lượt có một ảnh chụp, bạn có thể quay lui về bất kỳ ảnh nào, và chính thao tác quay lui cũng có thể hoàn tác bằng Ctrl+Z. Ảnh chụp vẫn còn sau khi mở lại tài liệu.
- Các chỉnh sửa của AI đi qua cùng quy trình chỉnh sửa như chỉnh sửa thủ công (hoàn tác được, phải qua xác nhận lưu) — không có gì vượt qua bước xác nhận lưu của bạn.

## Ẩn vùng chọn khỏi AI

- Trong Slides, HTML và Markdown, một vùng chọn có thể được giấu khỏi mắt mô hình: chuột phải ▸ **Ẩn vùng chọn khỏi AI**, đặt tên chỗ giữ chỗ, và mô hình đọc `{{tên}}` thay cho chữ. (Markdown bật mục này bằng công tắc mắt-gạch-chéo trên ruy-băng; của HTML nằm ở bảng mã nguồn.)
- Tệp giữ nguyên văn thật — lưu, xuất và in không bị ảnh hưởng, dấu còn sống qua lần mở lại. Chính mục đó hủy việc ẩn (Markdown có thêm mục riêng **Hiện lại vùng chọn cho AI**).
- HTML ẩn nội dung phần tử, giá trị thuộc tính và hằng chuỗi trong script; trang đã render không bao giờ đổi.
- Slides còn ẩn cả hình, video và âm thanh trọn vẹn, và một slide có nội dung ẩn không bao giờ được gửi dạng chụp màn hình: kiểm tra bố cục tự động bỏ qua trang đó và nói rõ.
- Điều này chỉ dành cho AI trong ứng dụng — CLI, công cụ MCP và xuất headless đọc tệp trực tiếp nên vẫn thấy văn bản.

## Quyền riêng tư và ẩn danh hóa

- Chỉ dẫn và nội dung tài liệu liên quan được gửi tới **dịch vụ mô hình bạn đã cấu hình** (VEGA lưu trữ hoặc một điểm cuối tùy chỉnh, xem chương tiếp theo); nếu chưa cấu hình thì không có gì được gửi đi.
- **Ẩn danh hóa (152-FZ)**: trước khi gửi, ứng dụng có thể che các dữ liệu cá nhân — họ tên, số điện thoại, email, thông tin hộ chiếu — để mô hình không bao giờ nhìn thấy chúng. Bật tùy chọn này trong Cài đặt ▸ AI; các phần đã che sẽ tự động được khôi phục trong tài liệu khi câu trả lời quay về.
- **Không có thống kê theo dõi**: OfficeVega không đi kèm Google Analytics hay bất kỳ trình theo dõi bên thứ ba nào. Vì không có gì để tắt, nên cũng không có công tắc thống kê sử dụng — nội dung tài liệu và trò chuyện không bao giờ rời khỏi đường dẫn bạn đã cấu hình.
- Tệp cục bộ không được tải lên nơi nào khác; khóa BYOK được lưu trong tệp cài đặt của ứng dụng trên máy này và chỉ được gửi trong phần đầu của yêu cầu.
