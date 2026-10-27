<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '#lib/api.js';
  import Icon from '#lib/components/Icon.svelte';

  type EventItem = {
    id: number;
    title: string;
    description?: string | null;
    posterUrl: string | null;
    startAt: string;
    endAt?: string | null;
    location: string;
    quota: number;
    registered: number;
    category?: string | null;
    organizer?: string | null;
  };
  type Sort = 'untukmu' | 'terbaru' | 'populer' | 'segera' | 'tersimpan';

  const tabs: { id: Sort; label: string }[] = [
    { id: 'untukmu', label: 'Untuk kamu' },
    { id: 'terbaru', label: 'Terbaru' },
    { id: 'populer', label: 'Populer' },
    { id: 'segera', label: 'Segera' },
    { id: 'tersimpan', label: 'Tersimpan' }
  ];
  const PAGE = 8;
  const SAVED_KEY = 'inforhub-saved';

  let events = $state<EventItem[]>([]);
  let loading = $state(true);
  let error = $state('');
  let sort = $state<Sort>('untukmu');
  let category = $state('Semua');
  let visible = $state(PAGE);
  let myCategories = $state<Record<string, number>>({});
  let saved = $state<number[]>([]);
  let toast = $state('');

  // Hanya acara yang belum selesai yang tampil di feed.
  const live = $derived(
    events.filter((e) => !e.endAt || new Date(e.endAt).getTime() >= Date.now())
  );
  const categories = $derived([
    'Semua',
    ...new Set(live.map((e) => e.category).filter((v): v is string => Boolean(v)))
  ]);
  const personalized = $derived(Object.keys(myCategories).length > 0);

  // "Untuk kamu": kategori yang pernah diikuti, keramaian, dan kedekatan jadwal.
  function score(e: EventItem) {
    const fill = e.quota > 0 ? e.registered / e.quota : 0;
    const days = (new Date(e.startAt).getTime() - Date.now()) / 86400000;
    const soon = days >= 0 ? 1 / (1 + days / 7) : 0.5;
    const affinity = e.category ? (myCategories[e.category] ?? 0) : 0;
    const full = e.quota > 0 && e.registered >= e.quota ? 2 : 0;
    return affinity * 3 + fill * 1.5 + soon - full;
  }

  const feed = $derived.by(() => {
    let list = live.filter((e) => category === 'Semua' || e.category === category);
    if (sort === 'tersimpan') list = list.filter((e) => saved.includes(e.id));
    const t = (e: EventItem) => new Date(e.startAt).getTime();
    switch (sort) {
      case 'terbaru':
        return [...list].sort((a, b) => b.id - a.id);
      case 'populer':
        return [...list].sort((a, b) => b.registered - a.registered || t(a) - t(b));
      case 'segera':
        return [...list].sort((a, b) => t(a) - t(b));
      case 'untukmu':
        return [...list].sort((a, b) => score(b) - score(a));
      default:
        return list;
    }
  });
  const shown = $derived(feed.slice(0, visible));
  const upcoming = $derived([...live].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()).slice(0, 4));

  onMount(async () => {
    try {
      saved = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]');
    } catch {
      saved = [];
    }

    const [ev, reg] = await Promise.allSettled([
      api<EventItem[] | { data: EventItem[] }>('/api/events'),
      api<{ eventId: number }[]>('/api/me/registrations')
    ]);

    if (ev.status === 'fulfilled') {
      events = Array.isArray(ev.value) ? ev.value : (ev.value.data ?? []);
    } else {
      error = ev.reason instanceof Error ? ev.reason.message : 'Acara belum dapat dimuat.';
    }

    // Riwayat pendaftaran (jika login) dipakai untuk personalisasi tab "Untuk kamu".
    if (reg.status === 'fulfilled' && Array.isArray(reg.value)) {
      const byId = new Map(events.map((e) => [e.id, e.category]));
      const counts: Record<string, number> = {};
      for (const r of reg.value) {
        const c = byId.get(r.eventId);
        if (c) counts[c] = (counts[c] ?? 0) + 1;
      }
      myCategories = counts;
    }
    loading = false;
  });

  function choose(next: Sort) {
    sort = next;
    visible = PAGE;
  }
  function chooseCategory(next: string) {
    category = next;
    visible = PAGE;
  }

  // Muat lebih banyak otomatis saat pengguna mendekati akhir feed.
  function sentinel(node: HTMLElement) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) visible += PAGE;
      },
      { rootMargin: '400px' }
    );
    io.observe(node);
    return { destroy: () => io.disconnect() };
  }

  function toggleSave(id: number) {
    saved = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    } catch {
      // penyimpanan diblokir; tetap berlaku selama halaman terbuka
    }
  }

  function flash(message: string) {
    toast = message;
    setTimeout(() => (toast = ''), 2200);
  }

  async function share(e: EventItem) {
    const url = `${location.origin}/acara/${e.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: e.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      flash('Tautan acara disalin');
    } catch {
      // dibatalkan pengguna
    }
  }

  const startOfDay = (ms: number) => new Date(ms).setHours(0, 0, 0, 0);

  function whenLabel(e: EventItem) {
    const s = new Date(e.startAt).getTime();
    if (Number.isNaN(s)) return 'Jadwal menyusul';
    const end = e.endAt ? new Date(e.endAt).getTime() : s;
    const now = Date.now();
    if (now >= s && now <= end) return 'Sedang berlangsung';
    const d = Math.round((startOfDay(s) - startOfDay(now)) / 86400000);
    if (d <= 0) return 'Hari ini';
    if (d === 1) return 'Besok';
    if (d <= 14) return `${d} hari lagi`;
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(s);
  }

  function dateLabel(value: string) {
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? 'Jadwal menyusul'
      : new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
  }

  function badge(e: EventItem) {
    if (e.quota > 0 && e.registered >= e.quota) return { text: 'Kuota penuh', tone: 'err' };
    if (e.quota > 0 && (e.quota - e.registered) / e.quota <= 0.2) return { text: 'Hampir penuh', tone: 'warn' };
    return null;
  }

  const pct = (e: EventItem) => (e.quota > 0 ? Math.min(100, Math.round((e.registered / e.quota) * 100)) : 0);
  const initial = (name?: string | null) => (name ?? 'P').trim().charAt(0).toUpperCase();
  const day = (v: string) => new Date(v).getDate();
  const month = (v: string) => new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(v));

  const subtitle = $derived(
    sort === 'untukmu'
      ? personalized
        ? 'Disusun dari kategori acara yang pernah kamu ikuti.'
        : 'Belum ada riwayat pendaftaran, jadi ini acara yang sedang ramai dan segera berlangsung.'
      : sort === 'terbaru'
        ? 'Acara yang paling baru dipublikasikan.'
        : sort === 'populer'
          ? 'Acara dengan pendaftar terbanyak.'
          : sort === 'segera'
            ? 'Urut berdasarkan jadwal terdekat.'
            : 'Acara yang kamu simpan di perangkat ini.'
  );
</script>

<svelte:head>
  <title>INFORHUB — Temukan Acara</title>
  <meta name="description" content="Temukan seminar, workshop, dan kegiatan Informatika di INFORHUB." />
</svelte:head>

<div class="layout">
  <section class="feed" aria-label="Feed acara">
    <div class="tabbar">
      <div class="tabs" role="tablist" aria-label="Urutkan acara">
        {#each tabs as tab (tab.id)}
          <button role="tab" aria-selected={sort === tab.id} class:active={sort === tab.id} onclick={() => choose(tab.id)}>
            {tab.label}
          </button>
        {/each}
      </div>
      <div class="chips" aria-label="Filter kategori">
        {#each categories as item (item)}
          <button class:chosen={category === item} onclick={() => chooseCategory(item)}>{item}</button>
        {/each}
      </div>
    </div>

    <p class="subtitle">{subtitle}</p>

    {#if loading}
      <div class="state"><div class="loader"></div><strong>Memuat acara</strong><p>Sedang mengambil informasi terbaru.</p></div>
    {:else if error}
      <div class="state">
        <strong>Acara belum dapat dimuat</strong><p>{error}</p>
        <button class="retry" onclick={() => location.reload()}>Coba lagi</button>
      </div>
    {:else if feed.length === 0}
      <div class="state">
        <strong>{sort === 'tersimpan' ? 'Belum ada acara tersimpan' : 'Acara tidak ditemukan'}</strong>
        <p>
          {sort === 'tersimpan'
            ? 'Tekan ikon simpan pada acara untuk menaruhnya di sini.'
            : category !== 'Semua'
              ? 'Belum ada acara di kategori ini.'
              : 'Acara resmi akan muncul di sini setelah diterbitkan pengelola.'}
        </p>
        {#if category !== 'Semua'}<button class="retry" onclick={() => chooseCategory('Semua')}>Lihat semua kategori</button>{/if}
      </div>
    {:else}
      {#each shown as e (e.id)}
        {@const b = badge(e)}
        <article class="post">
          <header class="post-head">
            <span class="avatar">{initial(e.organizer)}</span>
            <div class="who">
              <strong>{e.organizer ?? 'Penyelenggara acara'}</strong>
              <span>{e.category ?? 'Kegiatan'} · {whenLabel(e)}</span>
            </div>
            {#if b}<span class="chip {b.tone}">{b.text}</span>{/if}
          </header>

          <a class="post-text" href={`/acara/${e.id}`}>
            <h3>{e.title}</h3>
            {#if e.description}<p>{e.description}</p>{/if}
          </a>

          <a class="media" href={`/acara/${e.id}`} aria-label={`Poster ${e.title}`}>
            {#if e.posterUrl}
              <img src={e.posterUrl} alt={`Poster ${e.title}`} loading="lazy" />
            {:else}
              <div class="media-empty"><span>{e.category ?? 'INFORHUB EVENT'}</span></div>
            {/if}
          </a>

          <div class="facts">
            <span><Icon name="calendar" size={15} />{dateLabel(e.startAt)}</span>
            <span><Icon name="map-pin" size={15} />{e.location}</span>
          </div>

          {#if e.quota > 0}
            <div class="quota">
              <div class="bar"><span style:width={`${pct(e)}%`}></span></div>
              <small>{e.registered} dari {e.quota} kursi terisi</small>
            </div>
          {/if}

          <footer class="actions">
            <a class="cta" href={`/acara/${e.id}`}>Lihat &amp; daftar</a>
            <button
              class="icon-action"
              class:on={saved.includes(e.id)}
              aria-pressed={saved.includes(e.id)}
              aria-label={saved.includes(e.id) ? 'Hapus dari tersimpan' : 'Simpan acara'}
              onclick={() => toggleSave(e.id)}
            >
              <Icon name="bookmark" size={18} />
            </button>
            <button class="icon-action" aria-label="Bagikan acara" onclick={() => share(e)}>
              <Icon name="share" size={18} />
            </button>
          </footer>
        </article>
      {/each}

      {#if visible < feed.length}
        <div class="more" use:sentinel>
          <button class="retry" onclick={() => (visible += PAGE)}>Tampilkan lebih banyak</button>
        </div>
      {:else}
        <p class="end">Kamu sudah melihat semua acara.</p>
      {/if}
    {/if}
  </section>

  <aside class="side" aria-label="Ringkasan">
    {#if upcoming.length}
      <section class="widget">
        <h2>Segera berlangsung</h2>
        {#each upcoming as e (e.id)}
          <a class="mini" href={`/acara/${e.id}`}>
            <span class="date"><b>{day(e.startAt)}</b><small>{month(e.startAt)}</small></span>
            <span class="mini-text"><strong>{e.title}</strong><small>{e.location}</small></span>
          </a>
        {/each}
      </section>
    {/if}

    {#if categories.length > 1}
      <section class="widget">
        <h2>Jelajahi kategori</h2>
        <div class="cat-list">
          {#each categories.slice(1) as c (c)}
            <button class:chosen={category === c} onclick={() => chooseCategory(c)}>
              {c}<small>{live.filter((e) => e.category === c).length}</small>
            </button>
          {/each}
        </div>
      </section>
    {/if}

    <a class="all-link" href="/acara">Jelajahi semua acara <span>→</span></a>
  </aside>
</div>

{#if toast}<div class="toast" role="status">{toast}</div>{/if}

<style>
  .layout { display: grid; grid-template-columns: minmax(0, 680px) 300px; gap: 28px; justify-content: center; align-items: start; }
  .feed { min-width: 0; }

  .tabbar { position: sticky; top: 82px; z-index: 20; margin: 0 0 4px; padding: 0 0 10px; background: var(--bg); }
  .tabs { display: flex; gap: 4px; overflow-x: auto; border-bottom: 1px solid var(--border); scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  .tabs button { position: relative; flex: 0 0 auto; padding: 14px 16px; border: 0; background: transparent; color: var(--muted); font-size: 13px; font-weight: 650; cursor: pointer; }
  .tabs button:hover { color: var(--text); }
  .tabs button.active { color: var(--text); }
  .tabs button.active::after { content: ''; position: absolute; left: 12px; right: 12px; bottom: -1px; height: 3px; border-radius: 3px 3px 0 0; background: var(--accent); }

  .chips { display: flex; gap: 8px; margin-top: 12px; overflow-x: auto; scrollbar-width: none; }
  .chips::-webkit-scrollbar { display: none; }
  .chips button { flex: 0 0 auto; padding: 7px 13px; border: 1px solid var(--border); border-radius: 999px; background: var(--surface); color: var(--text-2); font-size: 12px; font-weight: 600; cursor: pointer; }
  .chips button:hover { border-color: var(--border-strong); }
  .chips button.chosen { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-text); }

  .subtitle { margin: 6px 4px 16px; color: var(--muted); font-size: 12px; }

  .post { margin: 0 0 16px; padding: 16px; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); }
  .post-head { display: flex; align-items: center; gap: 11px; margin-bottom: 12px; }
  .avatar { display: grid; place-items: center; flex: 0 0 auto; width: 40px; height: 40px; border-radius: 50%; background: var(--accent-soft); color: var(--accent-text); font-size: 15px; font-weight: 700; }
  .who { display: grid; gap: 3px; min-width: 0; flex: 1; }
  .who strong { overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
  .who span { color: var(--muted); font-size: 11px; }
  .chip { flex: 0 0 auto; padding: 4px 9px; border-radius: 999px; font-size: 10px; font-weight: 700; }
  .chip.warn { background: var(--warn-bg); color: var(--warn-text); }
  .chip.err { background: var(--err-bg); color: var(--err-text); }

  .post-text { display: block; color: inherit; text-decoration: none; }
  .post-text h3 { margin: 0 0 6px; font-size: 17px; line-height: 1.35; color: var(--text); }
  .post-text p { display: -webkit-box; margin: 0 0 12px; overflow: hidden; color: var(--text-2); font-size: 13px; line-height: 1.6; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; }

  .media { display: block; overflow: hidden; margin-top: 4px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface-3); }
  .media img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
  .media-empty { display: grid; place-items: center; aspect-ratio: 16 / 9; background: linear-gradient(135deg, var(--accent-soft), var(--surface-3)); }
  .media-empty span { color: var(--accent-text); font-size: 15px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }

  .facts { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 12px; color: var(--text-2); font-size: 12px; }
  .facts span { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
  .facts :global(svg) { color: var(--muted); flex: 0 0 auto; }

  .quota { margin-top: 12px; }
  .bar { height: 6px; overflow: hidden; border-radius: 6px; background: var(--surface-3); }
  .bar span { display: block; height: 100%; border-radius: 6px; background: var(--accent); }
  .quota small { display: block; margin-top: 6px; color: var(--muted); font-size: 11px; }

  .actions { display: flex; align-items: center; gap: 8px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }
  .cta { display: inline-flex; align-items: center; justify-content: center; flex: 1; min-height: 40px; border-radius: 10px; background: var(--accent); color: #fff; font-size: 13px; font-weight: 700; text-decoration: none; }
  .cta:hover { filter: brightness(1.08); }
  .icon-action { display: grid; place-items: center; width: 40px; height: 40px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: var(--text-2); cursor: pointer; }
  .icon-action:hover { border-color: var(--border-strong); color: var(--text); }
  .icon-action.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-text); }
  .icon-action.on :global(svg) { fill: currentColor; }

  .state { display: grid; justify-items: center; gap: 8px; padding: 54px 20px; border: 1px dashed var(--border-strong); border-radius: 16px; background: var(--surface); text-align: center; }
  .state strong { font-size: 15px; }
  .state p { margin: 0; color: var(--muted); font-size: 12px; }
  .loader { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .retry { margin-top: 6px; padding: 9px 16px; border: 1px solid var(--border-strong); border-radius: 9px; background: var(--surface); color: var(--text); font-size: 12px; font-weight: 650; cursor: pointer; }
  .more { display: grid; justify-items: center; padding: 8px 0 24px; }
  .end { margin: 8px 0 28px; color: var(--muted); font-size: 12px; text-align: center; }

  .side { position: sticky; top: 112px; display: grid; gap: 16px; }
  .widget { padding: 16px; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); }
  .widget h2 { margin: 0 0 12px; font-size: 14px; }
  .mini { display: flex; align-items: center; gap: 12px; padding: 9px 0; color: inherit; text-decoration: none; }
  .mini + .mini { border-top: 1px solid var(--border); }
  .date { display: grid; place-items: center; flex: 0 0 auto; width: 44px; height: 46px; border-radius: 10px; background: var(--accent-soft); color: var(--accent-text); line-height: 1.1; }
  .date b { font-size: 16px; }
  .date small { font-size: 9px; font-weight: 700; text-transform: uppercase; }
  .mini-text { display: grid; gap: 3px; min-width: 0; }
  .mini-text strong { display: -webkit-box; overflow: hidden; font-size: 12px; line-height: 1.35; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; }
  .mini-text small { overflow: hidden; color: var(--muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
  .mini:hover strong { color: var(--accent-text); }
  .cat-list { display: grid; gap: 4px; }
  .cat-list button { display: flex; align-items: center; justify-content: space-between; padding: 9px 10px; border: 0; border-radius: 8px; background: transparent; color: var(--text-2); font-size: 12px; text-align: left; cursor: pointer; }
  .cat-list button:hover { background: var(--surface-3); }
  .cat-list button.chosen { background: var(--accent-soft); color: var(--accent-text); font-weight: 700; }
  .cat-list small { color: var(--muted); font-size: 11px; }
  .all-link { display: flex; justify-content: space-between; padding: 13px 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); color: var(--accent-text); font-size: 12px; font-weight: 700; text-decoration: none; }

  .toast { position: fixed; left: 50%; bottom: 26px; z-index: 90; transform: translateX(-50%); padding: 11px 18px; border-radius: 10px; background: var(--text); color: var(--bg); font-size: 12px; font-weight: 600; box-shadow: 0 10px 30px #0004; }

  @media (max-width: 1080px) {
    .layout { grid-template-columns: minmax(0, 680px); }
    .side { display: none; }
  }
  @media (max-width: 720px) {
    .tabbar { top: 70px; }
    .post { padding: 14px; border-radius: 14px; }
    .post-text h3 { font-size: 16px; }
  }
</style>
