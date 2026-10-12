# Panel asisten AI

Setiap editor dapat memunculkan panel AI: pilih sesuatu, berikan instruksi, dan lihat hasilnya muncul secara bertahap.

## Membuka dan menggunakannya

![Panel AI di Docs](img/ai-panel.png)

- Titik masuknya: **tombol AI** di pita setiap editor, **Tanya AI** di menu konteks, atau Tanya AI pada bilah anotasi.
- Jelaskan tugas dengan bahasa sehari-hari (tulis ulang ini / jadikan kolom ini persentase / tata ulang halaman ini...) lalu tekan Enter.
- Balasan dirender **secara bertahap**; ketika AI membutuhkan alat (membaca dokumen, mengeditnya), AI menjalankannya dan melanjutkan sampai selesai.
- **Berhenti**: hentikan putaran yang sedang berjalan kapan saja.
- **Antrean**: saat balasan sedang mengalir, Enter menaruh pesan Anda ke antrean alih-alih membuangnya — strip di atas kotak masukan menghitungnya; buka untuk menyunting, menghapus, mengurutkan ulang, menjeda, atau mengosongkan. Pesan berikutnya terkirim sendiri saat giliran selesai; Esc tetap menghentikan giliran.

## Apa yang bisa dilakukan

- **Docs**: menulis ulang, memperluas, menerjemahkan, meringkas, menyisipkan tabel dan gambar, menyesuaikan format; setiap giliran menyimpan snapshot lebih dulu.
- **Sheets**: rumus, pengisian data, transformasi massal, format.
- **Slides**: membuat seluruh deck, menyesuaikan tata letak, menulis ulang teks.
- **PDF**: tanya jawab dan ringkasan berdasarkan teks atau halaman yang dipilih.
- **Markdown / HTML**: menulis ulang, mengembangkan, menerjemahkan.
- **Beranda ▸ Ask AI** menjawab dari berkas berbintang Anda dan mengutipnya — panel basis pengetahuan punya bagiannya sendiri di bab Beranda, dan panel AI Docs membawa keterampilan yang sama.

## Pengembalian dan keamanan

- Panel Docs menyimpan **daftar versi**: satu snapshot per giliran, Anda dapat kembali ke salah satunya, dan pengembalian itu sendiri dapat dibatalkan dengan Ctrl+Z. Snapshot tetap ada setelah dokumen dibuka kembali.
- Suntingan AI melewati alur penyuntingan yang sama dengan suntingan manual (dapat dibatalkan, dan tunduk pada proses simpan) — tidak ada yang melewati konfirmasi simpan Anda.

## Menyembunyikan seleksi dari AI

- Di Slides, HTML, dan Markdown sebuah seleksi bisa dijauhkan dari mata model: klik kanan ▸ **Sembunyikan seleksi dari AI**, beri nama penampung, dan model membaca `{{nama}}` sebagai gantinya. (Markdown mengaktifkan item ini dengan sakelar mata-coreng di pitaunya; milik HTML ada di panel sumber.)
- Berkas menyimpan teks asli — menyimpan, mengekspor, dan mencetak tak tersentuh, dan tanda itu bertahan saat dibuka ulang. Item yang sama membatalkan penyembunyian (Markdown punya **Tampilkan seleksi ke AI lagi** tersendiri).
- HTML menyembunyikan isi elemen, nilai atribut, dan literal string di skrip; halaman yang dirender tak pernah berubah.
- Slides juga menyembunyikan gambar, video, dan audio utuh, dan slide berisi konten tersembunyi tak pernah dikirim sebagai tangkapan layar: pemeriksaan tata letak otomatis melewati halaman itu dan memberi tahu.
- Ini hanya untuk AI di dalam aplikasi — CLI, alat MCP, dan ekspor headless membaca berkas langsung dan tetap melihat teksnya.

## Privasi dan anonimisasi

- Instruksi dan isi dokumen yang relevan dikirim ke **layanan model yang Anda konfigurasi** (VEGA yang dihosting atau endpoint kustom, lihat bab berikutnya); tanpa konfigurasi, tidak ada yang dikirim.
- **Anonimisasi (152-FZ)**: sebelum dikirim, aplikasi dapat menyamarkan data pribadi — nama, nomor telepon, email, detail paspor — sehingga model tidak pernah melihatnya. Aktifkan di Pengaturan ▸ AI; bagian yang disamarkan akan dipulihkan ke dalam dokumen Anda secara otomatis.
- **Tanpa analitik pelacakan**: OfficeVega tidak menyertakan Google Analytics atau pelacak pihak ketiga apa pun. Tidak ada sakelar statistik penggunaan karena tidak ada yang perlu dimatikan — isi dokumen dan percakapan tidak pernah keluar dari jalur yang Anda konfigurasi.
- Berkas lokal tidak diunggah ke tempat lain; kunci BYOK disimpan di berkas pengaturan aplikasi pada mesin ini dan hanya dikirim di header permintaan.
