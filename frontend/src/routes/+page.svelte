
<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "#lib/api.js";

  type EventItem = {
    id: number;
    title: string;
    description: string;
    organizer: string;
    category: string;
    date: string;
    time: string;
    location: string;
    posterUrl: string;
    registered: number;
    quota: number;
    status: string;
  };

  let searchQuery = $state("");
  let activeCategory = $state("Semua");
  let notice = $state(false);

  // Bentuk data dari GET /api/events
  type ApiEvent = {
    id: number;
    title: string;
    posterUrl: string | null;
    categoryId: number | null;
    startAt: string;
    location: string;
    quota: number;
    registered: number;
  };

  let events = $state<EventItem[]>([]);

  // Backend belum mengirim description, organizer, dan nama kategori,
  // jadi untuk sementara memakai nilai bawaan.
  function toEventItem(e: ApiEvent): EventItem {
    const start = new Date(e.startAt);
    return {
      id: e.id,
      title: e.title,
      description: "",
      organizer: "Penyelenggara",
      category: "Umum",
      date: start.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
      time: start.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      location: e.location,
      posterUrl: e.posterUrl ?? "",
      registered: e.registered,
      quota: e.quota,
      status: "Pendaftaran dibuka"
    };
  }

  onMount(async () => {
    try {
      const data = await api<ApiEvent[]>("/api/events");
      events = data.map(toEventItem);
    } catch (e) {
      console.error("Gagal memuat acara:", e);
    }
  });

  const categories = [
    "Semua",
    "Seminar",
    "Workshop",
    "Kompetisi",
    "Webinar"
  ];

  let filteredEvents = $derived(
    events.filter((event) => {
      const query = searchQuery.trim().toLowerCase();

      const matchesSearch =
        !query ||
        `${event.title} ${event.description} ${event.organizer} ${event.category}`
          .toLowerCase()
          .includes(query);

      const matchesCategory =
        activeCategory === "Semua" ||
        event.category === activeCategory;

      return matchesSearch && matchesCategory;
    })
  );
</script>

<svelte:head>
  <title>INFORHUB — Temukan Acara</title>
  <meta
    name="description"
    content="Temukan acara, seminar, workshop, dan kompetisi."
  />
</svelte:head>

<div class="app">
  <header class="topbar">
    <a href="/" class="brand">
      <span class="logo">▦</span>
      <span>INFOR<span class="blue">HUB</span>
        <small>Event Information Hub</small>
      </span>
    </a>

    <input
      class="search"
      type="search"
      placeholder="Cari acara, topik, atau penyelenggara..."
      bind:value={searchQuery}
      aria-label="Cari acara"
    />

    <div class="account-actions">
      <a href="/login" class="login">Masuk</a>
      <a href="/register" class="register">Daftar</a>
    </div>
  </header>

  <aside class="sidebar">
    <p class="label">MENU</p>
    <a class="nav active" href="/">⌂ <span>Home</span></a>
    <a class="nav" href="/acara">▦ <span>Acara</span></a>
    <a class="nav" href="/pendaftaran">▤ <span>Pendaftaran Saya</span></a>
    <a class="nav" href="/sertifikat">♙ <span>Sertifikat</span></a>

    <hr />

    <p class="label">INFORMASI</p>
    <a class="nav" href="/bantuan">? <span>Bantuan</span></a>
    <a class="nav" href="/tentang">ⓘ <span>Tentang INFORHUB</span></a>

    <div class="sidebar-bottom">
      <div class="logo">▦</div>
      <strong>INFORHUB</strong>
      <p>Temukan kegiatan, perluas wawasan, dan raih pengalaman baru.</p>
    </div>
  </aside>

  <main class="feed">
    <div class="heading">
      <p class="eyebrow">EVENT DISCOVERY</p>
      <h1>Temukan Acara</h1>
      <p>Informasi kegiatan dan kesempatan baru dari berbagai penyelenggara.</p>
    </div>

    <div class="tabs">
      <span class="tab-active">Untuk kamu</span>
      <span>Terbaru</span>
    </div>

    <div class="categories">
      {#each categories as category}
        <button
          class:chosen={activeCategory === category}
          onclick={() => activeCategory = category}
        >
          {category}
        </button>
      {/each}
    </div>

    {#if notice}
      <div class="notice">
        Publikasi acara hanya tersedia untuk admin.
        <button onclick={() => notice = false}>Tutup</button>
      </div>
    {/if}

    {#if filteredEvents.length === 0}
      <section class="empty">
        <div class="empty-icon">▦</div>
        <h2>
          {searchQuery || activeCategory !== "Semua"
            ? "Acara tidak ditemukan"
            : "Belum ada acara"}
        </h2>
        <p>
          {searchQuery || activeCategory !== "Semua"
            ? "Coba kata kunci atau kategori lain."
            : "Acara yang diterbitkan oleh admin akan muncul di sini."}
        </p>

        {#if searchQuery || activeCategory !== "Semua"}
          <button onclick={() => {
            searchQuery = "";
            activeCategory = "Semua";
          }}>
            Reset filter
          </button>
        {/if}
      </section>
    {:else}
      {#each filteredEvents as event (event.id)}
        <article class="event-card">
          <div class="organizer">
            <div class="avatar">
              {event.organizer.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <strong>{event.organizer}</strong>
              <small>Penyelenggara · {event.category}</small>
            </div>
            <span class="admin-badge">ADMIN</span>
          </div>

          <div class="poster">
            {#if event.posterUrl}
              <img src={event.posterUrl} alt={`Pamflet ${event.title}`} />
            {:else}
              <div class="poster-placeholder">
                <span>PAMFLET ACARA</span>
                <h2>{event.title}</h2>
              </div>
            {/if}
          </div>

          <div class="event-info">
            <span class="event-category">{event.category}</span>
            <h2>{event.title}</h2>
            <p>{event.description}</p>
            <p>▦ {event.date} · {event.time}</p>
            <p>⌖ {event.location}</p>

            <div class="quota">
              <span>Kuota peserta</span>
              <strong>{event.registered} / {event.quota}</strong>
            </div>

            <div class="progress">
              <span
                style={`width:${event.quota > 0
                  ? Math.min(100, event.registered / event.quota * 100)
                  : 0}%`}
              ></span>
            </div>

            <p class="status">{event.status}</p>
            <a class="detail-button" href={`/acara/${event.id}`}>
              Lihat Detail Acara →
            </a>
          </div>

          <div class="event-actions">
            <span>♡ Suka</span>
            <a href={`/acara/${event.id}`}>▢ Detail</a>
            <span>↗ Bagikan</span>
          </div>
        </article>
      {/each}
    {/if}

    <footer>© 2026 INFORHUB · Event Information Hub</footer>
  </main>

  <aside class="rightbar">
    <section class="side-card">
      <div class="card-heading">
        <h3>Acara Mendatang</h3>
        <a href="/acara">Lihat semua</a>
      </div>

      {#if events.length === 0}
        <p class="muted">Belum ada acara mendatang.</p>
      {:else}
        {#each events as event (event.id)}
          <a class="upcoming" href={`/acara/${event.id}`}>
            <span class="mini-poster">▦</span>
            <span>
              <strong>{event.title}</strong>
              <small>{event.date}</small>
              <small>{event.registered}/{event.quota} peserta</small>
            </span>
          </a>
        {/each}
      {/if}
    </section>

    <section class="side-card">
      <h3>Kategori Acara</h3>
      {#each categories.slice(1) as category, i}
        <button
          class="topic"
          onclick={() => activeCategory = category}
        >
          <span class="topic-number">0{i + 1}</span>
          <strong>{category}</strong>
          <span>›</span>
        </button>
      {/each}
    </section>

    <section class="join-card">
      <p class="eyebrow">JANGAN KETINGGALAN</p>
      <h2>Temukan acara yang cocok untukmu.</h2>
      <p>Buat akun untuk mendaftar kegiatan dan mengakses sertifikat.</p>
      <a href="/register" class="register join-button">Buat Akun</a>
    </section>
  </aside>
</div>

<style>
  :global(*) { box-sizing: border-box; }

  :global(body) {
    margin: 0;
    background: #0d1117;
    color: #e6edf3;
    font-family: Inter, "Segoe UI", sans-serif;
    font-size: 14px;
  }

  :global(button), :global(input) { font: inherit; }
  :global(button) { cursor: pointer; }

  .app {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 220px minmax(0, 800px) 270px;
    grid-template-rows: 72px 1fr;
    justify-content: center;
  }

  .topbar {
    grid-column: 1 / -1;
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 28px;
    padding: 0 24px;
    border-bottom: 1px solid #25303b;
    background: #0d1117;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 275px;
    color: white;
    text-decoration: none;
    font-size: 22px;
    font-weight: 850;
  }

  .brand small {
    display: block;
    margin-top: 4px;
    color: #96a4b3;
    font-size: 10px;
    font-weight: 400;
  }

  .logo {
    display: grid;
    place-items: center;
    width: 39px;
    height: 39px;
    border-radius: 9px;
    background: #287cf0;
    color: white;
    font-size: 24px;
  }

  .blue { color: #4898ff; }

  .search {
    flex: 1;
    min-width: 0;
    padding: 12px 15px;
    border: 1px solid #293847;
    border-radius: 9px;
    outline: none;
    background: #18222d;
    color: white;
  }

  .account-actions { display: flex; gap: 9px; }
  .login, .register {
    padding: 11px 17px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 700;
    white-space: nowrap;
  }
  .login { color: #e6edf3; border: 1px solid #304050; }
  .register { color: white; background: #287cf0; }

  .sidebar {
    position: sticky;
    top: 72px;
    height: calc(100vh - 72px);
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 25px 12px;
    border-right: 1px solid #25303b;
  }

  .label, .eyebrow {
    color: #65aaff;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.3px;
  }
  .label { margin: 0 12px 8px; color: #748494; }

  .nav {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 12px;
    border-radius: 8px;
    color: #bdc8d4;
    text-decoration: none;
  }
  .nav:hover, .nav.active { background: #172b43; color: #65aaff; }
  .nav { font-size: 19px; }
  .nav span { font-size: 13px; }
  .sidebar hr { width: 100%; margin: 15px 0; border: 0; border-top: 1px solid #25303b; }

  .sidebar-bottom {
    margin-top: auto;
    padding: 14px;
    border: 1px solid #25303b;
    border-radius: 10px;
    background: #121a23;
  }
  .sidebar-bottom strong { display: block; margin-top: 10px; }
  .sidebar-bottom p { color: #98a6b5; font-size: 11px; line-height: 1.7; }

  .feed { min-width: 0; padding: 28px 20px 45px; }
  .heading h1 { margin: 8px 0; font-size: 27px; }
  .heading p:last-child { color: #98a6b5; font-size: 12px; line-height: 1.6; }

  .tabs {
    display: flex;
    align-items: center;
    gap: 23px;
    margin-top: 23px;
    border-bottom: 1px solid #25303b;
  }
  .tabs span { padding: 13px 2px; color: #aab7c5; }
  .tabs .tab-active { border-bottom: 2px solid #398bff; color: white; }
  .tabs button {
    margin-left: auto;
    border: 0;
    background: none;
    color: #65aaff;
  }

  .categories { display: flex; gap: 8px; overflow-x: auto; padding: 14px 0; }
  .categories button {
    padding: 7px 12px;
    border: 1px solid #2b3948;
    border-radius: 20px;
    background: #131c25;
    color: #a9b6c4;
    white-space: nowrap;
  }
  .categories button.chosen { background: #172c42; border-color: #347fce; color: #7ebaff; }

  .notice {
    margin: 12px 0;
    padding: 13px;
    border: 1px solid #315b85;
    border-radius: 8px;
    background: #14273a;
  }
  .notice button { float: right; border: 0; background: none; color: white; }

  .event-card, .side-card, .join-card, .empty {
    margin-bottom: 15px;
    overflow: hidden;
    border: 1px solid #253443;
    border-radius: 11px;
    background: #121a23;
  }

  .organizer { display: flex; align-items: center; gap: 10px; padding: 14px; }
  .avatar {
    display: grid;
    place-items: center;
    width: 37px;
    height: 37px;
    border-radius: 50%;
    background: #1c3d61;
    color: #a7d2ff;
    font-weight: 800;
  }
  .organizer small { display: block; margin-top: 4px; color: #8797a7; font-size: 10px; }
  .admin-badge { margin-left: auto; color: #72b6ff; font-size: 9px; font-weight: 800; }

  .poster { margin: 0 14px; overflow: hidden; border-radius: 8px; }
  .poster img { display: block; width: 100%; max-height: 460px; object-fit: contain; background: #080d13; }
  .poster-placeholder {
    display: flex;
    min-height: 280px;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 25px;
    background: linear-gradient(145deg, #06182f, #0b3b70, #071426);
    color: white;
    text-align: center;
  }
  .poster-placeholder span { color: #80bdff; font-size: 10px; letter-spacing: 2px; }
  .poster-placeholder h2 { font-size: 30px; }

  .event-info { padding: 17px; }
  .event-category { color: #69afff; font-size: 10px; font-weight: 800; text-transform: uppercase; }
  .event-info h2 { margin: 8px 0; font-size: 19px; }
  .event-info p { color: #b1bdc9; font-size: 12px; line-height: 1.7; }
  .quota { display: flex; justify-content: space-between; color: #98a6b5; font-size: 11px; }
  .quota strong { color: white; }
  .progress { height: 5px; margin-top: 8px; overflow: hidden; border-radius: 8px; background: #293746; }
  .progress span { display: block; height: 100%; background: #398bff; }
  .status { color: #63dda7 !important; }
  .detail-button { display: block; margin-top: 15px; padding: 12px; border-radius: 8px; background: #287cf0; color: white; text-align: center; text-decoration: none; font-weight: 700; }

  .event-actions { display: flex; justify-content: space-around; padding: 13px; border-top: 1px solid #25313c; color: #9ba9b7; font-size: 11px; }
  .event-actions a { color: inherit; text-decoration: none; }

  .empty { padding: 55px 20px; text-align: center; }
  .empty-icon { color: #65aaff; font-size: 36px; }
  .empty p { color: #98a6b5; font-size: 12px; line-height: 1.7; }
  .empty button { padding: 9px 13px; border: 0; border-radius: 7px; background: #287cf0; color: white; }

  .rightbar { padding: 28px 15px 35px 0; }
  .side-card, .join-card { padding: 17px; }
  .card-heading { display: flex; justify-content: space-between; gap: 8px; }
  .card-heading h3, .side-card h3 { margin-top: 0; font-size: 13px; }
  .card-heading a { color: #65aaff; font-size: 10px; text-decoration: none; }
  .muted { color: #8797a7; font-size: 11px; line-height: 1.7; }
  .upcoming { display: flex; gap: 10px; padding: 12px 0; border-top: 1px solid #25313c; color: white; text-decoration: none; }
  .mini-poster { display: grid; place-items: center; width: 48px; height: 58px; flex-shrink: 0; border-radius: 6px; background: #0b3b70; color: #7bc0ff; font-size: 24px; }
  .upcoming strong, .upcoming small { display: block; margin-bottom: 5px; font-size: 10px; }
  .upcoming small { color: #9aa9b8; }
  .topic { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 0; border: 0; border-top: 1px solid #25313c; background: none; color: #dce7f2; text-align: left; }
  .topic-number { color: #65aaff; }
  .topic strong { flex: 1; }
  .join-card { background: linear-gradient(145deg, #172b40, #111a25); }
  .join-card h2 { font-size: 18px; line-height: 1.4; }
  .join-card p { color: #a8b7c6; font-size: 11px; line-height: 1.7; }
  .join-button { display: block; margin-top: 15px; text-align: center; }

  footer { padding: 22px 0; color: #667484; text-align: center; font-size: 10px; }

  @media (max-width: 1200px) {
    .app { grid-template-columns: 200px minmax(0, 800px); }
    .rightbar { display: none; }
  }

  @media (max-width: 720px) {
    .app { display: block; padding-bottom: 65px; }
    .topbar { height: 62px; gap: 10px; padding: 0 10px; }
    .brand { width: auto; font-size: 16px; }
    .brand .logo { width: 30px; height: 30px; font-size: 19px; }
    .brand small { font-size: 8px; }
    .search { max-width: 160px; padding: 9px; font-size: 11px; }
    .login { display: none; }
    .register { padding: 9px; font-size: 11px; }
    .sidebar {
      position: fixed;
      z-index: 10;
      top: auto;
      bottom: 0;
      width: 100%;
      height: 62px;
      flex-direction: row;
      justify-content: space-around;
      padding: 5px;
      border-top: 1px solid #25303b;
      background: #0d1117;
    }
    .sidebar .label, .sidebar hr, .sidebar-bottom { display: none; }
    .nav { flex: 1; flex-direction: column; justify-content: center; gap: 3px; padding: 4px 0; font-size: 17px; }
    .nav span { font-size: 9px; }
    .feed { padding: 22px 10px; }
    .heading h1 { font-size: 24px; }
    .heading p:last-child { font-size: 11px; }
    .tabs { gap: 13px; }
    .tabs span, .tabs button { font-size: 10px; }
    .event-info h2 { font-size: 17px; }
    .poster-placeholder { min-height: 230px; }
    .poster-placeholder h2 { font-size: 25px; }
  }
</style>
