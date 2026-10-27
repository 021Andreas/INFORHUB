<script lang="ts">
  import Icon from "#lib/components/Icon.svelte";
  import { onMount } from "svelte";
  import { api } from "#lib/api.js";

  type EventItem = {
    id: number; title: string; posterUrl: string | null; startAt: string;
    location: string; quota: number; registered: number;
  };

  let events = $state<EventItem[]>([]);
  let loading = $state(true);
  let error = $state("");
  let search = $state("");

  let filtered = $derived(events.filter((event) =>
    `${event.title} ${event.location}`.toLowerCase().includes(search.trim().toLowerCase())
  ));

  onMount(async () => {
    try {
      events = await api<EventItem[]>("/api/events");
    } catch (e) {
      error = e instanceof Error ? e.message : "Gagal memuat acara.";
    } finally {
      loading = false;
    }
  });

  function dateLabel(value: string) {
    return new Date(value).toLocaleString("id-ID", {
      dateStyle: "long", timeStyle: "short"
    });
  }
</script>

<svelte:head><title>Jelajahi Acara | INFORHUB</title></svelte:head>

<main class="page">
  <section class="intro">
    <h1>Jelajahi Acara</h1>
    <p>Temukan seminar, workshop, dan kegiatan yang sesuai minatmu.</p>
    <input aria-label="Cari acara" bind:value={search} placeholder="Cari nama acara atau lokasi..." />
  </section>

  {#if loading}
    <div class="state">Memuat acara...</div>
  {:else if error}
    <div class="state error"><strong>Acara gagal dimuat</strong><p>{error}</p></div>
  {:else if filtered.length === 0}
    <div class="state"><strong>Belum ada acara yang cocok</strong><p>Acara yang dipublikasikan admin akan muncul di sini.</p></div>
  {:else}
    <section class="grid">
      {#each filtered as event (event.id)}
        <article class="card">
          {#if event.posterUrl}
            <img class="poster" src={event.posterUrl} alt={`Poster ${event.title}`} />
          {:else}
            <div class="poster empty-poster"><span>INFORHUB</span><strong>{event.title}</strong></div>
          {/if}
          <div class="body">
            <span class="pill">Acara dipublikasikan</span>
            <h2>{event.title}</h2>
            <p><Icon name="clock" size={15}/> {dateLabel(event.startAt)}</p>
            <p><Icon name="map-pin" size={15}/> {event.location}</p>
            <div class="quota"><span>Peserta terdaftar</span><strong>{event.registered} / {event.quota}</strong></div>
            <div class="bar"><span style={`width:${Math.min(100, event.registered / Math.max(1,event.quota) * 100)}%`}></span></div>
            <a class="button" href={`/acara/${event.id}`}>Lihat detail <span>→</span></a>
          </div>
        </article>
      {/each}
    </section>
  {/if}
</main>

<style>
    :global(*){box-sizing:border-box} :global(a){color:inherit;text-decoration:none}
  .page{max-width:1180px;margin:auto;padding:0 24px 50px}
  
  
   nav a.active,nav a:hover{color:var(--text)}
  .intro{padding:45px 0 30px}.eyebrow{color:var(--accent-text);font-size:10px;font-weight:800;letter-spacing:1.5px}
  h1{margin:10px 0;font-size:32px;letter-spacing:-.8px}.intro p{color:var(--muted);font-size:13px}
  .intro input{width:min(100%,480px);margin-top:16px;padding:13px 15px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface);color:var(--text)}
  .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
  .card{overflow:hidden;border:1px solid var(--border);border-radius:13px;background:var(--surface-2)}
  .poster{display:block;width:100%;height:190px;object-fit:cover;background:var(--surface)}
  .empty-poster{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:20px;text-align:center;background:linear-gradient(135deg,var(--accent-soft),var(--surface))}
  .empty-poster span{color:var(--accent-text);font-size:11px;letter-spacing:2px}.empty-poster strong{font-size:19px}
  .body{padding:18px}.pill{display:inline-block;padding:6px 9px;border-radius:20px;background:var(--accent-soft);color:var(--accent-text);font-size:10px}
  h2{font-size:17px;line-height:1.4;margin:13px 0}.body p{font-size:11px;color:var(--text-2)}
  .quota{display:flex;justify-content:space-between;margin-top:19px;font-size:11px;color:var(--muted)}.quota strong{color:var(--text)}
  .bar{height:5px;margin-top:9px;background:var(--surface-3);border-radius:10px;overflow:hidden}.bar span{display:block;height:100%;background:var(--accent)}
  .button{display:flex;justify-content:space-between;margin-top:19px;padding:11px 13px;border-radius:8px;background:var(--accent);font-size:12px;font-weight:700}
  .state{padding:55px 20px;text-align:center;color:var(--muted);border:1px dashed var(--border-strong);border-radius:12px}.state strong{color:var(--text)}.state p{font-size:12px}.error{color:var(--err-text)}
  @media(max-width:850px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:600px){.page{padding:0 15px 35px}.grid{grid-template-columns:1fr}.intro{padding-top:30px}h1{font-size:27px}}
</style>
