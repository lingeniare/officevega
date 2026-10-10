# Pemasangan OfficeVega

Setiap binaan diterbitkan pada [halaman Releases](https://officevega.com/releases). Semuanya datang daripada `main`; pemasang untuk Windows adalah bertanda tangan.

## Pilih fail untuk mesin anda

| Platform                             | Keperluan                                             | Fail                  |
| ------------------------------------ | ----------------------------------------------------- | --------------------- |
| **Windows** — kebanyakan PC          | Windows 10+, Intel/AMD                                | pemasang `-x64.exe`   |
| **Windows** pada Arm                 | Windows 11 pada Arm (Snapdragon X dan yang serupa)    | pemasang `-arm64.exe` |
<!-- platform lain akan menyusul kemudian; buat masa ini Windows sahaja
| **macOS** — Apple Silicon            | macOS 11+                                             | `.dmg` (arm64)        |
| **macOS** — Intel                    | macOS 11+                                             | `.dmg` (x64)          |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 atau lebih baharu)  | `.deb`                |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | `.rpm`                |
| **Linux** — yang lain                | x86_64, glibc 2.34+, FUSE 2                           | `.AppImage`           |
-->

Versi lama kekal pada halaman Releases.

<!--
## Pada macOS

Buka fail `.dmg` dan seret **OfficeVega** ke dalam Applications. Pada binaan Intel, pelancaran pertama akan meminta anda mengesahkan pembukaannya: klik kanan aplikasi itu dalam Applications ▸ Open. Itu ialah Gatekeeper yang menemui imej cakera yang kelihatan tidak bertanda tangan, bukan muat turun yang rosak.
-->

## Pada Windows

Jalankan pemasang `.exe`. Ia meletakkan OfficeVega dalam menu Start dan mendaftarkan `.docx`, `.xlsx`, `.pptx`, `.pdf` dan yang seumpamanya, supaya klik dua kali pada fail akan membukanya.

<!--
## Pada Linux

**Debian / Ubuntu**

```sh
sudo apt install ./officevega_<version>_amd64.deb
```

**Fedora / RHEL / openSUSE**

```sh
sudo dnf install ./officevega-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./officevega-<version>.x86_64.rpm  # openSUSE
```

**AppImage** — ia berjalan di tempat ia berada, tanpa langkah pemasangan:

```sh
chmod +x OfficeVega-<version>.AppImage
./OfficeVega-<version>.AppImage
```

Ia memerlukan masa larian FUSE 2. Jika anda lebih suka tidak memasangnya, jalankan dengan `--appimage-extract-and-run`, dan sandbox akan berfungsi dari direktori yang diekstrak.
-->

## Binaan yang sedang anda jalankan

**Tetapan ▸ Perihal** ialah tempat aplikasi melaporkan binaan yang anda ada, saluran yang diikutinya dan lokasi projek itu. Apabila binaan yang lebih baharu diterbitkan pada saluran itu, panel yang sama akan menawarkan kemas kini.

![Tetapan ▸ Perihal, menunjukkan versi yang dipasang, saluran kemas kini yang diikuti aplikasi dan pautan laman projek](img/install.png)

<!--
## Tiga laluan lain

Ketiga-tiganya membalut artifak yang diterbitkan dan bukannya membina semula aplikasi, jadi ia mengikut binari rasmi.

- **Flatpak** — memasang `.deb` melalui mekanisme `extra-data` Flatpak dan menjalankannya di bawah Zypak, yang menyesuaikan sandbox Electron itu sendiri. Pokok `/app` adalah baca sahaja, jadi kemas kini berlaku melalui Flatpak dan bukan melalui dialog kemas kini dalam aplikasi.
- **Nix** — ungkapan pakej yang anda bina daripada checkout dengan `nix-build packaging/nix`; lihat `packaging/nix`.
- **Docker** — imej penukaran pukal tanpa antara muka (`packaging/docker`). Ia menukar keseluruhan pepohon dokumen Office, Markdown dan HTML kepada PDF melalui saluran eksport aplikasi itu sendiri, jadi outputnya sama seperti yang dihasilkan oleh Fail ▸ Eksport. Ia utiliti CLI, bukan pelayan.
-->

## Baris arahan disertakan sekali

Setiap pemasangan merangkumi arahan `officevega` yang berkomunikasi dengan enjin yang sama seperti tetingkap, jadi kedua-duanya tidak pernah berbeza pendapat tentang sesuatu fail. Ia berada dalam bundle aplikasi; `officevega install-cli` meletakkannya dalam `PATH` anda. Lihat **Baris arahan dan ejen** untuk maklumat tentang apa yang ia boleh lakukan.

## Sokongan

- Laman web: [officevega.com](https://officevega.com), keluaran: [officevega.com/releases](https://officevega.com/releases).
- Bantuan dan maklum balas: [officevega.com/feedback](https://officevega.com/feedback), saluran Telegram: [t.me/getmyai](https://t.me/getmyai).
- Pembangun: [getmyai.io](https://getmyai.io) (Dmitry Filippov), e-mel: [mail@vega.chat](mailto:mail@vega.chat).
