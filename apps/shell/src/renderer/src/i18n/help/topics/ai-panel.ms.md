# Panel pembantu AI

Setiap editor boleh memanggil panel AI. Pilih sesuatu, berikan arahan, dan lihat hasilnya dipaparkan secara berperingkat.

## Membuka dan menggunakannya

![Panel AI dalam Docs](img/ai-panel.png)

- Cara untuk membukanya: butang **AI** pada reben setiap editor, **Tanya AI** dalam menu konteks, atau Tanya AI pada bar anotasi.
- Terangkan tugas dalam bahasa biasa (tulis semula ini / jadikan lajur ini peratusan / susun semula halaman ini...) dan tekan Enter.
- Balasan dipaparkan secara berperingkat. Apabila AI memerlukan alatan (membaca dokumen, mengeditnya), ia akan menjalankannya dan meneruskan sehingga selesai.
- **Berhenti**: hentikan pusingan semasa pada bila-bila masa.

## Apa yang boleh dilakukannya

- **Docs**: menulis semula, mengembangkan, menterjemah dan meringkaskan; memasukkan jadual dan imej; menyesuaikan pemformatan. Setiap pusingan mengambil gambar keadaan terlebih dahulu.
- **Sheets**: formula, mengisi data, transformasi pukal, pemformatan.
- **Slides**: menjana keseluruhan persembahan, melaras susun atur, menulis semula teks.
- **PDF**: soal jawab dan ringkasan berdasarkan teks atau halaman yang dipilih.
- **Markdown / HTML**: menulis semula, mengembangkan, menterjemah.

## Sejarah sembang

- Setiap perbualan disimpan secara automatik dan kekal pada komputer ini — buka panel esok dan teruskan dari tempat anda berhenti.
- Mulakan sembang baharu dengan **New chat**, dan tukar antara sembang lama dalam senarai sejarah di bahagian atas panel.
- Namakan semula sembang untuk mencarinya dengan lebih pantas; padamkannya untuk membuangnya selama-lamanya. Memadam sembang tidak sekali-kali menjejaskan dokumen anda.

## Undur dan keselamatan

- Panel dalam Docs menyimpan **senarai versi**: satu gambar keadaan bagi setiap pusingan. Anda boleh berundur ke mana-mana versi, dan undur itu sendiri boleh dibatalkan dengan Ctrl+Z. Gambar keadaan kekal walaupun dokumen dibuka semula.
- Suntingan AI melalui saluran suntingan yang sama seperti suntingan manual (boleh dibatalkan, dan bergantung pada simpanan) — tiada apa yang memintas pengesahan simpanan anda.

## Privasi dan penyamaran data

- Arahan dan kandungan dokumen yang berkaitan dihantar ke **perkhidmatan model yang anda konfigurasikan** (VEGA yang dihoskan atau titik akhir tersuai, bab seterusnya). Tanpa konfigurasi, tiada apa yang dihantar.
- **Penyamaran (152-FZ)**: sebelum menghantar, aplikasi boleh menyamarkan data peribadi — nama, nombor telefon, e-mel, butiran pasport — supaya model tidak pernah melihatnya. Hidupkannya dalam Tetapan ▸ AI; bahagian yang disamarkan dipulihkan secara automatik ke dalam dokumen anda apabila balasan tiba.
- **Tiada analitik penjejakan**: OfficeVega dihantar tanpa Google Analytics atau mana-mana penjejak pihak ketiga. Tiada suis statistik penggunaan kerana tiada apa yang perlu dimatikan — kandungan dokumen dan sembang tidak pernah keluar daripada laluan yang anda konfigurasikan.
- Fail setempat tidak dimuat naik ke tempat lain; kunci BYOK disimpan dalam fail tetapan aplikasi pada mesin ini dan dihantar hanya dalam pengepala permintaan.
