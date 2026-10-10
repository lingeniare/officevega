# Model AI dan tetapan

## Pembekal dan model

Model dan kunci dikonfigurasikan dalam Tetapan, melalui baris akaun di penjuru kiri bawah pada Home:

![Tetingkap Tetapan](img/settings-general.png)

- **VEGA pada pelayannya**: log masuk (melalui aliran kod peranti) dan gunakan — tanpa sebarang konfigurasi. Permintaan dihantar ke `https://api.vega.chat`, sebuah titik akhir yang serasi dengan OpenRouter, jadi mana-mana klien gaya OpenRouter boleh disambungkan kepadanya.
- **Titik akhir tersuai (BYOK)**: Tetapan ▸ AI menerima URL asas dan kunci API bagi setiap protokol — serasi dengan OpenAI, Anthropic, Gemini, DeepSeek, DashScope (qwen) dan lain-lain. Kunci disimpan dalam fail tetapan aplikasi pada mesin ini dan dihantar hanya dalam pengepala permintaan.
- Anda boleh memilih model yang berbeza bagi setiap keupayaan: sembang/penjanaan, penjanaan imej, dan analisis imej.
- **Ujian sambungan** menyemak sama ada titik akhir boleh dicapai dan model kelihatan sebelum disimpan.
- URL asas boleh mengandungi laluan dan rentetan pertanyaan (gaya gateway); laluan titik akhir ditambah dengan betul.

## Memilih model

- Pemilih model berada di bahagian atas panel AI dan dalam Tetapan ▸ Model AI — satu pilihan untuk sembang, serta pilihan berasingan untuk penjanaan imej dan analisis imej jika pembekal menyokongnya.
- Mulakan dengan model VEGA lalai: ia sesuai untuk kebanyakan tugas pejabat (menulis semula, jadual, formula, ringkasan). Beralih kepada model yang lebih besar untuk penaakulan sukar atau dokumen panjang, dan kepada model yang lebih kecil dan murah untuk draf pantas.
- Perbualan yang sedang berjalan mengekalkan model lama sehingga pusingan seterusnya; sembang baharu menggunakan pilihan baharu serta-merta.

## Harga dan penggunaan

- Bil VEGA ialah bayar-mengikut-guna bagi setiap model. Senarai harga penuh terdapat di [api.vega.chat/aimodels](https://api.vega.chat/aimodels) — semak harga input/output model sebelum melakukan kerja yang besar.
- Baki dan perbelanjaan semasa terdapat di [papan pemuka VEGA](https://api.vega.chat/dashboard), yang juga boleh dibuka dari baris baki dalam menu akaun.
- Tanpa log masuk, hanya pilihan terbina dalam percuma yang berfungsi; log masuk untuk membuka semua model dalam senarai harga.

## Integrasi CLI (kelas Codex)

- Tetapan menerima laluan program CLI tempatan (direktori rumah bukan ASCII dan awalan ~ berfungsi; ~ dikembangkan secara automatik). Kesan model akan menyoal CLI tentang model yang tersedia.
- Pengesahan hanya menyemak kewujudan laluan — tiada sekatan set aksara.

## Bila perubahan berkuat kuasa

- Perubahan pada model dan titik akhir berkuat kuasa serta-merta; perbualan yang sedang berjalan mengekalkan konfigurasi lama sehingga pusingan seterusnya.
