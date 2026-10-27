<script lang="ts">
  import Icon from "#lib/components/Icon.svelte";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { api } from "#lib/api.js";

  type EventItem = {
    id: number; title: string; description: string | null; organizer: string;
    posterUrl: string | null; categoryId: number | null; category: string | null;
    startAt: string; endAt: string; location: string; quota: number; registered: number;
    certificateAvailable: boolean;
    status: string; remaining: number; registrationOpen: boolean;
    myRegistration: { status: "registered" | "cancelled"; ticketCode: string | null } | null;
  };
  type User = { id: number; name: string; email: string; role: string };

  let event = $state<EventItem | null>(null);
  let user = $state<User | null>(null);
  let loading = $state(true);
  let registering = $state(false);
  let error = $state("");
  let success = $state("");

  onMount(async () => {
    const id = Number(page.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      error = "ID acara tidak valid.";
      loading = false;
      return;
    }

    const [eventResult, userResult] = await Promise.allSettled([
      api<EventItem>(`/api/events/${id}`),
      api<{ user: User }>("/api/auth/me")
    ]);

    if (eventResult.status === "fulfilled") {
      event = eventResult.value;
    } else {
      error = eventResult.reason instanceof Error ? eventResult.reason.message : "Gagal memuat acara.";
    }

    if (userResult.status === "fulfilled") user = userResult.value.user;
    loading = false;
  });

  async function register() {
    if (!event || registering) return;
    if (!user) {
      goto(`/login?redirect=${encodeURIComponent(page.url.pathname)}`);
      return;
    }

    registering = true;
    error = "";
    success = "";
    try {
      await api(`/api/events/${event.id}/register`, { method: "POST" });
      success = "Pendaftaran berhasil. Tiket acara dapat dilihat di halaman Pendaftaran Saya.";
      event = {
        ...event,
        registered: event.registered + 1,
        remaining: Math.max(0, event.remaining - 1),
        myRegistration: { status: "registered", ticketCode: null }
      };
    } catch (e) {
      error = e instanceof Error ? e.message : "Pendaftaran gagal.";
    } finally {
      registering = false;
    }
  }

  async function cancel() {
    if (!event || registering) return;
    if (!confirm("Batalkan pendaftaran acara ini?")) return;
    registering = true;
    error = "";
    success = "";
    try {
      await api(`/api/events/${event.id}/register`, { method: "DELETE" });
      event = {
        ...event,
        registered: Math.max(0, event.registered - 1),
        remaining: event.remaining + 1,
        myRegistration: { status: "cancelled", ticketCode: null }
      };
    } catch (e) {
      error = e instanceof Error ? e.message : "Gagal membatalkan pendaftaran.";
    } finally {
      registering = false;
    }
  }

  function dateLabel(value: string) {
    return new Date(value).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" });
  }
</script>

<svelte:head><title>{event?.title ?? "Detail Acara"} | INFORHUB</title></svelte:head>

<main class="page">
  <a class="back" href="/acara">← Kembali ke daftar acara</a>

  {#if loading}
    <div class="state">Memuat detail acara...</div>
  {:else if error && !event}
    <div class="state"><strong>Acara tidak tersedia</strong><p>{error}</p></div>
  {:else if event}
    <article class="detail">
      {#if event.posterUrl}
        <img class="poster" src={event.posterUrl} alt={`Poster ${event.title}`} />
      {:else}
        <div class="poster placeholder"><span>INFORHUB</span><strong>{event.title}</strong></div>
      {/if}
      <section class="content">
        <span class="pill">{event.category || "Acara"}</span>
        <h1>{event.title}</h1>
        <p class="description">{event.description || "Belum ada deskripsi acara."}</p>
        <p class="organizer">Penyelenggara: {event.organizer}</p>
        <div class="meta"><span><Icon name="clock" size={15}/> {dateLabel(event.startAt)}</span><span><Icon name="map-pin" size={15}/> {event.location}</span></div>
        <div class="quota"><span>Kuota peserta</span><strong>{event.registered} / {event.quota}</strong></div>
        <div class="bar"><span style={`width:${Math.min(100,event.registered / Math.max(1,event.quota)*100)}%`}></span></div>
        {#if success}<div class="success" role="status">{success}<a href="/pendaftaran">Lihat pendaftaran →</a></div>{/if}
        {#if error}<div class="error" role="alert">{error}</div>{/if}
        {#if user}
          {#if event.myRegistration?.status === "registered"}
            {#if !success}<div class="success" role="status">Kamu sudah terdaftar di acara ini.<a href="/pendaftaran">Lihat tiket →</a></div>{/if}
            <button class="primary" onclick={cancel} disabled={registering}>{registering ? "Memproses..." : "Batalkan pendaftaran"}</button>
          {:else}
            <button class="primary" onclick={register} disabled={registering || !event.registrationOpen}>
              {registering ? "Memproses..." : event.registrationOpen ? "Daftar sekarang" : event.remaining <= 0 ? "Kuota penuh" : "Pendaftaran ditutup"}
            </button>
          {/if}
          <p class="hint">Login sebagai {user.name}. Pendaftaran menggunakan akun ini.</p>
        {:else}
          <button class="primary" onclick={register}>Masuk untuk mendaftar</button>
        {/if}
      </section>
    </article>
  {/if}
</main>

<style>
    :global(*){box-sizing:border-box}:global(a){color:inherit;text-decoration:none}
  .page{max-width:1050px;margin:auto;padding:0 24px 50px}
  
  .back{display:inline-block;margin:25px 0;color:var(--accent-text);font-size:12px}.detail{overflow:hidden;border:1px solid var(--border);border-radius:14px;background:var(--surface-2)}
  .poster{display:block;width:100%;max-height:440px;object-fit:cover;background:var(--surface-3)}.placeholder{min-height:260px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:15px;background:linear-gradient(135deg,var(--accent-soft),var(--surface));text-align:center;padding:25px}
  .placeholder span{color:var(--accent-text);letter-spacing:2px}.placeholder strong{font-size:26px}.content{padding:30px;max-width:850px}
  .pill{padding:6px 9px;border-radius:20px;background:var(--accent-soft);color:var(--accent-text);font-size:10px}h1{font-size:31px;margin:17px 0}
  .description{color:var(--text-2);font-size:13px;line-height:1.8}.organizer{color:var(--muted);font-size:11px}.meta{display:grid;gap:12px;color:var(--text-2);font-size:12px}.quota{display:flex;justify-content:space-between;margin-top:25px;color:var(--muted);font-size:12px}.quota strong{color:var(--text)}
  .bar{height:5px;margin-top:10px;background:var(--surface-3);border-radius:10px;overflow:hidden}.bar span{display:block;height:100%;background:var(--accent)}
  .primary{margin-top:24px;padding:13px 18px;border:0;border-radius:8px;background:var(--accent);color:white;font-weight:700;cursor:pointer}.primary:disabled{opacity:.55;cursor:not-allowed}
  .hint{color:var(--muted);font-size:11px}.state{margin-top:25px;padding:45px;text-align:center;border:1px dashed var(--border-strong);border-radius:12px;color:var(--muted)}
  .success,.error{margin-top:18px;padding:13px;border-radius:8px;font-size:12px;line-height:1.6}.success{background:var(--ok-bg);color:var(--ok-text)}.success a{display:block;margin-top:5px;text-decoration:underline}.error{background:var(--err-bg);color:var(--err-text)}
  @media(max-width:650px){.page{padding:0 15px 35px}.content{padding:20px}h1{font-size:25px}}
</style>
