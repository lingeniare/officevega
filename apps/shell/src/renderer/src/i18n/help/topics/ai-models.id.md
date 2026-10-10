# Model AI dan pengaturan

## Penyedia dan model

Model dan kunci dikonfigurasi di Pengaturan (baris akun di kiri bawah Beranda):

![Jendela Pengaturan](img/settings-general.png)

- **VEGA di server kami**: masuk (alur kode perangkat) lalu langsung pakai — tanpa konfigurasi apa pun. Permintaan dikirim ke `https://api.vega.chat`, sebuah endpoint yang kompatibel dengan OpenRouter, sehingga klien bergaya OpenRouter mana pun dapat diarahkan ke sana.
- **Endpoint kustom (BYOK)**: Pengaturan ▸ AI menerima base URL dan kunci API untuk setiap protokol — yang kompatibel dengan OpenAI, Anthropic, Gemini, DeepSeek, DashScope (qwen), dan lainnya. Kunci disimpan di berkas pengaturan aplikasi pada mesin ini dan hanya dikirim di header permintaan.
- Model yang berbeda dapat dipilih untuk setiap kemampuan: obrolan/pembuatan, pembuatan gambar, analisis gambar.
- **Uji koneksi**: memastikan endpoint dapat dijangkau dan model terlihat sebelum disimpan.
- Base URL boleh memuat path dan query string (gaya gateway); path endpoint akan ditambahkan dengan benar.

## Memilih model

- Pemilih model berada di bagian atas panel AI dan di Pengaturan ▸ Model AI — satu pilihan untuk obrolan, ditambah pilihan terpisah untuk pembuatan gambar dan analisis gambar jika penyedianya mendukungnya.
- Mulailah dengan model VEGA bawaan: model ini cocok untuk sebagian besar tugas perkantoran (menulis ulang, tabel, rumus, ringkasan). Beralih ke model yang lebih besar untuk penalaran yang sulit atau dokumen panjang, dan ke model kecil yang lebih murah untuk draf cepat.
- Percakapan yang sedang berjalan tetap memakai model lama sampai giliran berikutnya; percakapan baru langsung memakai pilihan baru.

## Harga dan penggunaan

- Penagihan VEGA bersifat bayar sesuai pemakaian per model. Daftar harga lengkap ada di [api.vega.chat/aimodels](https://api.vega.chat/aimodels) — periksa harga input/output sebuah model sebelum menjalankan pekerjaan besar.
- Saldo dan pengeluaran saat ini ada di [dasbor VEGA](https://api.vega.chat/dashboard), yang juga dapat dibuka dari baris saldo di menu akun.
- Tanpa masuk, hanya opsi bawaan gratis yang berfungsi; masuk untuk membuka semua model dalam daftar harga.

## Integrasi CLI (semacam Codex)

- Pengaturan menerima path program CLI lokal (direktori home non-ASCII dan awalan ~ berfungsi; ~ diperluas otomatis). Deteksi model akan memeriksa model yang tersedia di CLI tersebut.
- Validasi hanya memeriksa keberadaan berkas — tidak ada pembatasan karakter.

## Kapan perubahan berlaku

- Perubahan model dan endpoint berlaku seketika; percakapan yang sedang berjalan tetap memakai konfigurasi lama sampai giliran berikutnya.
