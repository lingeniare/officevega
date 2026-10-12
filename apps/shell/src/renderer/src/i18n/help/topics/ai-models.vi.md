# Mô hình AI và cài đặt

## Nhà cung cấp và mô hình

Mô hình và khóa được cấu hình trong Cài đặt (hàng tài khoản ở góc dưới bên trái của Trang chủ):

![Cửa sổ Cài đặt](img/settings-general.png)

- **VEGA trên máy chủ của VEGA**: đăng nhập (luồng mã thiết bị) là dùng được ngay — không cần cấu hình gì. Yêu cầu được gửi tới `https://api.vega.chat`, một điểm cuối tương thích OpenRouter, nên mọi ứng dụng theo kiểu OpenRouter đều có thể trỏ tới đó.
- **Điểm cuối tùy chỉnh (BYOK)**: Cài đặt ▸ AI nhận một URL cơ sở và một khóa API cho từng giao thức — tương thích OpenAI, Anthropic, Gemini, DeepSeek, DashScope (qwen) và nhiều loại khác. Khóa được lưu trong tệp cài đặt của ứng dụng trên máy này và chỉ được gửi trong phần đầu của yêu cầu.
- Có thể chọn một mô hình khác nhau cho từng năng lực: trò chuyện/tạo nội dung, tạo hình ảnh, phân tích hình ảnh.
- **Kiểm tra kết nối**: xác minh điểm cuối có thể truy cập được và mô hình có hiển thị hay không trước khi lưu.
- URL cơ sở có thể chứa đường dẫn và chuỗi truy vấn (kiểu cổng kết nối); các đường dẫn điểm cuối được nối thêm một cách chính xác.

## Chọn mô hình

- Bộ chọn mô hình nằm ở đầu bảng AI và trong Cài đặt ▸ Mô hình AI — một lựa chọn cho trò chuyện, cộng thêm các lựa chọn riêng cho tạo hình ảnh và phân tích hình ảnh nếu nhà cung cấp hỗ trợ.
- Bắt đầu với mô hình VEGA mặc định: nó phù hợp với hầu hết các tác vụ văn phòng (viết lại, bảng, công thức, tóm tắt). Chuyển sang mô hình lớn hơn khi cần suy luận khó hoặc tài liệu dài, và sang mô hình nhỏ, rẻ hơn khi cần bản nháp nhanh.
- Cuộc trò chuyện đang diễn ra sẽ giữ mô hình cũ cho đến lượt tiếp theo; cuộc trò chuyện mới sẽ dùng lựa chọn mới ngay lập tức.

## Giá cả và mức sử dụng

- VEGA tính phí theo kiểu trả theo mức dùng cho từng mô hình. Bảng giá đầy đủ nằm tại [api.vega.chat/aimodels](https://api.vega.chat/aimodels) — hãy kiểm tra giá đầu vào/đầu ra của mô hình trước khi chạy một tác vụ lớn.
- Số dư và mức chi tiêu hiện tại nằm trên [bảng điều khiển VEGA](https://api.vega.chat/dashboard), cũng có thể mở từ hàng số dư trong menu tài khoản.
- URL cơ sở có thể kèm đường dẫn và chuỗi truy vấn (kiểu cổng kết nối); các đường dẫn điểm cuối được nối thêm một cách chính xác.

## Tích hợp CLI (kiểu Codex)

- Cài đặt nhận đường dẫn tới một chương trình CLI cục bộ (thư mục home không phải ASCII và tiền tố ~ đều dùng được; ~ được mở rộng tự động). Chức năng phát hiện mô hình sẽ dò các mô hình mà CLI cung cấp.
- Kiểm tra chỉ xác nhận tệp có tồn tại — không giới hạn bộ ký tự.

## Thay đổi có hiệu lực khi nào

- Thay đổi mô hình và điểm cuối có hiệu lực ngay lập tức; cuộc trò chuyện đang diễn ra vẫn dùng cấu hình cũ cho đến lượt tiếp theo.
