<script lang="ts">
  import QRCode from 'qrcode';
  import { api } from '#lib/api.js';

  let selectedEventId = $state('');
  let showFullscreen = $state(false);

  type EventItem = {
    id: number;
    title: string;
    startAt: string;
    location: string;
    present: number;
    registered: number;
  };

  let events = $state<EventItem[]>([]);
  let qrDataUrl = $state('');
  let qrLoading = $state(false);
  let qrError = $state('');
  let secondsLeft = $state(0);

  let selectedEvent = $derived(
    events.find((event) => String(event.id) === selectedEventId)
  );

  function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'long',
      timeStyle: 'short'
    }).format(date);
  }

  function toggleFullscreen() {
    showFullscreen = !showFullscreen;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && showFullscreen) showFullscreen = false;
  }

  // Ambil daftar acara + statistik (diperbarui tiap 5 detik).
  async function loadEvents() {
    try {
      events = await api<EventItem[]>('/api/admin/events');
    } catch {
      // abaikan, coba lagi pada interval berikutnya
    }
  }

  $effect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 5000);
    return () => clearInterval(interval);
  });

  // Ambil token sesi absensi, buat QR, lalu perbarui otomatis sebelum kedaluwarsa.
  $effect(() => {
    const id = selectedEventId;
    qrDataUrl = '';
    qrError = '';
    secondsLeft = 0;
    if (!id) return;

    let stopped = false;
    let expiresAtMs = 0;
    let refreshTimer: ReturnType<typeof setTimeout>;

    async function loadQr() {
      qrLoading = true;
      try {
        const { token, expiresAt } = await api<{ token: string; expiresAt: string }>(
          `/api/admin/attendance/session?eventId=${id}`
        );
        const url = await QRCode.toDataURL(String(token), {
          width: 600,
          margin: 2,
          errorCorrectionLevel: 'M'
        });
        if (stopped) return;

        qrDataUrl = url;
        qrError = '';
        expiresAtMs = new Date(expiresAt).getTime();
        const wait = Math.max(5000, expiresAtMs - Date.now() - 2000);
        refreshTimer = setTimeout(loadQr, wait);
      } catch {
        if (stopped) return;
        qrError = 'QR Code gagal dimuat. Mencoba lagi...';
        refreshTimer = setTimeout(loadQr, 10000);
      } finally {
        if (!stopped) qrLoading = false;
      }
    }

    loadQr();
    const tick = setInterval(() => {
      secondsLeft = expiresAtMs
        ? Math.max(0, Math.round((expiresAtMs - Date.now()) / 1000))
        : 0;
    }, 1000);

    return () => {
      stopped = true;
      clearTimeout(refreshTimer);
      clearInterval(tick);
    };
  });
</script>

<svelte:head>
  <title>Absensi Acara | INFORHUB Admin</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<section class="page">
  <div class="heading">
    <div>
      <div class="breadcrumb">Admin / Absensi</div>
      <h1>Absensi Acara</h1>
      <p>Tampilkan QR Code agar peserta dapat melakukan check-in melalui perangkat mereka.</p>
    </div>
  </div>

  <section class="panel event-selector">
    <label for="event-select">Pilih acara</label>
    <select id="event-select" bind:value={selectedEventId}>
      <option value="">Pilih acara untuk menampilkan QR Code</option>
      {#each events as event (event.id)}
        <option value={String(event.id)}>{event.title}</option>
      {/each}
    </select>
    <p>Pilih acara yang sedang membuka sesi absensi.</p>
  </section>

  {#if selectedEvent}
    <section class:fullscreen={showFullscreen} class="qr-panel">
      {#if showFullscreen}
        <button class="close-fullscreen" onclick={toggleFullscreen}>
          ✕ Tutup layar penuh
        </button>
      {/if}

      <div class="event-info">
        <span class="event-badge">SESI ABSENSI</span>
        <h2>{selectedEvent.title}</h2>
        <p>{selectedEvent.location}</p>
        <p>{formatDate(selectedEvent.startAt)}</p>
      </div>

      {#if qrDataUrl}
        <div class="qr-box">
          <img src={qrDataUrl} alt="QR Code absensi {selectedEvent.title}" />
          <p class="qr-timer">QR diperbarui otomatis · {secondsLeft} detik</p>
        </div>
      {:else}
        <div class="qr-placeholder">
          <span class="qr-icon">▦</span>
          <strong>{qrLoading ? 'Memuat QR Code...' : 'QR Code belum tersedia'}</strong>
          <p>{qrError || 'QR Code akan ditampilkan setelah sesi absensi dimuat.'}</p>
        </div>
      {/if}

      <div class="attendance-stats">
        <div>
          <span>Peserta terdaftar</span>
          <strong>{selectedEvent.registered}</strong>
        </div>
        <div>
          <span>Sudah hadir</span>
          <strong>{selectedEvent.present}</strong>
        </div>
        <div>
          <span>Belum hadir</span>
          <strong>{Math.max(0, selectedEvent.registered - selectedEvent.present)}</strong>
        </div>
      </div>

      <button class="primary-button" onclick={toggleFullscreen}>
        ⛶ {showFullscreen ? 'Keluar layar penuh' : 'Tampilkan layar penuh'}
      </button>
    </section>
  {:else}
    <section class="panel empty-state">
      <div class="empty-icon">▦</div>
      <h2>Belum ada acara dipilih</h2>
      <p>Pilih acara di atas untuk melihat QR Code dan ringkasan kehadiran.</p>
    </section>
  {/if}

  <section class="panel instructions">
    <h2>Cara menggunakan absensi</h2>

    <div class="steps">
      <div class="step">
        <span>01</span>
        <div>
          <strong>Pilih acara</strong>
          <p>Admin memilih acara yang akan melakukan check-in.</p>
        </div>
      </div>
      <div class="step">
        <span>02</span>
        <div>
          <strong>Tampilkan QR Code</strong>
          <p>QR Code ditampilkan di layar admin atau proyektor.</p>
        </div>
      </div>
      <div class="step">
        <span>03</span>
        <div>
          <strong>Peserta melakukan scan</strong>
          <p>Peserta membuka halaman absensi di akun mereka dan memindai QR Code.</p>
        </div>
      </div>
      <div class="step">
        <span>04</span>
        <div>
          <strong>Pantau kehadiran</strong>
          <p>Jumlah peserta hadir diperbarui setelah server memvalidasi check-in.</p>
        </div>
      </div>
    </div>
  </section>
</section>

<style>
  .page { max-width: 1200px; margin: auto; color: #e7edf7; }
  .heading { margin-bottom: 22px; }
  .breadcrumb { margin-bottom: 9px; color: #7f94ad; font-size: 11px; }
  h1 { margin: 0 0 7px; font-size: 27px; }
  .heading > div > p { margin: 0; color: #91a2b8; font-size: 12px; line-height: 1.6; }

  .panel { margin-bottom: 17px; border: 1px solid #223145; border-radius: 11px; background: #0d1722; }
  .event-selector { display: grid; gap: 10px; padding: 19px; }
  .event-selector label { font-size: 12px; font-weight: 650; }
  .event-selector select { width: 100%; padding: 12px; border: 1px solid #2a3b50; border-radius: 8px; background: #101c29; color: #e7edf7; font-size: 12px; }
  .event-selector p { margin: 0; color: #8296ae; font-size: 10px; }

  .qr-panel { display: flex; align-items: center; flex-direction: column; padding: 28px; text-align: center; }
  .event-info h2 { margin: 12px 0 8px; font-size: 22px; }
  .event-info p { margin: 5px 0; color: #9bacc1; font-size: 12px; }
  .event-badge { display: inline-block; padding: 6px 10px; border-radius: 20px; background: #123352; color: #7dbaff; font-size: 10px; font-weight: 700; letter-spacing: 1px; }

  .qr-placeholder { display: flex; align-items: center; flex-direction: column; justify-content: center; width: min(100%, 300px); min-height: 270px; gap: 12px; margin: 25px 0; padding: 22px; border: 1px dashed #3a506b; border-radius: 12px; background: #101c29; }
  .qr-icon { color: #7da9d9; font-size: 55px; }
  .qr-placeholder strong { font-size: 13px; }
  .qr-placeholder p { margin: 0; color: #91a2b8; font-size: 11px; line-height: 1.6; }

  .qr-box { display: flex; align-items: center; flex-direction: column; gap: 10px; margin: 25px 0; }
  .qr-box img { display: block; width: min(100%, 300px); aspect-ratio: 1; padding: 10px; border-radius: 12px; background: #fff; image-rendering: pixelated; }
  .qr-timer { margin: 0; color: #91a2b8; font-size: 11px; }

  .attendance-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); width: 100%; max-width: 600px; margin-bottom: 22px; border: 1px solid #243449; border-radius: 10px; }
  .attendance-stats div { display: grid; gap: 8px; padding: 17px 8px; }
  .attendance-stats div + div { border-left: 1px solid #243449; }
  .attendance-stats span { color: #91a2b8; font-size: 10px; }
  .attendance-stats strong { font-size: 24px; }

  .primary-button { padding: 12px 18px; border: 0; border-radius: 8px; background: #247cf4; color: white; font-size: 12px; font-weight: 650; cursor: pointer; }
  .primary-button:hover { background: #408fff; }

  .empty-state { display: flex; align-items: center; flex-direction: column; padding: 50px 20px; text-align: center; }
  .empty-icon { margin-bottom: 12px; color: #6f86a2; font-size: 45px; }
  .empty-state h2 { margin: 0 0 8px; font-size: 15px; }
  .empty-state p { max-width: 370px; margin: 0; color: #91a2b8; font-size: 12px; line-height: 1.6; }

  .instructions { padding: 21px; }
  .instructions h2 { margin: 0 0 22px; font-size: 15px; }
  .steps { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
  .step { display: flex; align-items: flex-start; gap: 12px; }
  .step > span { display: grid; place-items: center; flex-shrink: 0; width: 34px; height: 34px; border-radius: 9px; background: #142c4a; color: #7dbaff; font-size: 11px; font-weight: 700; }
  .step strong { font-size: 12px; }
  .step p { margin: 6px 0 0; color: #91a2b8; font-size: 11px; line-height: 1.6; }

  .fullscreen { position: fixed; inset: 0; z-index: 200; display: flex; justify-content: center; overflow-y: auto; margin: 0; border: 0; border-radius: 0; background: #080f18; }
  .fullscreen .event-info h2 { font-size: clamp(24px, 4vw, 40px); }
  .fullscreen .qr-placeholder { width: min(70vw, 400px); min-height: 300px; }
  .fullscreen .qr-box img { width: min(70vw, 60vh, 480px); }
  .close-fullscreen { align-self: flex-end; margin-bottom: 20px; padding: 10px 14px; border: 1px solid #30445c; border-radius: 8px; background: #152337; color: #d8e5f5; cursor: pointer; }

  @media (max-width: 600px) {
    .qr-panel { padding: 20px 14px; }
    .attendance-stats span { font-size: 9px; }
    .attendance-stats strong { font-size: 20px; }
    .steps { grid-template-columns: 1fr; }
  }
</style>