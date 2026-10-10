# Cài đặt, ngôn ngữ, chủ đề và tích hợp MCP

## Mở cài đặt

Hàng tài khoản ở góc dưới bên trái của Trang chủ sẽ mở bảng cài đặt (khi chưa đăng nhập, hàng này hiển thị "Đăng nhập"). Bảng này có sáu mục: Tài khoản, Mô hình AI, Phương tiện AI & Tìm kiếm, Chung, Tích hợp và Giới thiệu.

![Cài đặt ▸ Chung, nơi có ngôn ngữ, chủ đề, tự động lưu và công tắc thống kê sử dụng](img/settings-general.png)

Việc cấu hình mô hình có một bài riêng. Trong **Phương tiện AI & Tìm kiếm**, bạn bật hoặc tắt tạo hình ảnh, phân tích hình ảnh, phân tích video, tìm kiếm web và tìm kiếm tệp cục bộ theo từng nhà cung cấp.

## Ngôn ngữ

- Cài đặt có **21 ngôn ngữ giao diện**: tiếng Anh, tiếng Trung giản thể, tiếng Nhật, tiếng Hàn, tiếng Pháp, tiếng Đức, tiếng Tây Ban Nha, tiếng Thái, tiếng Indonesia, tiếng Nga, tiếng Ả Rập, tiếng Bồ Đào Nha, tiếng Ý, tiếng Ba Lan, tiếng Séc, tiếng Hà Lan, tiếng Mã Lai, tiếng Do Thái, tiếng Hindi, tiếng Trung phồn thể, tiếng Việt.
- Thay đổi có hiệu lực ngay và được ghi nhớ; thanh menu gốc được dựng lại theo ngôn ngữ đó.

## Chủ đề

Sáng / Tối / Theo hệ thống. Khi chọn Theo hệ thống, giao diện bám theo giao diện của hệ điều hành, và vùng trình soạn thảo đổi màu đồng bộ mà không bị nháy. Công tắc này cũng đổi màu bảng AI và màn hình Trang chủ, nên toàn bộ ứng dụng giữ chung một thiết kế: chọn Sáng cho nơi nhiều ánh sáng, Tối cho làm việc ban đêm, Theo hệ thống để theo Windows.

## Chung

- **Gửi số liệu sử dụng ẩn danh**: được bật theo mặc định. Dùng Google Analytics 4 và gửi địa chỉ IP công khai cùng siêu dữ liệu truyền tải của bạn; nội dung tài liệu, tên tệp và các sự kiện sử dụng không bao giờ bị thu thập hay gửi đi đâu cả. Bạn có thể tắt ở đây bất cứ lúc nào.
- **Vị trí thanh bên AI** (trái hoặc phải), **cỡ chữ bảng AI** và **Kiểm tra chính tả trong trò chuyện AI**.
- **Mở bảng AI trong tài liệu mới**: khi tắt, tài liệu mới sẽ bắt đầu với bảng AI đã thu gọn và chỉ cần một cú nhấp là mở ra.
- **Tự động lưu tất cả tài liệu** bật Tự động lưu theo mặc định trong mọi trình soạn thảo; bạn vẫn có thể tắt nó cho một cửa sổ riêng.
- **Vị trí lưu** kèm nút **Thay đổi**, và **Ứng dụng mặc định cho tài liệu Office** để đặt .docx / .xlsx / .pptx mở bằng OfficeVega.

## Phương tiện AI & Tìm kiếm

Đây không phải công tắc bật/tắt. Mỗi khả năng sẽ chọn nhà cung cấp phục vụ nó, còn khóa và URL cơ sở của nhà cung cấp chỉ nhập một lần và được dùng chung:

- **Tìm kiếm web**, **Tạo hình ảnh**, **Phân tích hình ảnh** và **Phân tích video**, mỗi mục đều có nhà cung cấp, mô hình, khóa và URL cơ sở. Chọn **VEGA** làm nhà cung cấp để định tuyến chúng qua `api.vega.chat` bằng khóa đăng nhập của bạn.
- **Tìm kiếm tệp cục bộ** chạy trên máy này. Bên dưới là **Sắp xếp lại kết quả tìm kiếm Jev**, **mặc định là tắt**. Khi bật, đoạn trích của 20 kết quả cục bộ hàng đầu — tối đa 1.200 ký tự cho mỗi tài liệu, cộng thêm tên tệp và tên thư mục — sẽ được gửi tới mô hình Jev của TypeSafe để sắp xếp lại theo mức độ liên quan. Khi tắt, không có gì rời khỏi thiết bị.

## Giới thiệu

- **Phiên bản**, trang web dự án [officevega.com](https://officevega.com) và trang phát hành [officevega.com/releases](https://officevega.com/releases).
- **Kênh cập nhật**: Ổn định hoặc Beta. Thay đổi có hiệu lực ngay và kiểm tra cập nhật; nó sẽ không hạ bản Beta về lại Ổn định.

## Đăng ký ứng dụng mặc định

Cài đặt có thể đăng ký OfficeVega làm ứng dụng mở .docx / .xlsx / .pptx / .pdf và các định dạng tương tự (đăng ký ứng dụng mặc định ở cấp hệ điều hành; hãy xác nhận khi được hỏi).

## Thông báo bên thứ ba và cập nhật

- Trợ giúp ▸ Thông báo của bên thứ ba: danh mục đầy đủ các giấy phép mã nguồn mở đi kèm ứng dụng.
- Trợ giúp ▸ Kiểm tra cập nhật: kích hoạt kiểm tra thủ công; nếu có phiên bản mới hơn, ứng dụng sẽ nhắc cài đặt.

## Đăng nhập VEGA

- Lối đăng nhập (trong cài đặt hoặc danh sách dự án đám mây) dùng luồng **mã thiết bị**: OfficeVega hiển thị một mã và mở trang đăng nhập trong trình duyệt; khi hoàn tất, ứng dụng tự động tiếp tục.
- Đăng nhập chỉ được dùng cho: danh sách dự án đám mây và các mô hình VEGA lưu trữ tại `api.vega.chat`. Khi không đăng nhập, mọi tính năng cục bộ và mô hình tùy chỉnh vẫn hoạt động bình thường.
- Đăng xuất chỉ cần một cú nhấp trong cài đặt.

## Hỗ trợ

Câu hỏi, ý tưởng và báo lỗi: [officevega.com/feedback](https://officevega.com/feedback), kênh Telegram [t.me/getmyai](https://t.me/getmyai), email [mail@vega.chat](mailto:mail@vega.chat). Nhà phát triển: [getmyai.io](https://getmyai.io) (Dmitry Filippov).

## Tích hợp MCP (dành cho người dùng nâng cao / ứng dụng AI)

**Tích hợp** là bảng nối OfficeVega với một tác nhân lập trình, và bảng này có một bài riêng: Kết nối tác nhân lập trình. Tóm tắt ngắn gọn: chọn một cách kết nối (dòng lệnh hoặc MCP), làm theo mục đó, rồi mở một cuộc trò chuyện mới và đặt câu hỏi.

![Cài đặt ▸ Tích hợp: ba bước, sau đó là các hàng kỹ năng và tùy chọn MCP](img/settings-integrations.png)

Trong mục **Máy chủ HTTP cục bộ**, ứng dụng có thể tự chạy máy chủ này — có công tắc bật và một cổng. Mục **Nâng cao** bổ sung URL kiểm tra tình trạng và tệp nhật ký. Máy chủ chỉ lắng nghe trên localhost.

## Bảng tra cứu nhanh dòng lệnh

| Lệnh                | Tác dụng                     |
| ------------------- | ---------------------------- |
| `officevega <file>` | mở một tệp                   |
| `officevega mcp`    | khởi động máy chủ MCP cục bộ |
| `officevega --help` | mọi lệnh và tùy chọn         |
