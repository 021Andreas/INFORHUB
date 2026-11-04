# Jalankan dari folder INFORHUB (yang berisi folder frontend dan backend):
#   powershell -ExecutionPolicy Bypass -File .\HAPUS-FILE.ps1
# Menghapus halaman milik penyelenggara yang ikut tersimpan di dalam admin.
# Tidak menyentuh folder backend.
$base = "frontend\src\routes\admin"
foreach ($d in @("absensi", "peserta", "sertifikat", "acara\form")) {
  $p = Join-Path $base $d
  if (Test-Path $p) { Remove-Item -Recurse -Force $p; Write-Host "Dihapus: $p" }
  else { Write-Host "Sudah tidak ada: $p" }
}
