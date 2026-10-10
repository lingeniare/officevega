# Panel asisten AI

Setiap editor dapat memunculkan panel AI: pilih sesuatu, berikan instruksi, dan lihat hasilnya muncul secara bertahap.

## Membuka dan menggunakannya

![Panel AI di Docs](img/ai-panel.png)

- Titik masuk: **tombol AI** di pita setiap editor, **Tanya AI** di menu konteks, atau Tanya AI di bilah anotasi.
- Jelaskan tugas dengan bahasa sehari-hari (tulis ulang bagian ini / ubah kolom ini menjadi persentase / atur ulang halaman ini...) lalu tekan Enter.
- Balasan ditampilkan **secara bertahap**; ketika AI membutuhkan alat (membaca dokumen, mengeditnya), AI akan menjalankannya dan melanjutkan hingga selesai.
- **Berhenti**: hentikan giliran yang sedang berjalan kapan saja.

## Apa yang bisa dilakukan

- **Docs**: menulis ulang, memperluas, menerjemahkan, meringkas, menyisipkan tabel dan gambar, menyesuaikan format; setiap giliran menyimpan snapshot lebih dulu.
- **Sheets**: rumus, pengisian data, transformasi massal, format.
- **Slides**: membuat seluruh deck, menyesuaikan tata letak, menulis ulang teks.
- **PDF**: tanya jawab dan ringkasan berdasarkan teks atau halaman yang dipilih.
- **Markdown / HTML**: menulis ulang, memperluas, menerjemahkan.

## Riwayat percakapan

- Setiap percakapan disimpan secara otomatis dan tetap berada di komputer ini — buka kembali panel besok dan lanjutkan dari tempat Anda berhenti.
- Mulai percakapan baru dengan **Obrolan baru**; beralih antar percakapan lama lewat daftar riwayat di bagian atas panel.
- Ganti nama percakapan agar lebih mudah ditemukan; hapus untuk menghilangkannya secara permanen. Menghapus percakapan tidak pernah mengubah dokumen Anda.

## Pengembalian dan keamanan

- Panel Docs menyimpan **daftar versi**: satu snapshot per giliran, Anda dapat kembali ke salah satunya, dan pengembalian itu sendiri dapat dibatalkan dengan Ctrl+Z. Snapshot tetap ada setelah dokumen dibuka kembali.
- Suntingan AI melewati alur penyuntingan yang sama dengan suntingan manual (dapat dibatalkan, dan tunduk pada proses simpan) — tidak ada yang melewati konfirmasi simpan Anda.

## Privasi dan anonimisasi

- Instruksi dan isi dokumen yang relevan dikirim ke **layanan model yang Anda konfigurasi** (VEGA yang dihosting atau endpoint kustom, lihat bab berikutnya); tanpa konfigurasi, tidak ada yang dikirim.
- **Anonimisasi (152-FZ)**: sebelum dikirim, aplikasi dapat menyamarkan data pribadi — nama, nomor telepon, email, detail paspor — sehingga model tidak pernah melihatnya. Aktifkan di Pengaturan ▸ AI; bagian yang disamarkan akan dipulihkan ke dalam dokumen Anda secara otomatis.
- **Tanpa analitik pelacakan**: OfficeVega tidak menyertakan Google Analytics atau pelacak pihak ketiga apa pun. Tidak ada sakelar statistik penggunaan karena tidak ada yang perlu dimatikan — isi dokumen dan percakapan tidak pernah keluar dari jalur yang Anda konfigurasi.
- Berkas lokal tidak diunggah ke tempat lain; kunci BYOK disimpan di berkas pengaturan aplikasi pada mesin ini dan hanya dikirim di header permintaan.
