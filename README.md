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