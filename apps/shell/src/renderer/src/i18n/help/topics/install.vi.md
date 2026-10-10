# Cài đặt OfficeVega

Mọi bản dựng đều được công bố trên [trang phát hành](https://officevega.com/releases). Tất cả đều được tạo từ `main`; trình cài đặt cho Windows đã được ký số.

## Chọn tệp phù hợp với máy của bạn

| Nền tảng                             | Yêu cầu                                                | Tệp                        |
| ------------------------------------ | ------------------------------------------------------ | -------------------------- |
| **Windows** — hầu hết PC             | Windows 10+, Intel/AMD                                 | trình cài đặt `-x64.exe`   |
| **Windows** trên Arm                 | Windows 11 trên Arm (Snapdragon X và tương tự)         | trình cài đặt `-arm64.exe` |
<!-- Các nền tảng khác sẽ được bổ sung sau; hiện chỉ hỗ trợ Windows
| **macOS** — Apple Silicon            | macOS 11+                                              | `.dmg` (arm64)             |
| **macOS** — Intel                    | macOS 11+                                              | `.dmg` (x64)               |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 trở lên)             | `.deb`                     |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+)  | `.rpm`                     |
| **Linux** — các bản khác             | x86_64, glibc 2.34+, FUSE 2                            | `.AppImage`                |
-->

Các bản cũ hơn vẫn có trên trang phát hành.

<!--
## Trên macOS

Mở tệp `.dmg` rồi kéo **OfficeVega** vào thư mục Applications. Với bản dựng Intel, lần mở đầu tiên sẽ yêu cầu bạn xác nhận: nhấp chuột phải vào ứng dụng trong Applications ▸ Open. Đó là Gatekeeper phản ứng với một ảnh đĩa trông như chưa được ký, chứ không phải tệp tải về bị hỏng.
-->

## Trên Windows

Chạy trình cài đặt `.exe`. Trình này đưa OfficeVega vào menu Start và đăng ký `.docx`, `.xlsx`, `.pptx`, `.pdf` cùng các định dạng tương tự, để bạn nhấp đúp vào tệp là mở được ngay.

<!--
## Trên Linux

**Debian / Ubuntu**

```sh
sudo apt install ./officevega_<version>_amd64.deb
```

**Fedora / RHEL / openSUSE**

```sh
sudo dnf install ./officevega-<version>.x86_64.rpm     # Họ Fedora / RHEL
sudo zypper install ./officevega-<version>.x86_64.rpm  # openSUSE
```

**AppImage** — chạy ngay tại chỗ, không cần bước cài đặt:

```sh
chmod +x OfficeVega-<version>.AppImage
./OfficeVega-<version>.AppImage
```

Cần có thư viện chạy FUSE 2. Nếu bạn không muốn cài nó, hãy chạy với `--appimage-extract-and-run`; khi đó hộp cát sẽ hoạt động từ thư mục đã giải nén.
-->

## Bản dựng bạn đang dùng

**Cài đặt ▸ Giới thiệu** là nơi ứng dụng cho biết bạn đang dùng bản dựng nào, theo kênh cập nhật nào và dự án được đặt ở đâu. Khi có bản dựng mới hơn được phát hành trên kênh đó, chính bảng này sẽ đề nghị cập nhật.

![Cài đặt ▸ Giới thiệu, hiển thị phiên bản đã cài, kênh cập nhật mà ứng dụng theo dõi và liên kết tới trang dự án](img/install.png)

<!--
## Ba cách khác

Cả ba đều bọc các tệp đã phát hành thay vì dựng lại ứng dụng, nên luôn bám theo các tệp nhị phân chính thức.

- **Flatpak** — cài tệp `.deb` qua cơ chế `extra-data` của Flatpak và chạy dưới Zypak, lớp thích ứng cho hộp cát của chính Electron. Cây thư mục `/app` là chỉ đọc, nên các bản cập nhật đi qua Flatpak chứ không qua hộp thoại cập nhật trong ứng dụng.
- **Nix** — một biểu thức gói mà bạn dựng từ một bản sao mã nguồn bằng `nix-build packaging/nix`; xem `packaging/nix`.
- **Docker** — một ảnh chuyển đổi hàng loạt không có giao diện (`packaging/docker`). Nó chuyển cả một cây tài liệu Office, Markdown và HTML sang PDF qua đúng quy trình xuất của ứng dụng, nên kết quả giống hệt những gì Tệp ▸ Xuất sẽ tạo ra. Đây là công cụ dòng lệnh, không phải máy chủ.
-->

## Dòng lệnh đi kèm sẵn

Mọi bản cài đặt đều có sẵn lệnh `officevega`, lệnh này dùng chung các bộ máy xử lý với cửa sổ, nên hai bên không bao giờ cho ra kết quả khác nhau cho cùng một tệp. Lệnh nằm bên trong gói ứng dụng; chạy `officevega install-cli` sẽ đưa nó vào `PATH` của bạn. Xem **Dòng lệnh và tác nhân** để biết lệnh làm được những gì.

## Hỗ trợ

- Trang web: [officevega.com](https://officevega.com), trang phát hành: [officevega.com/releases](https://officevega.com/releases).
- Trợ giúp và góp ý: [officevega.com/feedback](https://officevega.com/feedback), kênh Telegram: [t.me/getmyai](https://t.me/getmyai).
- Nhà phát triển: [getmyai.io](https://getmyai.io) (Dmitry Filippov), email: [mail@vega.chat](mailto:mail@vega.chat).
