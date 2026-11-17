<script lang="ts">
  import { onMount, tick } from "svelte";
  import { BrowserQRCodeReader } from "@zxing/browser";
  import { api, ApiError } from "#lib/api.js";
  import Icon from "#lib/components/Icon.svelte";

  type ScannerControls = { stop: () => void };
  type Verification = {
    valid: boolean;
    status: "valid" | "revoked";
    certificateNumber: string;
    participantName: string;
    eventTitle: string;
    eventStartAt: string | null;
    eventEndAt: string | null;
    issuedAt: string;
    revokedAt: string | null;
  };

  let videoElement: HTMLVideoElement;
  let fileInput: HTMLInputElement;
  let scannerControls: ScannerControls | null = null;
  let cameraActive = $state(false);
  let readingImage = $state(false);
  let verifying = $state(false);
  let error = $state("");
  let result = $state<Verification | null>(null);
  let notFound = $state(false);

  onMount(() => stopCamera);

  function extractCode(raw: string): string {
    const value = raw.trim();
    // QR dapat berisi URL verifikasi penuh atau kode acak 32 karakter.
    if (/^[a-f0-9]{32}$/i.test(value)) return value.toLowerCase();
    try {
      const url = new URL(value);
      const segments = url.pathname.split("/").filter(Boolean);
      const candidate = segments.at(-1) ?? "";
      if (/^[a-f0-9]{32}$/i.test(candidate)) return candidate.toLowerCase();
    } catch {
      // Bukan URL; ditangani sebagai QR tidak dikenal.
    }
    throw new Error("QR Code tidak berisi tautan atau kode verifikasi sertifikat INFORHUB yang dikenali.");
  }

  async function verifyQr(raw: string) {
    if (verifying) return;
    verifying = true;
    error = "";
    result = null;
    notFound = false;
    try {
      const code = extractCode(raw);
      result = await api<Verification>(`/api/verify/${encodeURIComponent(code)}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        notFound = true;
      } else {
        error = e instanceof Error ? e.message : "Gagal memverifikasi sertifikat.";
      }
    } finally {
      verifying = false;
    }
  }

  async function startCamera() {
    error = "";
    result = null;
    notFound = false;
    if (!window.isSecureContext) {
      error = "Kamera membutuhkan HTTPS atau localhost. Kamu tetap bisa menggunakan fitur upload foto QR.";
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      error = "Akses kamera tidak tersedia pada browser ini. Gunakan upload foto QR.";
      return;
    }
    try {
      cameraActive = true;
      await tick();
      if (!videoElement) throw new Error("Elemen kamera tidak ditemukan. Muat ulang halaman.");
      const reader = new BrowserQRCodeReader();
      scannerControls = await reader.decodeFromVideoDevice(undefined, videoElement, async (decoded, _err, controls) => {
        if (decoded && !verifying) {
          const raw = decoded.getText().trim();
          controls.stop();
          scannerControls = null;
          cameraActive = false;
          await verifyQr(raw);
        }
      });
    } catch (e) {
      stopCamera();
      error = e instanceof Error ? e.message : "Tidak dapat membuka kamera.";
    }
  }

  async function handleQrUpload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    error = "";
    result = null;
    notFound = false;
    if (!file.type.startsWith("image/")) {
      error = "Pilih gambar QR dalam format JPG, PNG, atau WEBP.";
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
        image.onerror = () => reject(new Error("Gambar tidak dapat dibuka."));
        image.src = imageUrl;
      });
      const reader = new BrowserQRCodeReader();
      const decoded = await reader.decodeFromImageElement(image);
      input.value = "";
      await verifyQr(decoded.getText());
    } catch (e) {
      error = e instanceof Error && (e.message.includes("NotFoundException") || e.message.includes("No MultiFormat Readers"))
        ? "QR Code tidak ditemukan. Pastikan QR terlihat utuh, jelas, dan tidak buram."
        : e instanceof Error ? e.message : "Gambar QR tidak dapat dibaca.";
      input.value = "";
    } finally {
      URL.revokeObjectURL(imageUrl);
      readingImage = false;
    }
  }

  function stopCamera() {
    scannerControls?.stop();
    scannerControls = null;
    cameraActive = false;
  }

  function dateLabel(value?: string | null) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(date);
  }

  function resetScan() {
    result = null;
    error = "";
    notFound = false;
    stopCamera();
  }
</script>

<svelte:head>
  <title>Verifikasi Sertifikat | INFORHUB</title>
  <meta name="description" content="Pindai QR Code untuk memeriksa keaslian sertifikat INFORHUB." />
</svelte:head>

<main class="page">
  <section class="intro">
    <span class="eyebrow">LAYANAN PUBLIK INFORHUB</span>
    <h1>Verifikasi Sertifikat</h1>
    <p>Pindai QR Code yang tercetak pada sertifikat untuk memastikan sertifikat tercatat dan diterbitkan melalui INFORHUB.</p>
  </section>

  {#if error}
    <div class="message error" role="alert"><Icon name="alert-circle" size={17}/><span>{error}</span></div>
  {/if}

  {#if !result && !notFound}
    <section class="scanner-card">
      {#if cameraActive}
        <div class="video-wrap">
          <video bind:this={videoElement} autoplay muted playsinline></video>
          <div class="scan-frame" aria-hidden="true"></div>
        </div>
        <p class="camera-hint">Arahkan QR Code ke dalam kotak pemindaian.</p>
        <button class="secondary" onclick={stopCamera}>Matikan kamera</button>
      {:else}
        <div class="camera-icon"><Icon name="qr" size={30}/></div>
        <h2>Pindai QR Sertifikat</h2>
        <p>Gunakan kamera perangkat atau unggah foto QR Code dari galeri maupun komputer.</p>
        <button class="primary" onclick={startCamera} disabled={verifying || readingImage}>
          <Icon name="camera" size={16}/> Mulai Scan Kamera
        </button>
      {/if}

      <div class="divider"><span>atau</span></div>
      <input bind:this={fileInput} class="file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onchange={handleQrUpload} disabled={verifying || readingImage}/>
      <button class="upload" type="button" onclick={() => fileInput?.click()} disabled={verifying || readingImage}>
        <Icon name="image-plus" size={17}/>
        {readingImage ? "Membaca gambar QR..." : "Upload Foto QR Code"}
      </button>
      <p class="hint">Pilih foto atau screenshot sertifikat yang menampilkan QR Code. Maksimal 10 MB.</p>
      {#if verifying}<div class="checking"><span class="spinner"></span>Memeriksa data sertifikat ke INFORHUB...</div>{/if}
    </section>
  {/if}

  {#if result}
    <section class:valid={result.status === "valid"} class:revoked={result.status === "revoked"} class="result-card" aria-live="polite">
      <div class="status-icon"><Icon name={result.status === "valid" ? "shield-check" : "shield-x"} size={34}/></div>
      <span class="status-label">{result.status === "valid" ? "SERTIFIKAT ASLI" : "SERTIFIKAT DICABUT"}</span>
      <h2>{result.status === "valid" ? "Sertifikat terverifikasi" : "Sertifikat tidak lagi berlaku"}</h2>
      <p class="description">{result.status === "valid" ? "Sertifikat ini tercatat di sistem INFORHUB dan berstatus aktif." : "Data sertifikat ditemukan, tetapi status keabsahannya telah dicabut."}</p>
      <div class="details">
        <div><span>Nama penerima</span><strong>{result.participantName}</strong></div>
        <div><span>Nama kegiatan</span><strong>{result.eventTitle}</strong></div>
        <div><span>Nomor sertifikat</span><strong>{result.certificateNumber}</strong></div>
        <div><span>Tanggal kegiatan</span><strong>{dateLabel(result.eventStartAt)}{result.eventEndAt && result.eventEndAt !== result.eventStartAt ? ` – ${dateLabel(result.eventEndAt)}` : ""}</strong></div>
        <div><span>Tanggal diterbitkan</span><strong>{dateLabel(result.issuedAt)}</strong></div>
        {#if result.status === "revoked"}<div><span>Tanggal dicabut</span><strong>{dateLabel(result.revokedAt)}</strong></div>{/if}
        <div><span>Penerbit</span><strong>INFORHUB · Program Studi Informatika</strong></div>
      </div>
      <button class="again" onclick={resetScan}><Icon name="scan-qr-code" size={16}/> Verifikasi sertifikat lain</button>
    </section>
  {:else if notFound}
    <section class="result-card not-found" aria-live="polite">
      <div class="status-icon"><Icon name="shield-alert" size={34}/></div>
      <span class="status-label">SERTIFIKAT TIDAK DITEMUKAN</span>
      <h2>Keaslian tidak dapat diverifikasi</h2>
      <p class="description">Kode pada QR tidak terdaftar sebagai sertifikat INFORHUB. Pastikan QR Code berasal dari sertifikat yang benar.</p>
      <button class="again" onclick={resetScan}><Icon name="refresh-cw" size={16}/> Coba scan lagi</button>
    </section>
  {/if}

  <aside class="notice"><Icon name="info" size={18}/><p>Hasil verifikasi diambil langsung dari data server INFORHUB. Gambar QR saja tidak menjadi bukti keaslian tanpa kecocokan data pada server.</p></aside>
</main>

<style>
  :global(*){box-sizing:border-box}
  .page{max-width:900px;margin:0 auto;padding:0 24px 48px}
  .intro{padding:34px 0 22px}.eyebrow{color:var(--accent-text);font-size:10px;font-weight:800;letter-spacing:1.4px}
  h1{font-size:29px;letter-spacing:-.6px;margin:9px 0}.intro p{max-width:650px;color:var(--muted);font-size:12px;line-height:1.7}
  .scanner-card,.result-card{display:flex;align-items:center;flex-direction:column;padding:30px 22px;border:1px solid var(--border);border-radius:13px;background:var(--surface-2);text-align:center}
  .camera-icon{display:grid;place-items:center;width:68px;height:68px;margin-bottom:12px;border-radius:16px;background:var(--accent-soft);color:var(--accent-text)}
  .scanner-card h2,.result-card h2{font-size:18px;margin:5px 0 8px}.scanner-card>p,.description{max-width:500px;color:var(--muted);font-size:12px;line-height:1.7}
  .primary,.secondary,.upload,.again{display:inline-flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;padding:11px 17px;border:0;border-radius:8px;background:var(--accent);color:white;font-size:12px;font-weight:700;cursor:pointer}
  .secondary{background:var(--surface-3);border:1px solid var(--border-strong);color:var(--text)}
  .upload{background:var(--surface);border:1px solid var(--border-strong);color:var(--text)}button:disabled{opacity:.55;cursor:not-allowed}
  .divider{display:flex;align-items:center;gap:12px;width:min(100%,420px);margin:20px 0 4px;color:var(--muted);font-size:11px}.divider:before,.divider:after{content:"";height:1px;flex:1;background:var(--border)}
  .file-input{display:none}.hint{margin:8px 0 0;font-size:10px!important}.video-wrap{position:relative;width:min(100%,560px);overflow:hidden;border-radius:12px;background:#000}.video-wrap video{display:block;width:100%;max-height:60vh;object-fit:cover}.scan-frame{position:absolute;inset:18%;border:3px solid #60a5fa;border-radius:14px;box-shadow:0 0 0 999px #0004}.camera-hint{margin:12px 0 0}
  .checking{display:flex;align-items:center;gap:9px;margin-top:17px;color:var(--muted);font-size:11px}.spinner{width:16px;height:16px;border:2px solid var(--border-strong);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  .message{display:flex;gap:9px;align-items:flex-start;padding:12px 14px;border-radius:8px;font-size:12px;line-height:1.6}.error{background:var(--err-bg);color:var(--err-text)}
  .result-card{align-items:flex-start;text-align:left;padding:26px}.status-icon{display:grid;place-items:center;width:60px;height:60px;border-radius:15px;margin-bottom:14px;background:#e8f7ee;color:#15803d}.revoked .status-icon,.not-found .status-icon{background:#fff0ef;color:#c62828}.status-label{font-size:10px;font-weight:850;letter-spacing:1.1px;color:#15803d}.revoked .status-label,.not-found .status-label{color:#c62828}.result-card h2{font-size:22px}.result-card .description{margin:0}
  .details{display:grid;grid-template-columns:1fr 1fr;gap:0 24px;width:100%;margin-top:22px;border-top:1px solid var(--border)}.details>div{padding:13px 0;border-bottom:1px solid var(--border)}.details span,.details strong{display:block}.details span{margin-bottom:5px;color:var(--muted);font-size:10px}.details strong{font-size:12px;line-height:1.5;overflow-wrap:anywhere}.again{margin-top:22px}
  .notice{display:flex;gap:10px;align-items:flex-start;margin-top:16px;padding:13px 15px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--muted)}.notice p{margin:0;font-size:10px;line-height:1.65}
  @media(max-width:600px){.page{padding:0 14px 35px}.intro{padding-top:26px}.scanner-card{padding:25px 15px}.details{grid-template-columns:1fr}.result-card{padding:21px 16px}}
</style>
