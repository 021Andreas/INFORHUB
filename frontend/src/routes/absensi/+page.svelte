<script lang="ts">
  import { onMount, tick } from "svelte";
  import { goto } from "$app/navigation";
  import { BrowserQRCodeReader } from "@zxing/browser";
  import { api, ApiError } from "#lib/api.js";
  import Icon from "#lib/components/Icon.svelte";

  type User = { id: number; name: string; email: string; role: string };
  type ScannerControls = { stop: () => void };

  let user = $state<User | null>(null);
  let videoElement: HTMLVideoElement;
  let fileInput: HTMLInputElement;
  let scannerControls: ScannerControls | null = null;
  let cameraActive = $state(false);
  let readingImage = $state(false);
  let processing = $state(false);
  let error = $state("");
  let success = $state("");

  onMount(async () => {
    try {
      const result = await api<{ user: User }>("/api/auth/me");
      user = result.user;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        goto("/login?redirect=%2Fabsensi");
      } else {
        error = e instanceof Error ? e.message : "Gagal memeriksa sesi akun.";
      }
    }
    return stopCamera;
  });

  async function startCamera() {
    error = "";
    success = "";

    if (!user) {
      goto("/login?redirect=%2Fabsensi");
      return;
    }

    // Browser hanya mengizinkan akses kamera pada secure context.
    if (!window.isSecureContext) {
      error = "Kamera membutuhkan koneksi aman (HTTPS). Alamat IP lokal yang dibuka melalui HTTP belum dapat mengakses kamera. Buka INFORHUB melalui HTTPS atau localhost untuk pengujian.";
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      error = "Akses kamera tidak tersedia pada browser ini. Perbarui browser atau gunakan Chrome.";
      return;
    }

    try {
      cameraActive = true;
      await tick();
      if (!videoElement) throw new Error("Elemen kamera tidak ditemukan. Muat ulang halaman lalu coba lagi.");

      const reader = new BrowserQRCodeReader();
      scannerControls = await reader.decodeFromVideoDevice(
        undefined,
        videoElement,
        async (result, _decodeError, controls) => {
          if (!scannerControls) scannerControls = controls;
          if (result && !processing) {
            const token = result.getText().trim();
            if (token) {
              controls.stop();
              scannerControls = null;
              cameraActive = false;
              await submitToken(token);
            }
          }
        }
      );
    } catch (e) {
      stopCamera();
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        error = "Izin kamera ditolak. Izinkan akses kamera untuk situs INFORHUB melalui pengaturan browser.";
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        error = "Kamera tidak ditemukan pada perangkat ini.";
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        error = "Kamera sedang digunakan aplikasi lain. Tutup aplikasi kamera atau aplikasi pemindai lain, lalu coba lagi.";
      } else {
        error = e instanceof Error ? e.message : "Tidak dapat membuka kamera.";
      }
    }
  }

  async function handleQrUpload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    error = "";
    success = "";

    if (!user) {
      input.value = "";
      goto("/login?redirect=%2Fabsensi");
      return;
    }

    if (!file.type.startsWith("image/")) {
      error = "Pilih file gambar QR Code, misalnya JPG, PNG, atau WEBP.";
      input.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      error = "Ukuran gambar maksimal 10 MB.";
      input.value = "";
      return;
    }

    readingImage = true;
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Gambar tidak dapat dibuka. Coba gunakan gambar lain."));
        image.src = imageUrl;
      });

      const reader = new BrowserQRCodeReader();
      const result = await reader.decodeFromImageElement(image);
      const token = result.getText().trim();

      if (!token) throw new Error("QR Code tidak berisi data yang dapat dibaca.");

      readingImage = false;
      input.value = "";
      await submitToken(token);
    } catch (e) {
      error = e instanceof Error && e.message
        ? e.message.includes("No MultiFormat Readers") || e.message.includes("NotFoundException")
          ? "QR Code tidak ditemukan. Pastikan seluruh QR terlihat jelas, tidak buram, dan tidak terpotong."
          : e.message
        : "QR Code tidak ditemukan atau gambar tidak terbaca.";
      input.value = "";
    } finally {
      URL.revokeObjectURL(imageUrl);
      readingImage = false;
    }
  }

  async function submitToken(token: string) {
    if (processing) return;
    processing = true;
    error = "";
    try {
      const result = await api<{ ok: boolean; eventTitle: string; checkedAt: string }>(
        "/api/attendance/scan",
        { method: "POST", body: { token } }
      );
      success = `Absensi berhasil untuk "${result.eventTitle}".`;
      stopCamera();
    } catch (e) {
      error = e instanceof Error ? e.message : "QR gagal diproses.";
    } finally {
      processing = false;
    }
  }

  function stopCamera() {
    scannerControls?.stop();
    scannerControls = null;
    cameraActive = false;
  }
</script>

<svelte:head>
  <title>Absensi Peserta | INFORHUB</title>
</svelte:head>

<main class="page">
  <section class="intro">
    <h1>Absensi Acara</h1>
    <p>Arahkan kamera ke QR Code yang ditampilkan admin atau penyelenggara.</p>
  </section>

  {#if user}
    <div class="signed-in">Login sebagai <strong>{user.name}</strong></div>
  {/if}

  {#if error}<div class="message error" role="alert">{error}</div>{/if}
  {#if success}<div class="message success" role="status">{success}<a href="/pendaftaran">Lihat pendaftaran saya →</a></div>{/if}

  <section class="scanner">
    {#if cameraActive}
      <div class="video-wrap">
        <video bind:this={videoElement} autoplay muted playsinline></video>
        <div class="scan-frame" aria-hidden="true"></div>
      </div>
      <p class="camera-hint">Arahkan QR Code ke dalam kotak. QR sesi memiliki masa berlaku terbatas.</p>
      <button class="secondary" onclick={stopCamera}>Matikan kamera</button>
    {:else}
      <div class="camera-icon"><Icon name="qr" size={28}/></div>
      <h2>Siap melakukan check-in?</h2>
      <p>Pastikan kamu sudah terdaftar pada acara dan gunakan QR Code sesi terbaru dari admin.</p>
      <button class="primary" onclick={startCamera} disabled={!user || processing || readingImage}>Aktifkan kamera</button>
    {/if}

    <div class="upload-divider"><span>atau</span></div>
    <input
      bind:this={fileInput}
      class="file-input"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif"
      capture="environment"
      onchange={handleQrUpload}
      disabled={!user || processing || readingImage}
    />
    <button
      class="upload-button"
      type="button"
      onclick={() => fileInput?.click()}
      disabled={!user || processing || readingImage}
    >
      <Icon name="image" size={16}/>
      {readingImage ? "Membaca gambar QR..." : "Upload foto QR Code"}
    </button>
    <p class="upload-hint">Pilih foto atau screenshot QR Code dari galeri/perangkat. Maksimal 10 MB.</p>
  </section>

  <section class="steps">
    <h2>Cara absensi</h2>
    <ol>
      <li>Pastikan kamu sudah mendaftar acara melalui INFORHUB.</li>
      <li>Minta admin menampilkan QR Code sesi absensi.</li>
      <li>Pindai QR menggunakan kamera atau upload foto QR Code.</li>
      <li>Tunggu konfirmasi bahwa kehadiran berhasil dicatat.</li>
    </ol>
  </section>
</main>

<style>
  :global(*){box-sizing:border-box}:global(a){color:inherit;text-decoration:none}
  .page{max-width:900px;margin:auto;padding:0 24px 50px}
  .intro{padding:38px 0 20px}.eyebrow{color:var(--accent-text);font-size:10px;font-weight:800;letter-spacing:1.5px}h1{font-size:30px;margin:10px 0}.intro p{color:var(--muted);font-size:12px}.signed-in{padding:12px 14px;margin-bottom:14px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--muted);font-size:11px}.signed-in strong{color:var(--text)}
  .scanner{display:flex;align-items:center;flex-direction:column;padding:30px 22px;border:1px solid var(--border);border-radius:13px;background:var(--surface-2);text-align:center}.camera-icon{display:grid;place-items:center;width:68px;height:68px;margin-bottom:12px;border-radius:16px;background:var(--accent-soft);color:var(--accent-text);font-size:39px}.scanner h2{font-size:17px;margin:5px 0 8px}.scanner p{max-width:450px;color:var(--muted);font-size:12px;line-height:1.7}.primary,.secondary{margin-top:12px;padding:12px 18px;border:0;border-radius:8px;background:var(--accent);color:white;font-size:12px;font-weight:700;cursor:pointer}.primary:disabled{opacity:.5;cursor:not-allowed}.secondary{background:var(--surface-3);border:1px solid var(--border-strong);color:var(--text)}
  .video-wrap{position:relative;width:min(100%,560px);overflow:hidden;border-radius:12px;background:#000}.video-wrap video{display:block;width:100%;max-height:65vh;object-fit:cover}.scan-frame{position:absolute;inset:18% 18%;border:3px solid var(--accent);border-radius:15px;box-shadow:0 0 0 999px #0004}.camera-hint{margin:15px 0 0}
  .upload-divider{display:flex;align-items:center;gap:12px;width:min(100%,420px);margin:20px 0 4px;color:var(--muted);font-size:11px}.upload-divider::before,.upload-divider::after{content:"";height:1px;flex:1;background:var(--border)}
  .file-input{display:none}.upload-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;padding:11px 16px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface);color:var(--text);font-size:12px;font-weight:700;cursor:pointer}.upload-button:disabled{opacity:.5;cursor:not-allowed}.upload-hint{margin:8px 0 0!important;font-size:11px!important}
  .steps{margin-top:18px;padding:20px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2)}.steps h2{margin:0 0 12px;font-size:14px}.steps ol{padding-left:20px;color:var(--text-2);font-size:12px;line-height:2}
  .message{margin-bottom:14px;padding:13px;border-radius:8px;font-size:12px;line-height:1.6}.message a{display:block;margin-top:5px;text-decoration:underline}.error{background:var(--err-bg);color:var(--err-text)}.success{background:var(--ok-bg);color:var(--ok-text)}
  @media(max-width:650px){.page{padding:0 15px 35px}.intro{padding-top:28px}}
</style>
