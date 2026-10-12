# Mulai cepat: antarmuka dan dasar-dasarnya

OfficeVega adalah rangkaian perkantoran yang berjalan sepenuhnya di komputer Anda: satu jendela, satu deret tab, dengan enam editor — Docs (pengolah kata), Sheets (spreadsheet), Slides (presentasi), PDF, Markdown, dan HTML. File yang dibuka dan disimpan adalah .docx / .xlsx / .pptx / .pdf yang sebenarnya, sepenuhnya kompatibel dengan Word, Excel, dan PowerPoint. Tidak perlu koneksi jaringan.

## Sekilas antarmuka

![Layar Beranda](img/home-screen.png)

Jendela ini terdiri dari tiga bagian:

- **Bilah tab (atas)**: setiap file yang terbuka menjadi satu tab. Tab Beranda di paling kiri selalu ada dan tidak bisa ditutup; tab lainnya adalah dokumen Anda. Klik dua kali sebuah tab untuk mengganti nama file-nya secara langsung.
- **Area konten**: editor (atau Beranda) milik tab yang sedang aktif.
- **Bilah menu**: di bagian atas jendela pada Windows. Menu File/Edit/View berubah menyesuaikan editor yang aktif.

## Membuat dokumen

Gunakan salah satu cara berikut:

- Klik salah satu kartu pembuatan cepat di bagian [Mulai cepat](help://getting-started) pada **Beranda** (AI Docs, AI Sheets, AI Slides, ...).
- Menu **File ▸ Baru**: Docs (ctrl+N), Sheets, Slides, Markdown, HTML, atau PDF.
- Seret file ke jendela, atau klik dua kali di aplikasi pengelola file Anda (jika OfficeVega adalah aplikasi default).

Dokumen baru terbuka tanpa nama; file di disk baru dibuat saat pertama kali disimpan.

## Membuka file

- Menu **File ▸ Buka** (ctrl+O) membuka pemilih file sistem: .docx / .doc / .xlsx / .xls / .csv / .tsv / .pptx / .ppt / .pdf / .md / .html.
- Klik salah satu item di daftar **Terbaru** pada Beranda.
- `officevega <file>` dari terminal juga dapat membuka file.

## Cara kerja penyimpanan

- **Simpan manual**: ctrl+S, atau File ▸ Simpan / Simpan Sebagai. Penyimpanan pertama akan meminta lokasi dan nama file.
- **Simpan otomatis** hanya aktif setelah Anda menyimpan file secara manual setidaknya sekali — PDF yang hanya Anda baca tidak akan pernah ditulis ulang secara diam-diam. Simpan otomatis berjalan tak lama setelah konten berubah.
- Menutup tab yang memiliki perubahan belum disimpan akan meminta Anda memilih Simpan / Buang / Batal terlebih dahulu.
- Setiap penulisan bersifat atomik (berkas sementara + ganti nama), sehingga pemadaman listrik tidak akan meninggalkan berkas yang rusak setengah jadi.

## Pintasan yang sering dipakai

| Tindakan         | Windows   |
| ---------------- | --------- |
| Dokumen baru     | ctrl+N    |
| Buka             | ctrl+O    |
| Simpan           | ctrl+S    |
| Tutup tab        | ctrl+W    |
| Buka panduan ini | F1        |
| Lipat pita       | Ctrl+F1   |

**Ciutkan Pita** berfungsi di setiap editor. Baris tab tetap ada dan pita perintah di bawahnya tersembunyi; tab yang sedang dipilih sekaligus menjadi kendali pencetakan, sehingga selama pita terlipat tidak ada tab yang dipilih dan menekan tab mana pun mengembalikan pita itu. Klik ganda pada tab melakukan hal yang sama. Cara Anda meninggalkannya diingat per editor. Docs menambah kepadatan menengah: **⌥⌘K** / Ctrl+Alt+K memampatkan pita menjadi ikon saja, diingat dengan cara yang sama.

Pintasan di dalam masing-masing editor (penyalin format, cari dan ganti, operasi tabel, ...) dijelaskan di bab masing-masing; Docs juga menyediakan dialog pintasan keyboard yang dapat dicari (**ctrl+/**) yang mencakup seluruh kombinasi tombol miliknya.

<!--
## Pintasan Option+Command

Option+Command adalah lapisan yang disediakan Word untuk lompatan terstruktur, dan OfficeVega mengisinya dengan cara yang sama. Docs memakai sebagian besarnya, Sheets memakai dua miliknya sendiri agar setara dengan Excel, dan satu kombinasi berlaku di mana saja.

**Docs**

| Pintasan (macOS) | Fungsinya               | Windows / Linux    |
| ---------------- | ----------------------- | ------------------ |
| ⌥⌘1 / ⌥⌘2 / ⌥⌘3  | Judul 1 / 2 / 3         | Ctrl+Alt+1 / 2 / 3 |
| ⌥⌘0              | Normal (teks isi)       | Ctrl+Alt+0         |
| ⌥⌘M              | Dialog paragraf         | Ctrl+Alt+M         |
| ⌥⌘A              | Komentar baru           | Ctrl+Alt+A         |
| ⌥⌘F              | Sisipkan catatan kaki   | Ctrl+Alt+F         |
| ⌥⌘E              | Sisipkan catatan akhir  | Ctrl+Alt+D         |
| ⌥⌘G              | Buka lokasi (Go To)     | Ctrl+G             |

Dua di antaranya berbeda di Windows, dengan alasan yang sama seperti ketika Word memisahkannya. **macOS memakai ⌥⌘D** — untuk menampilkan dan menyembunyikan Dock — jadi catatan akhir menggunakan ⌥⌘E di Mac dan Ctrl+Alt+D di tempat lain. Dan **Pergi ke** menghilangkan Alt: Ctrl+G, sedangkan pintasan Mac tetap membawanya.

**Sheets**, saat kisi sedang difokuskan

| Pintasan (macOS) | Fungsinya        | Windows / Linux |
| ---------------- | ---------------- | --------------- |
| ⌥⌘0              | Garis tepi luar  | Ctrl+Shift+7    |
| ⌥⌘−              | Tanpa garis tepi | Ctrl+Shift+−    |

Windows bukan penulisan ulang pasangan Mac. Excel untuk Mac memberi Sheets **keduanya** — ⌘⇧7 dan ⌥⌘0 adalah dua tombol untuk garis tepi luar yang sama — sehingga di Windows perintah ini tetap memakai posisi Ctrl+Shift yang memang sudah dimilikinya, dan lapisan Option tidak ada.

Perhatikan bahwa **⌥⌘0 berarti Normal di Docs dan Garis tepi luar di Sheets**. Keduanya tidak pernah muncul di editor yang sama, jadi tidak ada benturan saat digunakan, tetapi ⌥⌘0 sudah terpakai dan tidak tersedia sebagai pintasan global.

**Setiap editor**: **⌥⌘R / Ctrl+F1** melipat pita, seperti yang dijelaskan di atas.

Dengan demikian ⌥⌘D tetap kosong untuk dipakai OfficeVega di macOS, jika suatu perintah di masa depan membutuhkannya.
-->

## Ke mana selanjutnya

- Lokasi file Anda: [Layar Beranda](help://home-screen).
- Mengelola banyak file yang terbuka: [Tab dan pengelolaan jendela](help://tabs-and-windows).
- Meminta AI mengerjakan tugas: [Panel asisten AI](help://ai-panel).
- Bahasa, tema, aplikasi default: [Pengaturan, bahasa, tema, dan integrasi MCP](help://settings-integrations).

Butuh bantuan? Tanyakan di [officevega.com/feedback](https://officevega.com/feedback), ikuti kabar terbaru di kanal Telegram [t.me/getmyai](https://t.me/getmyai), atau tulis ke [mail@vega.chat](mailto:mail@vega.chat).
