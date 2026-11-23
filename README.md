🚀 INFORHUB

Informatika Information Hub

<p align="center">
  <b>✨ One Platform, All Campus Activities ✨</b>
  <br>
  <i>Solusi Digital untuk Informasi dan Pengelolaan Kegiatan Fakultas.</i>
</p>

📌 About INFORHUB

INFORHUB (Informatika Information Hub) adalah aplikasi berbasis digital yang dikembangkan untuk mempermudah mahasiswa dalam mengakses informasi dan melakukan pendaftaran berbagai kegiatan fakultas, mulai dari seminar, workshop, pelatihan, hingga kegiatan lainnya.

Dengan mengusung konsep satu platform untuk berbagai kegiatan, INFORHUB menghadirkan sistem pengelolaan kegiatan yang terintegrasi melalui tiga jenis pengguna:

🎓 Mahasiswa — Mengakses informasi, mendaftar kegiatan, dan mengunduh sertifikat.

🏢 Penyelenggara — Mengelola kegiatan, peserta, kehadiran, dan penerbitan sertifikat.

⚙️ Administrator — Mengelola akun, hak akses, dan template sertifikat.

INFORHUB juga dilengkapi fitur Sertifikat Digital dengan Nomor Unik dan QR Code yang memungkinkan keaslian sertifikat diperiksa secara mudah dan praktis.

<p align="center">
  <b>INFORHUB — Informasi Lebih Mudah, Kegiatan Lebih Terarah! 🚀</b>
</p>

<h1 align="center">BAB I</h1>
<h2 align="center">PENDAHULUAN</h2>



# 1.1 Latar Belakang

<div align="justify">

Kegiatan akademik dan nonakademik merupakan bagian penting dalam pengembangan pengetahuan, keterampilan, dan pengalaman mahasiswa Program Studi Informatika. Berbagai kegiatan, seperti seminar, pelatihan, lokakarya, kuliah tamu, dan kompetisi, memberikan kesempatan kepada mahasiswa untuk memperoleh pengetahuan serta pengalaman di luar kegiatan perkuliahan. Namun, informasi mengenai kegiatan tersebut dapat tersebar melalui berbagai media, seperti grup percakapan, media sosial, poster digital, dan pengumuman dari penyelenggara. Kondisi ini menyebabkan mahasiswa mengalami kesulitan dalam menemukan informasi kegiatan secara lengkap dan mengetahui perubahan informasi yang disampaikan.

Permasalahan juga dapat terjadi dalam proses pendaftaran dan pendataan peserta kegiatan. Penggunaan mekanisme pendaftaran yang berbeda pada setiap kegiatan dapat menyebabkan data mahasiswa tercatat secara terpisah dan menyulitkan penyelenggara dalam mengelola daftar peserta. Selain itu, identitas mahasiswa perlu dibedakan secara tepat agar data pendaftaran, kehadiran, dan riwayat keikutsertaan tidak tertukar antara satu mahasiswa dengan mahasiswa lainnya. Ketidakakuratan dalam pendataan dapat memengaruhi proses administrasi dan penentuan peserta yang berhak memperoleh sertifikat.

Penerbitan sertifikat kegiatan juga memiliki beberapa kendala, terutama dalam hal keseragaman format, pengisian identitas peserta, dan pengelolaan dokumen. Apabila setiap sertifikat dibuat secara terpisah tanpa format yang terstandar, proses pembuatannya dapat membutuhkan waktu lebih lama dan berisiko menimbulkan kesalahan penulisan nama, Nomor Induk Mahasiswa (NIM), atau informasi kegiatan. Pengelolaan sertifikat yang tidak terorganisasi juga dapat menyulitkan peserta ketika ingin mencari kembali dokumen yang telah diterima.

Selain masalah penerbitan, keaslian sertifikat menjadi hal yang perlu diperhatikan. Sertifikat dalam bentuk digital relatif mudah disalin atau dibagikan, sedangkan pemeriksaan keasliannya dapat menjadi sulit apabila tidak tersedia mekanisme verifikasi yang memadai. Pihak yang menerima sertifikat, seperti panitia, institusi, atau pihak lain yang berkepentingan, membutuhkan cara untuk memastikan bahwa sertifikat benar-benar diterbitkan untuk peserta yang bersangkutan dan sesuai dengan kegiatan yang tercantum. Tanpa identitas sertifikat yang unik dan mekanisme pemeriksaan yang jelas, risiko penggunaan sertifikat yang tidak valid dapat meningkat.

Berdasarkan permasalahan tersebut, pengelolaan informasi kegiatan, identitas mahasiswa, data pendaftaran, serta penerbitan dan verifikasi sertifikat merupakan aspek yang perlu mendapatkan perhatian dalam penyelenggaraan kegiatan di lingkungan perguruan tinggi. Permasalahan tersebut menjadi dasar untuk mengidentifikasi kebutuhan pengelolaan kegiatan yang lebih terstruktur, akurat, dan dapat dipertanggungjawabkan.

</div>


## 1.2 Rumusan Masalah

Berdasarkan latar belakang yang telah diuraikan, rumusan masalah dalam pengembangan sistem ini adalah sebagai berikut:

<div align="justify">

1. Bagaimana mengelola informasi kegiatan kampus agar dapat diakses oleh mahasiswa secara terpusat?

2. Bagaimana mengelola pendaftaran, kuota, status pendaftaran, dan riwayat keikutsertaan peserta secara terstruktur?

3. Bagaimana membedakan identitas setiap mahasiswa agar data pendaftaran, kehadiran, dan sertifikat tidak tertukar?

4. Bagaimana mengatur hak akses mahasiswa, penyelenggara, dan administrator sesuai dengan tugas dan kewenangan masing-masing?

5. Bagaimana menyediakan template sertifikat yang seragam untuk penerbitan sertifikat kegiatan?

6. Bagaimana memastikan keaslian sertifikat digital melalui QR Code yang dapat diverifikasi?

</div>

## 1.3 Solusi Digital

<div align="justify">

Solusi digital yang diusulkan adalah **AKSIKAMPUS**, yaitu aplikasi berbasis web dan mobile untuk memusatkan informasi kegiatan kampus, pendaftaran peserta, pengelolaan acara, serta distribusi sertifikat digital. Tiga role utama yang digunakan adalah Mahasiswa/Peserta, Penyelenggara, dan Administrator. Fitur MVP merupakan fitur inti yang diprioritaskan pada versi awal, sedangkan fitur lanjutan dapat dikembangkan setelah kebutuhan utama berjalan.

</div>

### Daftar Fitur Sistem

| ID Fitur | Nama Fitur | Deskripsi | Prioritas | Pengguna |
|---|---|---|---|---|
| F-01 | Registrasi dan Login | Pengguna dapat membuat akun dan masuk ke sistem sesuai hak aksesnya. | MVP | Semua role |
| F-02 | Profil dan Identitas Pengguna | Mahasiswa memiliki NIM unik; penyelenggara memiliki profil organisasi/unit dan status verifikasi. | MVP | Mahasiswa, Penyelenggara |
| F-03 | Beranda dan Daftar Acara | Menampilkan daftar kegiatan kampus yang tersedia. | MVP | Mahasiswa |
| F-04 | Pencarian dan Filter Acara | Memudahkan pencarian kegiatan berdasarkan kata kunci atau kategori. | MVP | Mahasiswa |
| F-05 | Detail Acara | Menampilkan informasi kegiatan, seperti nama, jadwal, lokasi, kuota, dan penyelenggara. | MVP | Mahasiswa |
| F-06 | Pendaftaran Acara | Mahasiswa dapat mendaftarkan diri pada kegiatan yang tersedia. | MVP | Mahasiswa |
| F-07 | Status Pendaftaran | Menampilkan status pendaftaran serta riwayat pendaftaran mahasiswa. | MVP | Mahasiswa |
| F-08 | Notifikasi | Membuat notifikasi dalam aplikasi untuk perubahan jadwal dan status penting. | Lanjutan | Mahasiswa |
| F-09 | Daftar Acara Tersimpan | Mahasiswa dapat menyimpan kegiatan yang ingin dilihat kembali. | Lanjutan | Mahasiswa |
| F-10 | Kalender Kegiatan | Menampilkan jadwal kegiatan dalam bentuk kalender. | Lanjutan | Mahasiswa |
| F-11 | Riwayat Keikutsertaan | Berfokus pada acara yang benar-benar dihadiri berdasarkan presensi. | MVP | Mahasiswa |
| F-12 | Unduh Sertifikat | Sistem membuat PDF dari template dan catatan penerbitan. | MVP | Mahasiswa |
| F-13 | Buat dan Edit Acara | Menambahkan status draf, diajukan, disetujui, ditolak, dan dipublikasikan. | MVP | Penyelenggara |
| F-14 | Kelola Kuota dan Pendaftar | Menambahkan validasi kuota dan status pendaftaran. | MVP | Penyelenggara |
| F-15 | Validasi Kehadiran | QR Code presensi, validasi peserta terdaftar, dan pencegahan presensi ganda. | MVP | Penyelenggara |
| F-16 | Penerbitan Sertifikat Otomatis | Mengubah proses unggah sertifikat menjadi penerbitan sertifikat otomatis berbasis template. | MVP | Penyelenggara |
| F-17 | Rekap dan Ekspor Peserta | Penyelenggara dapat melihat rekap dan mengekspor data peserta. | Lanjutan | Penyelenggara |
| F-18 | Moderasi Acara | Administrator menyetujui atau menolak pengajuan acara. | MVP | Administrator |
| F-19 | Kelola Akun dan Role | Role administrator ditetapkan secara khusus; penyelenggara harus diverifikasi. | MVP | Administrator |
| F-20 | Laporan Aktivitas Platform | Administrator dapat melihat laporan aktivitas platform. | Lanjutan | Administrator |
| F-21 | Integrasi Kalender Eksternal | Mahasiswa dapat mengintegrasikan jadwal kegiatan dengan kalender eksternal. | Lanjutan | Mahasiswa |
| F-22 | Template Sertifikat | Menambahkan versi template dan pengaturan elemen sertifikat. | MVP | Administrator |
| F-23 | Penerbitan Sertifikat | Penyelenggara menerbitkan sertifikat secara massal kepada peserta yang memenuhi syarat. | MVP | Penyelenggara |
| F-24 | Verifikasi QR Code | Halaman publik menampilkan data minimum dan status sertifikat valid atau dicabut. | MVP | Semua role |

### Keterangan Prioritas

- **MVP (Minimum Viable Product):** Fitur inti yang wajib tersedia pada versi awal sistem.
- **Lanjutan:** Fitur tambahan yang dapat dikembangkan setelah fitur utama berjalan dengan baik.

# <div align="center">BAB II</div>
## <div align="center">LANDASAN TEORI</div>

## **2.1 Sistem Informasi**

<div align="justify">

Sistem informasi merupakan susunan komponen yang saling berhubungan untuk mengumpulkan, mengolah, menyimpan, dan menyajikan informasi guna mendukung kegiatan operasional maupun pengambilan keputusan. Komponen tersebut dapat mencakup manusia, prosedur, data, perangkat lunak, dan infrastruktur teknologi. Dalam konteks perguruan tinggi, sistem informasi dapat membantu mengelola informasi akademik maupun kegiatan pendukung yang melibatkan mahasiswa, dosen, unit fakultas, dan organisasi kampus.

AKSIKAMPUS menerapkan konsep sistem informasi dengan menempatkan data kegiatan, penyelenggara, pendaftaran, kehadiran, dan sertifikat dalam alur yang saling terhubung. Data acara yang dimasukkan penyelenggara ditampilkan kepada mahasiswa setelah melalui proses publikasi atau verifikasi sesuai aturan aplikasi. Ketika mahasiswa mendaftar, sistem menyimpan hubungan antara akun dan acara sehingga status pendaftaran serta riwayat keikutsertaan dapat ditampilkan kembali. Apabila peserta memenuhi syarat sertifikat, data tersebut menjadi dasar untuk memberikan akses terhadap sertifikat digital.

Pengelolaan informasi secara terpusat dapat mengurangi kebutuhan mencari pengumuman dari banyak kanal, tetapi keberhasilannya bergantung pada kelengkapan dan ketepatan data yang dimasukkan. Oleh sebab itu, setiap acara perlu memiliki atribut yang jelas, seperti judul, deskripsi, penyelenggara, jadwal, tempat atau tautan daring, kuota, syarat peserta, status publikasi, dan keterangan sertifikat. Sistem juga perlu menyediakan mekanisme pembaruan agar informasi yang berubah tidak terus ditampilkan sebagai informasi lama.

</div>

## **2.2 Aplikasi Berbasis Web dan Mobile**

<div align="justify">

Aplikasi berbasis web adalah aplikasi yang diakses melalui peramban dan umumnya dapat digunakan pada berbagai perangkat tanpa pengguna memasang aplikasi khusus. Pendekatan web sesuai untuk pengelolaan kegiatan karena penyelenggara dapat membuat dan memperbarui acara melalui antarmuka administrasi, sedangkan mahasiswa dapat membuka katalog acara melalui tautan. Aplikasi web juga memudahkan pemeliharaan karena pembaruan sistem dapat diterapkan pada sisi layanan tanpa mengharuskan seluruh pengguna memasang versi baru.

Aplikasi mobile dirancang untuk digunakan melalui perangkat bergerak, seperti telepon pintar. Dalam layanan kegiatan kampus, antarmuka mobile dapat memudahkan mahasiswa memeriksa jadwal, mencari acara, melakukan pendaftaran, melihat status, menerima notifikasi, dan membuka sertifikat saat dibutuhkan. Pengalaman mobile perlu mempertimbangkan ukuran layar, kemudahan navigasi, kecepatan akses, keterbacaan informasi, serta kondisi jaringan yang berbeda-beda.

AKSIKAMPUS dapat dikembangkan dengan layanan backend dan basis data bersama agar informasi yang diakses melalui web dan mobile tetap konsisten. Perancangan lintas platform perlu memperhatikan pembagian hak akses, validasi masukan, keamanan autentikasi, dan penanganan kesalahan. Fitur yang sama tidak harus memiliki tampilan identik di kedua platform, tetapi proses inti dan aturan bisnisnya perlu konsisten. Misalnya, kuota acara tidak boleh terlampaui hanya karena pendaftaran dilakukan melalui perangkat yang berbeda.

</div>

## **2.3 Manajemen Event dan Registrasi Digital**

<div align="justify">

Manajemen event adalah proses merencanakan, memublikasikan, melaksanakan, dan mengevaluasi suatu kegiatan. Dalam lingkungan kampus, kegiatan dapat diselenggarakan oleh unit universitas, fakultas, program studi, dosen, maupun organisasi mahasiswa. Setiap kegiatan memiliki kebutuhan yang dapat berbeda, tetapi umumnya membutuhkan informasi acara, sasaran peserta, jadwal, lokasi, kuota, mekanisme pendaftaran, dan ketentuan keikutsertaan.

Registrasi digital merupakan proses pencatatan calon peserta melalui sistem elektronik. Data pendaftaran yang terstruktur memungkinkan penyelenggara mengetahui jumlah pendaftar, memeriksa kelayakan peserta, mengelola daftar tunggu jika diperlukan, dan menyusun rekap kegiatan. Sistem sebaiknya memvalidasi data wajib, mencegah pendaftaran ganda untuk acara yang sama, serta mengubah status pendaftaran secara jelas, misalnya terdaftar, menunggu persetujuan, dibatalkan, atau selesai mengikuti acara.

Dalam AKSIKAMPUS, alur manajemen acara dimulai dari penyelenggara membuat draf acara, melengkapi informasi, lalu mengajukan publikasi sesuai kebijakan yang berlaku. Setelah acara dipublikasikan, mahasiswa dapat melihat detail dan mendaftar selama pendaftaran dibuka serta kuota tersedia. Penyelenggara dapat memantau pendaftar dan mencatat kehadiran. Jika jadwal atau ketentuan berubah, pembaruan perlu disampaikan melalui halaman acara dan, apabila tersedia, notifikasi kepada pengguna yang terdaftar. Aturan yang jelas membantu mengurangi kebingungan peserta maupun beban administrasi.

</div>

## **2.4 Sertifikat Digital dan Keamanan Data**

<div align="justify">

Sertifikat digital adalah dokumen elektronik yang digunakan untuk menyatakan bahwa seseorang telah mengikuti atau memenuhi persyaratan tertentu dalam suatu kegiatan. Dalam konteks seminar atau pelatihan kampus, sertifikat dapat menjadi bukti partisipasi atau penyelesaian kegiatan sesuai ketentuan penyelenggara. Penerbitan sertifikat perlu didasarkan pada aturan yang diumumkan sebelumnya, misalnya kehadiran minimum, penyelesaian tugas, atau validasi manual oleh panitia. Tidak semua acara harus menyediakan sertifikat; ketersediaannya perlu dinyatakan pada informasi acara.

Distribusi sertifikat melalui aplikasi memungkinkan peserta mengakses dokumen dari halaman riwayat kegiatan tanpa harus mencari kembali tautan yang dibagikan melalui kanal lain. Penyelenggara dapat mengunggah sertifikat yang telah disiapkan atau menggunakan proses penerbitan terstruktur jika fitur tersebut dikembangkan. Setiap sertifikat perlu dikaitkan dengan peserta dan acara yang tepat, sementara akses unduh diberikan hanya kepada pengguna yang berhak. Jika diperlukan, sistem dapat menyediakan kode unik atau mekanisme verifikasi untuk membantu pemeriksaan keaslian dokumen.

</div>

### **Template Sertifikat Digital**

<div align="justify">

Template sertifikat digital merupakan rancangan atau format standar yang digunakan sebagai dasar penerbitan sertifikat bagi peserta kegiatan. Template dapat memuat logo institusi, judul sertifikat, nama lengkap peserta, nama kegiatan, tanggal pelaksanaan, nama penyelenggara, serta bagian tanda tangan atau pengesahan. Penggunaan template yang seragam dapat membantu menjaga konsistensi tampilan sertifikat dari berbagai kegiatan yang diselenggarakan melalui platform.

Dalam aplikasi INFORHUB, template sertifikat direncanakan dapat dikelola oleh Administrator sesuai dengan kebutuhan dan ketentuan institusi. Penyelenggara menggunakan template yang tersedia untuk menerbitkan sertifikat bagi peserta yang telah memenuhi persyaratan kegiatan. Informasi yang dicantumkan pada sertifikat harus sesuai dengan data peserta dan kegiatan yang tersimpan dalam sistem. Dengan demikian, kesalahan penulisan identitas dan ketidaksesuaian informasi sertifikat dapat diminimalkan.

</div>

### **Identitas Mahasiswa dan Sertifikat**

<div align="justify">

Identitas pengguna diperlukan untuk membedakan setiap mahasiswa yang terdaftar dalam sistem. Identitas tersebut dapat menggunakan Nomor Induk Mahasiswa (NIM) sebagai identitas akademik, disertai akun pengguna yang memiliki identitas unik di dalam basis data. Data profil mahasiswa perlu dihubungkan dengan data pendaftaran, kehadiran, riwayat keikutsertaan, dan sertifikat yang diterbitkan. Pengelolaan hubungan data tersebut membantu memastikan bahwa informasi kegiatan dan sertifikat diberikan kepada mahasiswa yang tepat.

Selain identitas mahasiswa, setiap sertifikat perlu memiliki nomor sertifikat unik sebagai pembeda antara satu sertifikat dan sertifikat lainnya. Nomor tersebut dapat digunakan untuk menelusuri catatan penerbitan sertifikat berdasarkan peserta dan kegiatan terkait. Apabila seorang mahasiswa mengikuti beberapa kegiatan, setiap sertifikat yang diterbitkan tetap memiliki nomor yang berbeda. Pemberian identitas unik pada mahasiswa dan sertifikat merupakan dua hal yang berbeda: NIM digunakan untuk membedakan mahasiswa, sedangkan nomor sertifikat digunakan untuk membedakan dokumen sertifikat yang diterbitkan.

</div>

### **Verifikasi Keaslian Sertifikat Menggunakan QR Code**

<div align="justify">

QR Code merupakan kode dua dimensi yang dapat dipindai menggunakan perangkat yang memiliki kamera atau aplikasi pembaca QR. Dalam pengelolaan sertifikat digital, QR Code dapat digunakan untuk memudahkan pemeriksaan keaslian sertifikat. QR Code pada sertifikat diarahkan ke halaman verifikasi yang merujuk pada catatan sertifikat di dalam sistem. Halaman tersebut dapat menampilkan informasi yang diperlukan untuk pemeriksaan, seperti nomor sertifikat, nama peserta, nama kegiatan, tanggal penerbitan, dan status sertifikat.

Pada INFORHUB, proses verifikasi direncanakan dimulai ketika pihak pemeriksa memindai QR Code yang terdapat pada sertifikat. Sistem kemudian mencari catatan sertifikat berdasarkan kode atau alamat verifikasi tersebut. Jika catatan ditemukan dan statusnya valid, halaman verifikasi menampilkan informasi yang sesuai dengan data sertifikat yang tersimpan. Jika catatan tidak ditemukan atau sertifikat telah dicabut, sistem dapat menampilkan status yang menyatakan bahwa sertifikat tidak valid atau tidak lagi berlaku.

Keberadaan QR Code saja tidak secara otomatis membuktikan keaslian sertifikat. Sistem tetap perlu mencocokkan kode dengan data yang tercatat pada basis data. Oleh karena itu, setiap sertifikat perlu memiliki identitas yang unik dan mekanisme pemeriksaan yang sesuai. Informasi yang ditampilkan pada halaman verifikasi juga perlu dibatasi pada data yang diperlukan untuk memastikan keaslian sertifikat, sehingga informasi pribadi peserta tidak dibuka secara berlebihan.

</div>

### **Keamanan Data dan Pengaturan Hak Akses**

<div align="justify">

Keamanan data merupakan bagian penting karena aplikasi mengelola informasi akun, pendaftaran, kehadiran, dan dokumen peserta. Prinsip dasar yang perlu diterapkan meliputi autentikasi pengguna, otorisasi berdasarkan role, validasi masukan, perlindungan kredensial, pembatasan akses berkas, serta pencatatan aktivitas penting. Pengumpulan data juga perlu dibatasi pada kebutuhan layanan dan disertai penjelasan mengenai tujuan penggunaannya.

INFORHUB dirancang memiliki tiga role utama, yaitu Mahasiswa, Penyelenggara, dan Administrator. Mahasiswa dapat mengakses informasi kegiatan, mengelola pendaftaran, melihat riwayat keikutsertaan, dan mengunduh sertifikat miliknya sendiri. Penyelenggara dapat mengelola kegiatan yang menjadi tanggung jawabnya, melihat data peserta terkait, memvalidasi kehadiran, serta menerbitkan sertifikat sesuai ketentuan. Administrator bertugas mengelola akun dan role pengguna, memoderasi kegiatan, serta mengelola template sertifikat dan pengaturan sistem sesuai kewenangannya.

Pembatasan hak akses diperlukan untuk mencegah pengguna melihat atau mengubah data yang tidak menjadi kewenangannya. Penyelenggara hanya perlu mengakses data peserta yang berkaitan dengan kegiatan yang dikelolanya, sedangkan mahasiswa tidak boleh mengakses sertifikat milik mahasiswa lain melalui fitur akun. Pihak yang memeriksa sertifikat dapat menggunakan halaman verifikasi QR Code untuk memastikan status sertifikat tanpa harus memperoleh akses ke seluruh data pribadi peserta. Pengaturan tersebut perlu diterapkan pada sisi sistem, bukan hanya dengan menyembunyikan menu pada tampilan aplikasi.

Dengan menerapkan prinsip keamanan dan pembagian hak akses tersebut, INFORHUB diharapkan dapat mendukung pengelolaan kegiatan kampus mulai dari publikasi, pendaftaran, validasi kehadiran, hingga distribusi dan verifikasi sertifikat digital. Meskipun demikian, kualitas layanan tetap bergantung pada ketepatan data yang dimasukkan, validitas pencatatan kehadiran, kejelasan ketentuan penerbitan sertifikat, dan kedisiplinan penyelenggara dalam memperbarui informasi. Oleh karena itu, rancangan sistem perlu disertai aturan operasional yang disepakati oleh pihak terkait agar pengelolaan kegiatan dan sertifikat berjalan secara terstruktur.

</div>

## **2.5 Analisis Pembagian Role dan Hak Akses Pengguna**

<div align="justify">

Pembagian role atau peran pengguna merupakan bagian penting dalam perancangan sistem INFORHUB. Pembagian ini bertujuan untuk memastikan bahwa setiap pengguna hanya dapat mengakses fitur dan data sesuai dengan tugas serta kewenangannya. Sistem INFORHUB memiliki tiga role utama, yaitu Mahasiswa, Penyelenggara, dan Administrator. Setiap role memiliki tanggung jawab dan hak akses yang berbeda sesuai dengan kebutuhan pengelolaan kegiatan kampus.

</div>

### **1) Role Mahasiswa**

<div align="justify">

Mahasiswa merupakan pengguna yang memanfaatkan INFORHUB untuk memperoleh informasi kegiatan kampus dan mengikuti kegiatan yang tersedia. Mahasiswa dapat melihat daftar dan detail acara, melakukan pencarian kegiatan, mendaftarkan diri, melihat status serta riwayat pendaftaran, dan mengakses sertifikat digital miliknya apabila telah memenuhi persyaratan kegiatan.

Hak akses mahasiswa dibatasi pada data yang berkaitan dengan akun dan keikutsertaannya sendiri. Mahasiswa tidak memiliki kewenangan untuk mengubah informasi kegiatan milik penyelenggara, mengelola akun pengguna lain, atau menerbitkan sertifikat. Pembatasan tersebut bertujuan untuk menjaga kerahasiaan data peserta dan mencegah perubahan informasi oleh pihak yang tidak berwenang.

</div>

### **2) Role Penyelenggara**

<div align="justify">

Penyelenggara merupakan pengguna yang bertanggung jawab dalam pengelolaan kegiatan kampus. Melalui INFORHUB, penyelenggara dapat membuat dan memperbarui informasi kegiatan, mengatur kuota peserta, melihat data pendaftar, memvalidasi kehadiran, serta mengunggah atau menerbitkan sertifikat bagi peserta yang memenuhi ketentuan.

Hak akses penyelenggara dibatasi pada kegiatan yang menjadi tanggung jawabnya. Penyelenggara tidak seharusnya dapat mengubah kegiatan milik penyelenggara lain tanpa kewenangan yang sesuai atau mengelola role seluruh pengguna. Pembatasan ini diperlukan agar pengelolaan kegiatan berjalan secara teratur dan data peserta tetap terlindungi.

</div>

### **3) Role Administrator**

<div align="justify">

Administrator merupakan pengguna yang bertanggung jawab dalam pengelolaan akun, pengaturan hak akses, moderasi kegiatan, serta pengelolaan template sertifikat dan pengaturan sistem sesuai kewenangannya. Administrator berperan menjaga agar penggunaan platform berjalan sesuai aturan yang telah ditetapkan.

Hak akses administrator mencakup pengelolaan akun dan role pengguna serta pemeriksaan kegiatan yang diajukan. Meskipun memiliki kewenangan yang lebih luas, setiap tindakan administrator tetap perlu mengikuti prosedur keamanan dan dapat dicatat untuk mendukung pemantauan aktivitas sistem. Pengelolaan hak akses juga perlu dilakukan secara hati-hati agar tidak terjadi perubahan data yang tidak sesuai dengan kebutuhan operasional.

</div>

### **4) Perbandingan Hak Akses Ketiga Role**

<div align="justify">

Perbedaan hak akses ketiga role pada sistem INFORHUB dapat dirangkum dalam tabel berikut.

</div>

| Fitur atau Kewenangan | Mahasiswa | Penyelenggara | Administrator |
|---|---|---|---|
| Melihat daftar dan detail acara | Ya | Ya | Ya |
| Mendaftar kegiatan | Ya | Tidak sebagai fungsi utama role | Tidak sebagai fungsi utama role |
| Melihat riwayat pendaftaran pribadi | Ya | Tidak sebagai fungsi utama role | Tidak sebagai fungsi utama role |
| Membuat dan mengedit acara | Tidak | Ya, untuk acara yang dikelola | Sesuai kewenangan moderasi |
| Mengelola kuota dan data pendaftaran | Tidak | Ya, untuk acara yang dikelola | Sesuai kewenangan sistem |
| Memvalidasi kehadiran peserta | Tidak | Ya | Tidak sebagai fungsi utama role |
| Menerbitkan sertifikat | Tidak | Ya, sesuai ketentuan | Mengelola template sertifikat |
| Mengunduh sertifikat milik sendiri | Ya | Jika juga memenuhi ketentuan sebagai peserta | Jika juga memenuhi ketentuan sebagai peserta |
| Mengelola akun dan role pengguna | Tidak | Tidak | Ya |
| Memoderasi kegiatan | Tidak | Tidak | Ya |
| Mengelola template sertifikat | Tidak | Menggunakan template yang tersedia | Ya |

<div align="justify">

**Keterangan:** Tabel tersebut merupakan rancangan pembagian hak akses berdasarkan kebutuhan fitur INFORHUB. Implementasi akhir perlu disesuaikan dengan aturan sistem dan fitur yang benar-benar dikembangkan.

</div>

### **5) Penerapan Autentikasi dan Otorisasi**

<div align="justify">

Penerapan pembagian role perlu didukung oleh autentikasi dan otorisasi. Autentikasi digunakan untuk memeriksa identitas pengguna ketika masuk ke sistem, sedangkan otorisasi digunakan untuk menentukan fitur dan data yang boleh diakses oleh pengguna setelah berhasil masuk.

Dalam INFORHUB, sistem perlu memeriksa role pengguna pada setiap permintaan yang membutuhkan hak akses tertentu. Sebagai contoh, mahasiswa tidak boleh mengubah data acara melalui permintaan langsung ke layanan backend, dan penyelenggara tidak boleh mengakses atau mengubah data kegiatan milik penyelenggara lain tanpa izin. Pemeriksaan hak akses harus diterapkan pada sisi backend, bukan hanya dengan menyembunyikan menu pada antarmuka aplikasi.

Dengan pembagian role yang jelas, INFORHUB diharapkan dapat mengurangi risiko akses tidak sah, menjaga kerahasiaan data peserta, serta mendukung pengelolaan kegiatan dan sertifikat digital secara lebih aman dan terstruktur.

</div>

# <div align="center">BAB III</div>
## <div align="center">PERANCANGAN SISTEM</div>