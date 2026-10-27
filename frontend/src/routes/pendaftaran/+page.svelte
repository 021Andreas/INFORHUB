<script lang="ts">
  import Icon from "#lib/components/Icon.svelte";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { api, ApiError } from "#lib/api.js";

  type Registration = {
    id: number; eventId: number; title: string; posterUrl: string | null;
    startAt: string; endAt: string; location: string; eventStatus: string;
    registrationStatus: "registered" | "cancelled"; ticketCode: string;
    registeredAt: string; attendanceStatus: "present" | "absent" | null;
    certificateId: number | null; certificateNumber: string | null;
  };

  let rows = $state<Registration[]>([]);
  let loading = $state(true);
  let error = $state("");
  let cancellingId = $state<number | null>(null);
  let filter = $state("Semua");

  let filtered = $derived(rows.filter((row) =>
    filter === "Semua" ||
    (filter === "Aktif" && row.registrationStatus === "registered") ||
    (filter === "Dibatalkan" && row.registrationStatus === "cancelled")
  ));

  async function load() {
    loading = true;
    error = "";
    try {
      rows = await api<Registration[]>("/api/me/registrations");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        goto("/login?redirect=%2Fpendaftaran");
        return;
      }
      error = e instanceof Error ? e.message : "Gagal memuat pendaftaran.";
    } finally {
      loading = false;
    }
  }

  onMount(load);

  async function cancel(row: Registration) {
    if (!confirm(`Batalkan pendaftaran "${row.title}"?`)) return;
    cancellingId = row.eventId;
    error = "";
    try {
      await api(`/api/events/${row.eventId}/register`, { method: "DELETE" });
      rows = rows.map((item) => item.id === row.id
        ? { ...item, registrationStatus: "cancelled" }
        : item);
    } catch (e) {
      error = e instanceof Error ? e.message : "Gagal membatalkan pendaftaran.";
    } finally {
      cancellingId = null;
    }
  }

  function dateLabel(value: string) {
    return new Date(value).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });
  }
</script>

<svelte:head><title>Pendaftaran Saya | INFORHUB</title></svelte:head>

<main class="page">
  <section class="intro">
    <h1>Pendaftaran Saya</h1>
    <p>Kelola acara yang kamu ikuti dan lihat tiket pendaftaran.</p>
  </section>

  <div class="filter">
    {#each ["Semua", "Aktif", "Dibatalkan"] as option}
      <button class:chosen={filter === option} onclick={() => filter = option}>{option}</button>
    {/each}
    <button class="refresh" onclick={load} disabled={loading}>↻ Perbarui</button>
  </div>

  {#if error}<div class="error" role="alert">{error}</div>{/if}
  {#if loading}
    <div class="state">Memuat pendaftaran...</div>
  {:else if filtered.length === 0}
    <div class="state"><strong>Belum ada pendaftaran</strong><p>Acara yang kamu ikuti akan muncul di sini.</p><a href="/acara">Jelajahi acara →</a></div>
  {:else}
    <section class="list">
      {#each filtered as row (row.id)}
        <article class="registration">
          {#if row.posterUrl}
            <img class="poster" src={row.posterUrl} alt={`Poster ${row.title}`} />
          {:else}
            <div class="poster placeholder">IH</div>
          {/if}
          <div class="info">
            <span class:cancelled={row.registrationStatus === "cancelled"} class="status">{row.registrationStatus === "registered" ? "Terdaftar" : "Dibatalkan"}</span>
            <h2>{row.title}</h2>
            <p>◷ {dateLabel(row.startAt)}</p>
            <p><Icon name="map-pin" size={15}/> {row.location}</p>
            <p>Daftar pada {dateLabel(row.registeredAt)}</p>
            <div class="ticket">
              <span>Kode tiket</span>
              <strong>{row.ticketCode}</strong>
            </div>
            {#if row.attendanceStatus === "present"}
              <p class="attended">✓ Kehadiran sudah tercatat</p>
            {/if}
            {#if row.certificateNumber}
              <a class="link" href="/sertifikat">Sertifikat tersedia →</a>
            {/if}
            <div class="actions">
              <a class="secondary" href={`/acara/${row.eventId}`}>Detail acara</a>
              {#if row.registrationStatus === "registered"}
                <button class="cancel" disabled={cancellingId === row.eventId} onclick={() => cancel(row)}>
                  {cancellingId === row.eventId ? "Memproses..." : "Batalkan"}
                </button>
              {/if}
            </div>
          </div>
        </article>
      {/each}
    </section>
  {/if}
</main>

<style>
  :global(*){box-sizing:border-box}:global(a){color:inherit;text-decoration:none}
  .page{max-width:1100px;margin:auto;padding:0 24px 50px}
  
  .intro{padding:40px 0 25px}.eyebrow{color:var(--accent-text);font-size:10px;font-weight:800;letter-spacing:1.5px}h1{font-size:30px;margin:10px 0}.intro p{color:var(--muted);font-size:12px}
  .filter{display:flex;gap:8px;margin-bottom:17px}.filter button,.secondary,.cancel{padding:9px 12px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface);color:var(--text-2);font-size:11px;cursor:pointer}.filter button.chosen{background:var(--accent-soft);border-color:var(--accent);color:var(--accent-text)}.filter .refresh{margin-left:auto}
  .list{display:grid;gap:14px}.registration{display:grid;grid-template-columns:180px 1fr;gap:20px;padding:17px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2)}.poster{width:100%;height:180px;object-fit:cover;border-radius:8px;background:var(--surface-3)}.placeholder{display:grid;place-items:center;color:var(--accent-text);font-size:35px;font-weight:800}
  .info h2{margin:11px 0;font-size:18px}.info p{margin:7px 0;color:var(--muted);font-size:11px}.status{display:inline-block;padding:5px 8px;border-radius:20px;background:var(--ok-bg);color:var(--ok-text);font-size:10px}.status.cancelled{background:var(--warn-bg);color:var(--warn-text)}
  .ticket{display:grid;gap:5px;margin-top:14px;padding:11px;border:1px dashed var(--border-strong);border-radius:8px;background:var(--surface)}.ticket span{color:var(--muted);font-size:10px}.ticket strong{font-size:12px;overflow-wrap:anywhere;letter-spacing:.5px}
  .attended{color:var(--ok-text)!important}.link{display:inline-block;margin-top:9px;color:var(--accent-text);font-size:11px}.actions{display:flex;gap:9px;margin-top:15px}.secondary{display:inline-flex;align-items:center}.cancel{border-color:var(--err-text);background:var(--err-bg);color:var(--err-text)}.state{padding:50px 20px;text-align:center;border:1px dashed var(--border-strong);border-radius:12px;color:var(--muted);font-size:12px}.state strong{color:var(--text)}.state p{margin:8px 0 14px}.state a{color:var(--accent-text)}.error{margin-bottom:14px;padding:12px;border-radius:8px;background:var(--err-bg);color:var(--err-text);font-size:12px}
  @media(max-width:650px){.page{padding:0 15px 35px}.registration{grid-template-columns:1fr}.poster{height:160px}.filter{flex-wrap:wrap}}
</style>
