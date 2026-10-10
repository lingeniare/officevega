# Mula pantas: antara muka dan asas

OfficeVega ialah satu pek pejabat yang berjalan sepenuhnya pada komputer anda: satu tetingkap, satu baris tab, dengan enam editor — Docs (pemprosesan teks), Sheets (hamparan), Slides (persembahan), PDF, Markdown dan HTML. Fail yang digunakan ialah fail .docx / .xlsx / .pptx / .pdf yang sebenar, serasi sepenuhnya dengan Word, Excel dan PowerPoint. Tiada sambungan rangkaian diperlukan.

## Gambaran keseluruhan antara muka

![Skrin Home](img/home-screen.png)

Tetingkap ini mempunyai tiga bahagian:

- **Baris tab (atas)**: setiap fail yang dibuka ialah satu tab. Tab Home di sebelah kiri sentiasa ada dan tidak boleh ditutup; tab lain ialah dokumen anda. Klik dua kali pada tab untuk menamakan semula failnya di tempat itu juga.
- **Kawasan kandungan**: editor (atau Home) yang sepadan dengan tab aktif.
- **Bar menu**: di bahagian atas tetingkap pada Windows. Menu File / Edit / View berubah mengikut editor yang aktif.

## Mencipta dokumen

Pilih mana-mana satu daripada cara berikut:

- Klik pada kad cipta pantas dalam bahagian [Quick start](help://getting-started) pada **Home** (AI Docs, AI Sheets, AI Slides, ...).
- Menu **File ▸ New**: Docs (ctrl+N), Sheets, Slides, Markdown, HTML atau PDF.
- Seret fail ke dalam tetingkap, atau klik dua kali padanya dalam pengurus fail anda (jika OfficeVega ialah aplikasi lalai).

Dokumen baharu dibuka tanpa tajuk; fail pada cakera hanya dicipta semasa simpanan pertama.

## Membuka fail

- Menu **File ▸ Open** (ctrl+O) membuka pemilih sistem: .docx / .doc / .xlsx / .xls / .csv / .tsv / .pptx / .ppt / .pdf / .md / .html.
- Klik mana-mana item dalam senarai **Recent** pada Home.
- `officevega <file>` daripada terminal juga membuka fail.

## Model simpanan

- **Simpan manual**: ctrl+S, atau File ▸ Save / Save As. Semasa simpanan pertama, aplikasi akan bertanya lokasi dan nama.
- **Simpan automatik** hanya diaktifkan selepas anda menyimpan fail secara manual sekurang-kurangnya sekali — PDF yang anda baca sahaja tidak akan ditulis semula secara senyap. Simpan automatik berlaku sejurus selepas kandungan berubah.
- Menutup tab yang mempunyai perubahan belum disimpan akan bertanya dahulu: Save / Discard / Cancel.
- Setiap tulisan adalah atomik (fail sementara + namakan semula), jadi gangguan bekalan elektrik tidak akan meninggalkan fail yang separuh siap.

## Pintasan lazim

| Tindakan              | Windows |
| --------------------- | ------- |
| Dokumen baharu        | ctrl+N  |
| Buka                  | ctrl+O  |
| Simpan                | ctrl+S  |
| Tutup tab             | ctrl+W  |
| Buka manual ini       | F1      |
| Runtuhkan reben       | Ctrl+F1 |

**Meruntuhkan reben** berfungsi dalam setiap editor. Baris tab kekal dan jalur arahan di bawahnya tersembunyi; tab yang dipilih juga berfungsi sebagai kawalan runtuh, jadi selagi reben diruntuhkan tiada tab yang dipilih dan menekan mana-mana tab akan memaparkan semula jalur itu. Klik dua kali pada tab melakukan perkara yang sama. Keadaan terakhir yang anda tinggalkan diingati untuk setiap editor.

Pintasan dalam setiap editor (berus format, cari & ganti, operasi jadual, ...) diterangkan dalam bab masing-masing; Docs turut menyediakan dialog pintasan papan kekunci yang boleh dicari (**ctrl+/**) yang merangkumi semua pintasannya.

<!--
## Pintasan Option+Command

Option+Command ialah lapisan yang Word khaskan untuk lompatan berstruktur, dan OfficeVega mengisinya dengan cara yang sama. Docs mengambil sebahagian besar daripadanya, Sheets mengambil dua pintasan sendiri supaya sepadan dengan Excel, dan satu pintasan berfungsi di mana-mana.

**Docs**

| Pintasan (macOS) | Fungsinya              | Windows / Linux    |
| ---------------- | ---------------------- | ------------------ |
| ⌥⌘1 / ⌥⌘2 / ⌥⌘3  | Tajuk 1 / 2 / 3        | Ctrl+Alt+1 / 2 / 3 |
| ⌥⌘0              | Normal (teks badan)    | Ctrl+Alt+0         |
| ⌥⌘M              | Dialog perenggan       | Ctrl+Alt+M         |
| ⌥⌘A              | Komen baharu           | Ctrl+Alt+A         |
| ⌥⌘F              | Sisipkan nota kaki     | Ctrl+Alt+F         |
| ⌥⌘E              | Sisipkan nota hujung   | Ctrl+Alt+D         |
| ⌥⌘G              | Pergi ke               | Ctrl+G             |

Dua daripada pintasan ini berubah pada Windows, atas sebab yang sama Word memisahkannya. **macOS memiliki ⌥⌘D** — ia memaparkan dan menyembunyikan Dock — jadi nota hujung ialah ⌥⌘E pada Mac dan Ctrl+Alt+D di tempat lain. Dan **Pergi ke** menggugurkan Alt: Ctrl+G, manakala pintasan Mac membawanya bersama.

**Sheets**, semasa grid mempunyai fokus

| Pintasan (macOS) | Fungsinya           | Windows / Linux |
| ---------------- | ------------------- | --------------- |
| ⌥⌘0              | Sempadan luar       | Ctrl+Shift+7    |
| ⌥⌘−              | Tiada sempadan      | Ctrl+Shift+−    |

Windows bukan penulisan semula pasangan Mac. Excel untuk Mac memberikan Sheets **kedua-duanya** — ⌘⇧7 dan ⌥⌘0 ialah dua kekunci untuk sempadan luar yang sama — jadi pada Windows arahan itu mengekalkan slot Ctrl+Shift yang sedia dimilikinya, dan lapisan Option sahaja tiada.

Perhatikan bahawa **⌥⌘0 bermaksud Normal dalam Docs dan Sempadan luar dalam Sheets**. Kedua-duanya tidak pernah muncul dalam editor yang sama, jadi tiada pertembungan semasa digunakan, tetapi ⌥⌘0 sudah diambil dan tidak tersedia sebagai pintasan global.

**Setiap editor**: **⌥⌘R / Ctrl+F1** meruntuhkan reben, seperti yang diterangkan di atas.

Maka ⌥⌘D kekal bebas untuk OfficeVega gunakan pada macOS, sekiranya ada arahan akan datang yang memerlukannya.
-->

## Ke mana selepas ini

- Di mana fail anda disimpan: [Skrin Home](help://home-screen).
- Menguruskan banyak fail yang dibuka: [Tab dan pengurusan tetingkap](help://tabs-and-windows).
- Membiarkan AI melakukan kerja: [Panel pembantu AI](help://ai-panel).
- Bahasa, tema, aplikasi lalai: [Tetapan, bahasa, tema dan integrasi MCP](help://settings-integrations).

Perlukan bantuan? Tanya di [officevega.com/feedback](https://officevega.com/feedback), ikuti berita dalam saluran Telegram [t.me/getmyai](https://t.me/getmyai), atau tulis kepada [mail@vega.chat](mailto:mail@vega.chat).
