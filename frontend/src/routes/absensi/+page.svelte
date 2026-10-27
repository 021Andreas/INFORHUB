<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { api, ApiError } from "#lib/api.js";
  import Icon from "#lib/components/Icon.svelte";

  type User = { id: number; name: string; email: string; role: string };
  type BarcodeDetectorLike = {
    detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
  };
  type BarcodeDetectorConstructor = new (options?: { formats: string[] }) => BarcodeDetectorLike;

  let user = $state<User | null>(null);
  let videoElement: HTMLVideoElement;
  let stream: MediaStream | null = null;
  let detector: BarcodeDetectorLike | null = null;
  let scanTimer: ReturnType<typeof setInterval> | null = null;
  let cameraActive = $state(false);
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

    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (!Detector) {
      error = "Browser ini belum mendukung pemindaian QR bawaan. Coba Chrome terbaru di Android.";
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      error = "Kamera tidak tersedia. Buka situs melalui HTTPS atau localhost.";
      return;
    }

    try {
      detector = new Detector({ formats: ["qr_code"] });
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      cameraActive = true;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (videoElement) {
        videoElement.srcObject = stream;
        await videoElement.play();
      }
      scanTimer = setInterval(scanFrame, 500);
    } catch (e) {
      stopCamera();
      error = e instanceof Error ? e.message : "Tidak dapat membuka kamera.";
    }
  }

  async function scanFrame() {
    if (!cameraActive || processing || !detector || !videoElement || videoElement.readyState < 2) return;
    try {
      const codes = await detector.detect(videoElement);
      const token = codes.find((code) => code.rawValue)?.rawValue;
      if (token) {
        if (scanTimer) clearInterval(scanTimer);
        scanTimer = null;
        await submitToken(token);
        if (cameraActive && !scanTimer) scanTimer = setInterval(scanFrame, 700);
      }
    } catch {
      // Abaikan frame yang tidak bisa dibaca; pemindaian berikutnya akan mencoba lagi.
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
    cameraActive = false;
    if (scanTimer) clearInterval(scanTimer);
    scanTimer = null;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    if (videoElement) videoElement.srcObject = null;
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
      <button class="primary" onclick={startCamera} disabled={!user}>Aktifkan kamera</button>
    {/if}
  </section>

  <section class="steps">
    <h2>Cara absensi</h2>
    <ol>
      <li>Pastikan kamu sudah mendaftar acara melalui INFORHUB.</li>
      <li>Minta admin menampilkan QR Code sesi absensi.</li>
      <li>Aktifkan kamera dan pindai QR Code pada layar admin.</li>
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
  .steps{margin-top:18px;padding:20px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2)}.steps h2{margin:0 0 12px;font-size:14px}.steps ol{padding-left:20px;color:var(--text-2);font-size:12px;line-height:2}
  .message{margin-bottom:14px;padding:13px;border-radius:8px;font-size:12px;line-height:1.6}.message a{display:block;margin-top:5px;text-decoration:underline}.error{background:var(--err-bg);color:var(--err-text)}.success{background:var(--ok-bg);color:var(--ok-text)}
  @media(max-width:650px){.page{padding:0 15px 35px}.intro{padding-top:28px}}
</style>
