# Tetapan, bahasa, tema dan integrasi MCP

## Membuka tetapan

Baris akaun di penjuru kiri bawah pada Home membuka panel tetapan. Ia memaparkan Sign in apabila anda belum log masuk. Panel ini mempunyai enam bahagian: Account, AI Model, AI Media & Search, General, Integrations dan About.

![Tetapan ▸ General, tempat bahasa, tema, AutoSave dan suis statistik penggunaan berada](img/settings-general.png)

Konfigurasi model mempunyai babnya sendiri; dalam **AI Media & Search** anda menghidupkan penjanaan imej, analisis imej, analisis video, carian web dan carian fail setempat bagi setiap pembekal.

## Bahasa

- Tetapan menawarkan **21 bahasa antara muka**: Inggeris, Cina ringkas, Jepun, Korea, Perancis, Jerman, Sepanyol, Thai, Indonesia, Rusia, Arab, Portugis, Itali, Poland, Czech, Belanda, Melayu, Ibrani, Hindi, Cina tradisional dan Vietnam.
- Pertukaran berkuat kuasa serta-merta dan kekal; bar menu asal dibina semula dalam bahasa baharu.

## Tema

Cerah / Gelap / Ikut sistem. Pilihan Ikut sistem mengikut rupa sistem pengendalian, dan editor bertukar mengikutnya tanpa berkelip. Suis yang sama juga menukar warna panel AI dan skrin Home, supaya seluruh aplikasi kekal dalam satu reka bentuk: pilih Cerah untuk bilik yang terang, Gelap untuk kerja malam, dan Ikut sistem untuk mengikut Windows.

## Umum

- **Tiada analitik penjejakan**: OfficeVega dihantar tanpa Google Analytics atau mana-mana penjejak pihak ketiga — kandungan dokumen, nama fail dan peristiwa penggunaan tidak pernah dikumpulkan atau dihantar ke mana-mana.
- **Kedudukan bar sisi AI** (kiri atau kanan), **Saiz teks panel AI**, dan **Semakan ejaan dalam sembang AI**.
- **Buka panel AI dalam dokumen baharu** — dimatikan: dokumen baharu bermula dengan panel tertutup, sekali klik sahaja.
- **Simpan automatik semua dokumen** mendayakan AutoSave secara lalai dalam setiap editor; anda masih boleh mematikannya untuk satu tetingkap.
- **Lokasi simpanan** dengan butang **Change**, dan **Default app for Office documents** untuk menjadikan OfficeVega pengendali fail .docx / .xlsx / .pptx.

## AI Media & Search

Ini bukan suis — setiap keupayaan memilih pembekal yang menyediakannya, dan kunci serta URL asas pembekal dimasukkan sekali sahaja lalu dikongsi:

- **Web search**, **Image generation**, **Image analysis** dan **Video analysis**, setiap satu dengan pembekal, model, kunci dan URL asas. Pilih **VEGA** sebagai pembekal untuk menghalakannya melalui `api.vega.chat` menggunakan kunci log masuk anda.
- **Local file search** berjalan pada mesin ini. Di bawahnya terdapat **Jev search reranking**, yang **dimatikan secara lalai**. Apabila dihidupkan, petikan daripada 20 hasil setempat teratas — sehingga 1,200 aksara daripada setiap dokumen, berserta nama fail dan folder — dihantar ke model Jev oleh TypeSafe untuk disusun semula mengikut kaitan. Apabila dimatikan, tiada apa yang meninggalkan peranti.

## Perihal

- **Version**, laman projek [officevega.com](https://officevega.com) dan halaman keluaran [officevega.com/releases](https://officevega.com/releases).
- **Update Channel**: Stable atau Beta. Menukarnya berkuat kuasa serta-merta dan menyemak kemas kini; ia tidak akan menurunkan pemasangan Beta kembali ke Stable.

## Penetapan sebagai aplikasi lalai

Tetapan boleh mendaftarkan OfficeVega sebagai pengendali fail .docx / .xlsx / .pptx / .pdf dan yang serupa (pendaftaran aplikasi lalai pada peringkat sistem; sahkan apabila diminta).

## Notis perisian pihak ketiga dan kemas kini

- Bantuan ▸ Third-party notices: senarai penuh lesen perisian sumber terbuka yang disertakan dengan aplikasi.
- Bantuan ▸ Check for updates: memulakan semakan manual; versi yang lebih baharu akan meminta anda memasangnya.

## Log masuk ke VEGA

- Pintu log masuk (dalam tetapan atau senarai projek awan) menggunakan aliran **kod peranti**: OfficeVega memaparkan kod dan membuka halaman log masuk dalam pelayar; ia akan meneruskan secara automatik selepas selesai.
- Log masuk hanya digunakan untuk senarai projek awan dan model VEGA yang dihoskan di `api.vega.chat`. Tanpa log masuk, semua fungsi setempat dan model tersuai terus berfungsi.
- Log keluar ialah satu klik dalam tetapan.

## Sokongan

Soalan, idea dan laporan pepijat: [officevega.com/feedback](https://officevega.com/feedback), saluran Telegram [t.me/getmyai](https://t.me/getmyai), e-mel [mail@vega.chat](mailto:mail@vega.chat). Pembangun: [getmyai.io](https://getmyai.io) (Dmitry Filippov).

## Integrasi MCP (untuk pengguna mahir / klien AI)

**Integrations** ialah panel yang menyambungkan OfficeVega kepada ejen pengekodan, dan ia mempunyai artikelnya sendiri: Menyambungkan ejen pengekodan. Ringkasnya — pilih laluan (baris arahan, atau MCP), ikuti bahagian itu, kemudian mulakan sembang baharu dan bertanya.

![Tetapan ▸ Integrations: tiga langkah, kemudian baris kemahiran dan pilihan MCP](img/settings-integrations.png)

Di bawah **Local HTTP server**, aplikasi boleh menjalankan pelayan itu sendiri — suis dayakan dan port — dan **Advanced** menambah URL semakan kesihatan serta fail log, bukannya membiarkannya kepada pembantu. Ia hanya mendengar pada localhost.

## Ringkasan baris arahan

| Arahan             | Fungsinya                             |
| ------------------ | ------------------------------------- |
| `officevega <file>` | membuka fail                         |
| `officevega mcp`    | memulakan pelayan MCP setempat       |
| `officevega --help` | memaparkan semua arahan dan pilihan  |
