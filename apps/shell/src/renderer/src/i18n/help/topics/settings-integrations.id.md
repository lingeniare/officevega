# Pengaturan, bahasa, tema, dan integrasi MCP

## Membuka pengaturan

Baris akun di kiri bawah Beranda membuka panel pengaturan (tertulis Masuk saat Anda belum masuk). Panel ini memiliki enam bagian: Akun, Model AI, Media & Pencarian AI, Umum, Integrasi, dan Tentang.

![Pengaturan ▸ Umum, tempat bahasa, tema, simpan otomatis, dan sakelar statistik penggunaan berada](img/settings-general.png)

Konfigurasi model memiliki bab tersendiri; di **Media & Pencarian AI** Anda menyalakan pembuatan gambar, analisis gambar, analisis video, pencarian web, dan pencarian file lokal untuk setiap penyedia.

## Bahasa

- Pengaturan menawarkan **21 bahasa antarmuka**: Inggris, Mandarin Sederhana, Jepang, Korea, Prancis, Jerman, Spanyol, Thai, Indonesia, Rusia, Arab, Portugis, Italia, Polandia, Ceko, Belanda, Melayu, Ibrani, Hindi, Mandarin Tradisional, Vietnam.
- Peralihan bahasa berlaku seketika dan tersimpan; bilah menu sistem dibangun ulang mengikuti bahasa tersebut.

## Tema

Terang / Gelap / Ikuti Sistem. Mode Ikuti Sistem mengikuti tampilan sistem operasi, dan editor berganti tampilan secara serempak tanpa berkedip. Sakelar yang sama juga mewarnai ulang panel AI dan layar Beranda, sehingga seluruh aplikasi tetap dalam satu desain: pilih Terang untuk ruangan yang terang, Gelap untuk bekerja di malam hari, Ikuti Sistem untuk mengikuti Windows.

## Umum

- **Tanpa analitik pelacakan**: OfficeVega tidak menyertakan Google Analytics atau pelacak pihak ketiga apa pun — isi dokumen, nama file, dan peristiwa penggunaan tidak pernah dikumpulkan atau dikirim ke mana pun.
- **Posisi bilah samping AI** (kiri atau kanan), **ukuran teks panel AI**, dan **Pemeriksaan ejaan di obrolan AI**.
- **Buka panel AI di dokumen baru** — nonaktif: dokumen baru akan dimulai dengan panel terlipat dan cukup satu klik untuk membukanya.
- **Simpan otomatis semua dokumen** menyalakan Simpan Otomatis secara default di setiap editor; Anda tetap dapat mematikannya untuk satu jendela.
- **Lokasi simpan** dengan tombol **Ubah**, dan **Aplikasi default untuk dokumen Office** untuk menjadikan OfficeVega pembuka .docx / .xlsx / .pptx.

## Media & Pencarian AI

Bukan sakelar — setiap kemampuan memilih vendor yang melayaninya, dan kunci serta base URL sebuah vendor cukup dimasukkan sekali lalu dipakai bersama:

- **Pencarian web**, **Pembuatan gambar**, **Analisis gambar**, dan **Analisis video**, masing-masing dengan satu penyedia, satu model, satu kunci, dan satu base URL. Pilih **VEGA** sebagai vendor untuk merutekannya melalui `api.vega.chat` menggunakan kunci masuk Anda.
- **Pencarian berkas lokal** berjalan di mesin ini. Di bawahnya, **reranking pencarian Jev** **nonaktif secara bawaan**. Diaktifkan, kutipan 20 hit lokal teratas — hingga 1.200 karakter per dokumen, plus nama berkas dan folder — pergi ke endpoint keputusan pilihan Anda (VEGA, Jev via OpenRouter atau TypeSafe, Perplexity, Liquid AI d1, Cloudflare, mesin lokal, atau URL kustom) untuk diurutkan ulang menurut relevansi. Nonaktif, tak ada yang meninggalkan perangkat.

## Tentang

- **Versi**, situs proyek [officevega.com](https://officevega.com), dan halaman rilis [officevega.com/releases](https://officevega.com/releases).
- **Kanal Pembaruan**: Stabil atau Beta. Mengubahnya langsung berlaku dan memeriksa pembaruan; kanal ini tidak akan menurunkan instalasi Beta kembali ke Stabil.

## Pengikatan aplikasi default

Pengaturan dapat mendaftarkan OfficeVega sebagai penangan .docx / .xlsx / .pptx / .pdf dan format lainnya (pendaftaran aplikasi default tingkat platform; konfirmasi saat diminta).

## Pemberitahuan pihak ketiga dan pembaruan

- Bantuan ▸ Pemberitahuan pihak ketiga: daftar lengkap lisensi OSS yang disertakan dengan aplikasi.
- Bantuan ▸ Periksa pembaruan: memicu pemeriksaan manual; versi yang lebih baru akan menawarkan pemasangan.

## Masuk VEGA

- Pintu masuk (di pengaturan atau di daftar proyek cloud) menggunakan alur **kode perangkat**: OfficeVega menampilkan sebuah kode dan membuka login di browser; proses akan dilanjutkan otomatis setelah selesai.
- Masuk hanya digunakan untuk: daftar proyek cloud dan model VEGA yang dihosting di `api.vega.chat`. Tanpa masuk, semua fitur lokal dan model kustom tetap berfungsi.
- Keluar cukup dengan satu klik di pengaturan.

## Dukungan

Pertanyaan, ide, dan laporan bug: [officevega.com/feedback](https://officevega.com/feedback), kanal Telegram [t.me/getmyai](https://t.me/getmyai), email [mail@vega.chat](mailto:mail@vega.chat). Pengembang: [getmyai.io](https://getmyai.io) (Dmitry Filippov).

## Integrasi MCP (untuk pengguna lanjutan / klien AI)

**Integrasi** adalah panel yang menghubungkan OfficeVega dengan agen pemrograman, dan panel ini memiliki artikel tersendiri: Menghubungkan agen pemrograman. Versi singkatnya — pilih jalurnya (baris perintah atau MCP), ikuti bagian tersebut, lalu mulai obrolan baru dan ajukan pertanyaan.

![Pengaturan ▸ Integrasi: tiga langkah, lalu baris skill dan opsi MCP](img/settings-integrations.png)

Di bawah **Server HTTP lokal**, aplikasi dapat menjalankan server itu sendiri — sakelar aktif dan port — dan **Lanjutan** menambahkan URL pemeriksaan kesehatan serta berkas log. Server hanya mendengarkan di localhost.

## Lembar pintasan baris perintah

| Perintah           | Fungsinya                |
| ------------------ | ------------------------ |
| `officevega <file>` | membuka sebuah file      |
| `officevega mcp`    | memulai server MCP lokal |
| `officevega --help` | semua perintah dan opsi  |
