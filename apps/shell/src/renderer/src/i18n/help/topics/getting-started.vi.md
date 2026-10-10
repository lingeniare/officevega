# Bắt đầu nhanh: giao diện và các thao tác cơ bản

OfficeVega là bộ ứng dụng văn phòng chạy hoàn toàn trên máy tính của bạn: một cửa sổ, một hàng thẻ, chứa sáu trình soạn thảo — Docs (xử lý văn bản), Sheets (bảng tính), Slides (trình chiếu), PDF, Markdown và HTML. Tệp lưu ra là .docx / .xlsx / .pptx / .pdf thật, tương thích đầy đủ với Word, Excel và PowerPoint. Không cần kết nối mạng.

## Tổng quan giao diện

![Màn hình Trang chủ](img/home-screen.png)

Cửa sổ gồm ba phần:

- **Dải thẻ (phía trên)**: mỗi tệp đang mở là một thẻ. Thẻ Trang chủ ở ngoài cùng bên trái luôn có mặt và không thể đóng; các thẻ còn lại là tài liệu của bạn. Nhấp đúp vào một thẻ để đổi tên tệp ngay tại chỗ.
- **Vùng nội dung**: trình soạn thảo (hoặc Trang chủ) thuộc thẻ đang hoạt động.
- **Thanh menu**: nằm trên cùng cửa sổ trên Windows. Các menu Tệp/Chỉnh sửa/Xem thay đổi để khớp với trình soạn thảo đang hoạt động.

## Tạo tài liệu

Dùng một trong các cách sau:

- Nhấp vào một thẻ tạo nhanh trong mục [Bắt đầu nhanh](help://getting-started) của **Trang chủ** (AI Docs, AI Sheets, AI Slides, ...).
- Menu **Tệp ▸ Mới**: Docs (ctrl+N), Sheets, Slides, Markdown, HTML hoặc PDF.
- Kéo một tệp vào cửa sổ, hoặc nhấp đúp vào tệp đó trong trình quản lý tệp (nếu OfficeVega là ứng dụng mặc định).

Tài liệu mới mở ra ở trạng thái chưa đặt tên; tệp trên đĩa chỉ được tạo khi bạn lưu lần đầu.

## Mở tệp

- Menu **Tệp ▸ Mở** (ctrl+O) mở hộp chọn tệp của hệ thống: .docx / .doc / .xlsx / .xls / .csv / .tsv / .pptx / .ppt / .pdf / .md / .html.
- Nhấp vào bất kỳ mục nào trong danh sách **Gần đây** của Trang chủ.
- Chạy `officevega <file>` từ terminal cũng mở được tệp.

## Cách lưu

- **Lưu thủ công**: ctrl+S, hoặc Tệp ▸ Lưu / Lưu thành. Lần lưu đầu tiên sẽ hỏi vị trí và tên tệp.
- **Tự động lưu** chỉ bật sau khi bạn đã lưu thủ công tệp đó ít nhất một lần. Một tệp PDF bạn chỉ đọc sẽ không bao giờ bị ghi đè âm thầm. Tự động lưu chạy ngay sau khi nội dung thay đổi.
- Khi đóng một thẻ có thay đổi chưa lưu, ứng dụng sẽ hỏi Lưu / Bỏ / Hủy trước.
- Mọi thao tác ghi đều diễn ra theo kiểu nguyên tử (ghi vào tệp tạm rồi đổi tên), nên mất điện cũng không để lại tệp bị dở dang.

## Phím tắt thường dùng

| Thao tác            | Windows   |
| ------------------- | --------- |
| Tài liệu mới        | ctrl+N    |
| Mở                  | ctrl+O    |
| Lưu                 | ctrl+S    |
| Đóng thẻ            | ctrl+W    |
| Mở sổ tay này       | F1        |
| Thu gọn Ribbon      | Ctrl+F1   |

**Thu gọn Ribbon** hoạt động trong mọi trình soạn thảo. Hàng thẻ vẫn giữ nguyên, còn dải lệnh bên dưới bị ẩn đi; thẻ đang chọn đồng thời đóng vai trò nút thu gọn, nên khi Ribbon đang thu gọn sẽ không có thẻ nào được chọn, và nhấn vào bất kỳ thẻ nào sẽ hiện lại dải lệnh. Nhấp đúp vào một thẻ cũng cho kết quả tương tự. Trạng thái bạn để lại được ghi nhớ riêng cho từng trình soạn thảo.

Các phím tắt bên trong từng trình soạn thảo (công cụ định dạng, tìm và thay thế, thao tác bảng, ...) nằm trong chương tương ứng. Riêng Docs còn có hộp thoại phím tắt có thể tìm kiếm (**ctrl+/**), liệt kê đầy đủ các tổ hợp phím của Docs.

<!--
## Các phím tắt Option+Command

Option+Command là lớp phím mà Word dành cho các bước nhảy có cấu trúc, và OfficeVega cũng dùng lớp này theo cách tương tự. Docs chiếm phần lớn; Sheets có hai phím riêng để tương thích với Excel; còn một tổ hợp dùng được ở mọi nơi.

**Docs**

| Tổ hợp (macOS)   | Tác dụng                     | Windows / Linux    |
| ---------------- | ---------------------------- | ------------------ |
| ⌥⌘1 / ⌥⌘2 / ⌥⌘3  | Tiêu đề 1 / 2 / 3            | Ctrl+Alt+1 / 2 / 3 |
| ⌥⌘0              | Bình thường                  | Ctrl+Alt+0         |
| ⌥⌘M              | Hộp thoại đoạn văn           | Ctrl+Alt+M         |
| ⌥⌘A              | Nhận xét mới                 | Ctrl+Alt+A         |
| ⌥⌘F              | Chèn chú thích cuối trang    | Ctrl+Alt+F         |
| ⌥⌘E              | Chèn chú thích cuối tài liệu | Ctrl+Alt+D         |
| ⌥⌘G              | Đi tới                       | Ctrl+G             |

Hai trong số đó đổi trên Windows, vì cùng lý do mà Word tách chúng ra. **macOS dành ⌥⌘D** để hiện và ẩn Dock, nên chèn chú thích cuối tài liệu là ⌥⌘E trên Mac và Ctrl+Alt+D ở mọi nơi khác. Còn **Đi tới** thì bỏ Alt: Ctrl+G, trong khi tổ hợp bên Mac vẫn có Alt.

**Sheets**, khi lưới đang có tiêu điểm

| Tổ hợp (macOS) | Tác dụng   | Windows / Linux |
| -------------- | ---------- | --------------- |
| ⌥⌘0            | Viền ngoài | Ctrl+Shift+7    |
| ⌥⌘−            | Không viền | Ctrl+Shift+−    |

Windows không phải là bản viết lại của cặp phím trên Mac. Excel cho Mac cung cấp **cả hai** cho Sheets: ⌘⇧7 và ⌥⌘0 là hai phím cho cùng một kiểu viền ngoài. Vì vậy, trên Windows, lệnh này vẫn giữ vị trí Ctrl+Shift vốn đã có, còn lớp Option thì đơn giản là không tồn tại.

Lưu ý **⌥⌘0 có nghĩa là Bình thường trong Docs và là Viền ngoài trong Sheets**. Hai tổ hợp này không bao giờ xuất hiện trong cùng một trình soạn thảo, nên khi dùng không xảy ra xung đột; nhưng ⌥⌘0 đã bị chiếm và không dùng được làm phím tắt toàn cục.

**Mọi trình soạn thảo**: **⌥⌘R / Ctrl+F1** thu gọn Ribbon, như đã mô tả ở trên.

Nhờ vậy ⌥⌘D vẫn trống để OfficeVega dùng trên macOS, nếu sau này có lệnh nào cần đến nó.
-->

## Nên đọc tiếp ở đâu

- Tệp được lưu ở đâu: [Màn hình Trang chủ](help://home-screen).
- Quản lý nhiều tệp đang mở: [Quản lý thẻ và cửa sổ](help://tabs-and-windows).
- Để AI làm việc giúp bạn: [Bảng điều khiển trợ lý AI](help://ai-panel).
- Ngôn ngữ, chủ đề, ứng dụng mặc định: [Cài đặt, ngôn ngữ, chủ đề và tích hợp MCP](help://settings-integrations).

Cần trợ giúp? Hỏi tại [officevega.com/feedback](https://officevega.com/feedback), theo dõi tin tức trên kênh Telegram [t.me/getmyai](https://t.me/getmyai), hoặc viết thư tới [mail@vega.chat](mailto:mail@vega.chat).
