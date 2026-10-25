
<script lang="ts">
  import { page } from '$app/state';
  let { children } = $props();
  let sidebarOpen = $state(false);

  const navGroups = [
    {
      label: 'MENU UTAMA',
      items: [
        { label: 'Dashboard', href: '/admin', icon: '▦' },
        { label: 'Kelola Acara', href: '/admin/acara', icon: '▣' },
        { label: 'Peserta', href: '/admin/peserta', icon: '♙' },
        { label: 'Absensi QR', href: '/admin/absensi', icon: '▦' },
        { label: 'Sertifikat', href: '/admin/sertifikat', icon: '◇' }
      ]
    },
    {
      label: 'PENGELOLAAN',
      items: [
        { label: 'Pengguna', href: '/admin/pengguna', icon: '♧' },
        { label: 'Pengaturan', href: '/admin/pengaturan', icon: '⚙' }
      ]
    }
  ];

  let currentTitle = $derived(
    navGroups.flatMap((group) => group.items).find(
      (item) => item.href === page.url.pathname
    )?.label ?? 'Dashboard'
  );

  function isActive(href: string) {
    if (href === '/admin') return page.url.pathname === '/admin';
    return page.url.pathname === href ||
      page.url.pathname.startsWith(`${href}/`);
  }
</script>

<svelte:head>
  <title>{currentTitle} | INFORHUB Admin</title>
  <meta
    name="description"
    content="Panel administrasi INFORHUB untuk mengelola informasi dan pendaftaran acara."
  />
</svelte:head>

<div class="admin-shell">
  {#if sidebarOpen}
    <button
      class="sidebar-overlay"
      aria-label="Tutup navigasi"
      onclick={() => sidebarOpen = false}
    ></button>
  {/if}

  <aside class:mobile-open={sidebarOpen} class="sidebar">
    <a href="/admin" class="brand" onclick={() => sidebarOpen = false}>
      <span class="brand-icon">▦</span>
      <span class="brand-copy">
        <strong>INFOR<span>HUB</span></strong>
        <small>Event Information Hub</small>
      </span>
    </a>

    <div class="nav-content">
      {#each navGroups as group}
        <div class="nav-group">
          <p class="group-label">{group.label}</p>

          {#each group.items as item}
            <a
              href={item.href}
              class:active={isActive(item.href)}
              class="nav-item"
              onclick={() => sidebarOpen = false}
            >
              <span class="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {#if isActive(item.href)}
                <span class="active-indicator"></span>
              {/if}
            </a>
          {/each}
        </div>
      {/each}

      <div class="nav-group">
        <p class="group-label">LAINNYA</p>
        <a href="/" class="nav-item">
          <span class="nav-icon">↗</span>
          <span>Lihat Situs</span>
        </a>
      </div>
    </div>

    <div class="sidebar-footer">
      <div class="footer-icon">▦</div>
      <div>
        <strong>INFORHUB Admin</strong>
        <p>Kelola acara dan peserta dengan mudah.</p>
      </div>
    </div>
  </aside>

  <div class="main-area">
    <header class="topbar">
      <button
        class="menu-toggle"
        aria-label="Buka navigasi"
        onclick={() => sidebarOpen = !sidebarOpen}
      >
        ☰
      </button>

      <div class="mobile-brand">INFOR<span>HUB</span></div>

      <div class="search-box">
        <span>⌕</span>
        <input
          type="search"
          placeholder="Cari acara, peserta, atau kata kunci..."
          aria-label="Cari acara atau peserta"
        />
      </div>

      <div class="topbar-right">
        <button class="notification" aria-label="Notifikasi">
          ♧
          <span></span>
        </button>

        <div class="profile">
          <div class="avatar">A</div>
          <div class="profile-copy">
            <strong>Administrator</strong>
            <small>Admin</small>
          </div>
          <span class="chevron">⌄</span>
        </div>
      </div>
    </header>

    <main class="page-content">
      {@render children()}
    </main>
  </div>
</div>

<style>
  :global(*) { box-sizing: border-box; }

  :global(body) {
    margin: 0;
    background: #080f18;
    color: #e7edf7;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }

  :global(a) { color: inherit; text-decoration: none; }
  :global(button), :global(input) { font: inherit; }

  .admin-shell {
    min-height: 100vh;
    background: #080f18;
  }

  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 30;
    width: 248px;
    display: flex;
    flex-direction: column;
    background: #0b131e;
    border-right: 1px solid #1b2939;
  }

  .brand {
    height: 76px;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 0 20px;
    border-bottom: 1px solid #1b2939;
  }

  .brand-icon, .footer-icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 39px;
    height: 39px;
    color: #fff;
    background: #237cf4;
    border-radius: 10px;
    font-size: 26px;
  }

  .brand-copy { display: grid; gap: 2px; }
  .brand-copy strong { font-size: 21px; letter-spacing: -.7px; }
  .brand-copy strong span, .mobile-brand span { color: #3890ff; }
  .brand-copy small { color: #8fa0b6; font-size: 10px; }

  .nav-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px 12px;
  }

  .nav-group { margin-bottom: 24px; }
  .group-label {
    margin: 0 10px 11px;
    color: #8b9db4;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
  }

  .nav-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 43px;
    margin-bottom: 4px;
    padding: 10px 12px;
    border-radius: 8px;
    color: #b8c5d7;
    font-size: 13px;
    transition: background .15s, color .15s;
  }

  .nav-item:hover { background: #132237; color: white; }
  .nav-item.active { background: #122b4d; color: #4b9aff; }
  .nav-icon { width: 20px; text-align: center; font-size: 19px; }
  .active-indicator {
    position: absolute;
    left: -12px;
    top: 8px;
    bottom: 8px;
    width: 3px;
    border-radius: 0 4px 4px 0;
    background: #398cff;
  }

  .sidebar-footer {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 12px;
    padding: 14px 12px;
    border: 1px solid #223145;
    border-radius: 10px;
  }

  .footer-icon { width: 34px; height: 34px; font-size: 21px; }
  .sidebar-footer strong { font-size: 12px; }
  .sidebar-footer p {
    margin: 6px 0 0;
    color: #92a3b8;
    font-size: 11px;
    line-height: 1.5;
  }

  .main-area { min-height: 100vh; margin-left: 248px; }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    height: 76px;
    display: flex;
    align-items: center;
    gap: 22px;
    padding: 0 28px;
    background: #0b131eeb;
    border-bottom: 1px solid #1b2939;
    backdrop-filter: blur(14px);
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    max-width: 650px;
    height: 42px;
    padding: 0 14px;
    background: #131f2d;
    border: 1px solid #25354a;
    border-radius: 9px;
    color: #90a4bd;
  }

  .search-box > span { font-size: 25px; }
  .search-box input {
    width: 100%;
    border: 0;
    outline: 0;
    color: #edf4ff;
    background: transparent;
    font-size: 12px;
  }

  .search-box input::placeholder { color: #8b9bb0; }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-left: auto;
  }

  .notification {
    position: relative;
    width: 40px;
    height: 40px;
    border: 1px solid #2a3b50;
    border-radius: 10px;
    color: #d7e2f1;
    background: #101a27;
    cursor: pointer;
  }

  .notification span {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 7px;
    height: 7px;
    background: #ff6677;
    border-radius: 50%;
  }

  .profile { display: flex; align-items: center; gap: 10px; }
  .avatar {
    display: grid;
    place-items: center;
    width: 39px;
    height: 39px;
    border-radius: 50%;
    color: white;
    background: #317fe3;
    font-size: 18px;
  }

  .profile-copy { display: grid; gap: 4px; }
  .profile-copy strong { font-size: 12px; }
  .profile-copy small { color: #91a2b8; font-size: 11px; }
  .chevron { color: #9aabc0; }
  .page-content { padding: 26px 28px 40px; }
  .menu-toggle, .mobile-brand, .sidebar-overlay { display: none; }

  @media (max-width: 900px) {
    .sidebar { transform: translateX(-100%); transition: transform .2s; }
    .sidebar.mobile-open { transform: translateX(0); }
    .sidebar-overlay {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 25;
      background: #0009;
      border: 0;
    }
    .main-area { margin-left: 0; }
    .menu-toggle {
      display: block;
      border: 0;
      color: #e7edf7;
      background: transparent;
      font-size: 23px;
      cursor: pointer;
    }
    .mobile-brand { display: block; font-weight: 800; }
    .topbar { gap: 14px; padding: 0 18px; }
    .search-box { max-width: none; }
    .profile-copy, .chevron { display: none; }
    .page-content { padding: 22px 18px; }
  }

  @media (max-width: 520px) {
    .topbar { height: 65px; gap: 10px; }
    .mobile-brand { font-size: 13px; }
    .search-box { height: 37px; padding: 0 8px; }
    .search-box input { font-size: 11px; }
    .topbar-right { gap: 9px; }
    .notification { width: 34px; height: 34px; }
    .avatar { width: 32px; height: 32px; }
    .page-content { padding: 18px 12px; }
  }
</style>
