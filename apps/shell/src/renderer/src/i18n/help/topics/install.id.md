# Memasang OfficeVega

Setiap build dipublikasikan di [halaman Rilis](https://officevega.com/releases). Semuanya berasal dari `main`; installer untuk Windows sudah ditandatangani.

## Pilih berkas untuk komputer Anda

| Platform                             | Kebutuhan                                             | Berkas                 |
| ------------------------------------ | ----------------------------------------------------- | ---------------------- |
| **Windows** — kebanyakan PC          | Windows 10+, Intel/AMD                                | installer `-x64.exe`   |
| **Windows** di Arm                   | Windows 11 di Arm (Snapdragon X dan sejenisnya)       | installer `-arm64.exe` |
<!-- Platform lain akan hadir nanti; saat ini hanya Windows
| **macOS** — Apple Silicon            | macOS 11+                                             | `.dmg` (arm64)         |
| **macOS** — Intel                    | macOS 11+                                             | `.dmg` (x64)           |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 atau lebih baru)    | `.deb`                 |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | `.rpm`                 |
| **Linux** — lainnya                  | x86_64, glibc 2.34+, FUSE 2                           | `.AppImage`            |
-->

Versi lama tetap tersedia di halaman Rilis.

<!--
## Di macOS

Buka `.dmg` lalu seret **OfficeVega** ke Applications. Pada build Intel, peluncuran pertama akan meminta Anda mengonfirmasi pembukaan: klik kanan aplikasinya di Applications ▸ Open. Itu adalah Gatekeeper yang menemui citra disk yang tampak belum ditandatangani, bukan unduhan yang rusak.
-->

## Di Windows

Jalankan installer `.exe`. Installer akan menempatkan OfficeVega di menu Start dan mendaftarkan `.docx`, `.xlsx`, `.pptx`, `.pdf` serta format lain, sehingga klik ganda pada berkas akan langsung membukanya.

<!--
## Di Linux

**Debian / Ubuntu**

```sh
sudo apt install ./officevega_<version>_amd64.deb
```

**Fedora / RHEL / openSUSE**

```sh
sudo dnf install ./officevega-<version>.x86_64.rpm     # keluarga Fedora / RHEL
sudo zypper install ./officevega-<version>.x86_64.rpm  # openSUSE
```

**AppImage** — berjalan di lokasi mana pun Anda meletakkannya, tanpa langkah instalasi:

```sh
chmod +x OfficeVega-<version>.AppImage
./OfficeVega-<version>.AppImage
```

Ia membutuhkan runtime FUSE 2. Jika Anda tidak ingin memasangnya, jalankan dengan `--appimage-extract-and-run`; sandbox akan tetap berjalan dari direktori hasil ekstraksi.
-->

## Build yang sedang Anda jalankan

**Pengaturan ▸ Tentang** adalah tempat aplikasi menampilkan build yang sedang Anda pakai, kanal pembaruan yang diikutinya, dan tempat proyek ini berada. Saat build yang lebih baru diterbitkan di kanal tersebut, panel yang sama akan menawarkan pembaruan.

![Pengaturan ▸ Tentang, menampilkan versi yang terpasang, kanal pembaruan yang diikuti aplikasi, dan tautan situs proyek](img/install.png)

<!--
## Tiga jalur lainnya

Ketiganya membungkus artefak yang sudah diterbitkan, bukan membangun ulang aplikasinya, sehingga selalu mengikuti biner resmi.

- **Flatpak** — memasang `.deb` melalui mekanisme `extra-data` milik Flatpak dan menjalankannya di bawah Zypak, yang menyesuaikan sandbox bawaan Electron. Direktori `/app` bersifat hanya-baca, sehingga pembaruan dilakukan lewat Flatpak, bukan lewat dialog pembaruan di dalam aplikasi.
- **Nix** — ekspresi paket yang dapat Anda build dari salinan kode sumber dengan `nix-build packaging/nix`; lihat `packaging/nix`.
- **Docker** — citra konversi massal tanpa antarmuka (`packaging/docker`). Ia mengonversi seluruh direktori dokumen Office, Markdown, dan HTML menjadi PDF melalui jalur ekspor aplikasi itu sendiri, sehingga hasilnya sama dengan yang dihasilkan File ▸ Ekspor. Ini adalah utilitas baris perintah, bukan server.
-->

## Perintah baris perintah sudah disertakan

Setiap instalasi menyertakan perintah `officevega` yang menggunakan mesin yang sama dengan jendela aplikasi, sehingga keduanya tidak pernah berbeda hasil untuk sebuah berkas. Perintah ini berada di dalam bundel aplikasi; jalankan `officevega install-cli` untuk menambahkannya ke `PATH` Anda. Lihat **Perintah baris perintah dan agen** untuk mengetahui apa saja yang bisa dilakukannya.

## Dukungan

- Situs web: [officevega.com](https://officevega.com), rilis: [officevega.com/releases](https://officevega.com/releases).
- Bantuan dan masukan: [officevega.com/feedback](https://officevega.com/feedback), kanal Telegram: [t.me/getmyai](https://t.me/getmyai).
- Pengembang: [getmyai.io](https://getmyai.io) (Dmitry Filippov), email: [mail@vega.chat](mailto:mail@vega.chat).
