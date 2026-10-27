
<script lang="ts">
  import './layout.css';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { api } from '#lib/api.js';
  import Brand from '#lib/components/Brand.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import ThemeToggle from '#lib/components/ThemeToggle.svelte';
  import { theme } from '#lib/theme.svelte.js';
  import type { LayoutProps } from './$types';

  let { children }: LayoutProps = $props();

  let user = $state<{ name: string; role: string; email?: string } | null>(null);
  let checked = $state(false);
  let search = $state('');
  let mobileOpen = $state(false);
  let profileOpen = $state(false);

  const path = $derived(page.url.pathname);
  const isAdmin = $derived(path.startsWith('/admin'));
  const isAuth = $derived(path === '/login' || path === '/register');
  const publicPage = $derived(!isAdmin && !isAuth);

  const userInitial = $derived((user?.name ?? 'P').trim().charAt(0).toUpperCase());
  const roleLabel = $derived(
    user?.role === 'admin' ? 'Administrator' : user?.role === 'penyelenggara' ? 'Penyelenggara' : 'Mahasiswa'
  );

  onMount(async () => {
    theme.init();

    try {
      const r = await api<{ user: { name: string; role: string; email?: string } }>(
        '/api/auth/me'
      );
      user = r.user;
    } catch {
      user = null;
    } finally {
      checked = true;
    }
  });

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      // Tetap arahkan pengguna ke beranda jika logout API gagal.
    }

    user = null;
    profileOpen = false;
    await goto('/');
  }

  function submitSearch() {
    const q = search.trim();

    goto(q ? `/acara?q=${encodeURIComponent(q)}` : '/acara');
    mobileOpen = false;
  }

  function closeMenus() {
    profileOpen = false;
    mobileOpen = false;
  }
</script>

<svelte:head>
  <link rel="icon" href="/favicon.svg" />
  <meta name="theme-color" content="#f5f7fb" />
</svelte:head>

{#if publicPage}
  <div class="public-shell">
    <header class="public-header">
      <button
        class="mobile-menu icon-button"
        aria-label="Buka navigasi"
        aria-expanded={mobileOpen}
        onclick={() => (mobileOpen = !mobileOpen)}
      >
        <Icon name="menu" />
      </button>

      <Brand lightBackground />

      <form
        class="global-search"
        onsubmit={(e) => {
          e.preventDefault();
          submitSearch();
        }}
      >
        <Icon name="search" size={19} />
        <input
          bind:value={search}
          placeholder="Cari acara, topik, atau penyelenggara"
          aria-label="Cari acara"
        />
      </form>

      <div class="header-actions">
        <ThemeToggle />

        {#if user}
          <div class="profile-wrapper">
            <button
              type="button"
              class="profile-trigger"
              aria-label="Buka menu profil"
              aria-expanded={profileOpen}
              onclick={() => (profileOpen = !profileOpen)}
            >
              <span class="profile-avatar">{userInitial}</span>
              <span class="profile-copy">
                <strong>{user.name}</strong>
                <small>{roleLabel}</small>
              </span>
              <Icon name="chevron-down" size={16} />
            </button>

            {#if profileOpen}
              <button
                type="button"
                class="profile-dismiss"
                aria-label="Tutup menu profil"
                onclick={() => (profileOpen = false)}
              ></button>

              <div class="profile-menu">
                <div class="profile-info">
                  <div class="profile-avatar profile-avatar-large">
                    {userInitial}
                  </div>

                  <div class="profile-text">
                    <strong>{user.name}</strong>
                    <span>{user.email ?? roleLabel}</span>
                  </div>
                </div>

                <div class="profile-divider"></div>

                <a
                  href="/pendaftaran"
                  onclick={() => (profileOpen = false)}
                >
                  <Icon name="ticket" size={17} />
                  <span>Pendaftaran saya</span>
                </a>

                <a
                  href="/sertifikat"
                  onclick={() => (profileOpen = false)}
                >
                  <Icon name="certificate" size={17} />
                  <span>Sertifikat</span>
                </a>

                {#if ['admin', 'penyelenggara'].includes(user.role)}
                  <a href="/admin" onclick={() => (profileOpen = false)}>
                    <Icon name="settings" size={17} />
                    <span>Panel pengelola</span>
                  </a>
                {/if}

                <div class="profile-divider"></div>

                <button
                  type="button"
                  class="logout-button"
                  onclick={logout}
                >
                  <Icon name="logout" size={17} />
                  <span>Keluar</span>
                </button>
              </div>
            {/if}
          </div>
        {:else if checked}
          <a class="button button-quiet" href="/login">Masuk</a>
          <a class="button button-primary" href="/register">Buat akun</a>
        {/if}
      </div>
    </header>

    <div class="public-body">
      {#if mobileOpen}
        <button
          class="mobile-overlay"
          aria-label="Tutup navigasi"
          onclick={() => (mobileOpen = false)}
        ></button>
      {/if}

      <aside class:open={mobileOpen} class="public-sidebar">
        <p class="nav-label">JELAJAH</p>

        <a
          class:active={path === '/'}
          href="/"
          onclick={closeMenus}
        >
          <Icon name="home" />
          <span>Beranda</span>
        </a>

        <a
          class:active={path.startsWith('/acara')}
          href="/acara"
          onclick={closeMenus}
        >
          <Icon name="calendar" />
          <span>Acara</span>
        </a>

        <a
          class:active={path.startsWith('/pendaftaran')}
          href="/pendaftaran"
          onclick={closeMenus}
        >
          <Icon name="ticket" />
          <span>Pendaftaran saya</span>
        </a>

        <a
          class:active={path.startsWith('/absensi')}
          href="/absensi"
          onclick={closeMenus}
        >
          <Icon name="qr" />
          <span>Absensi QR</span>
        </a>

        <a
          class:active={path.startsWith('/sertifikat')}
          href="/sertifikat"
          onclick={closeMenus}
        >
          <Icon name="certificate" />
          <span>Sertifikat</span>
        </a>

        <div class="sidebar-separator"></div>

        <p class="nav-label">INFORMASI</p>

        <a href="/bantuan" onclick={closeMenus}>
          <Icon name="help" />
          <span>Bantuan</span>
        </a>

        <a href="/tentang" onclick={closeMenus}>
          <Icon name="info" />
          <span>Tentang INFORHUB</span>
        </a>

        {#if user && ['admin', 'penyelenggara'].includes(user.role)}
          <div class="sidebar-separator"></div>

          <a href="/admin" onclick={closeMenus}>
            <Icon name="settings" />
            <span>Panel pengelola</span>
          </a>
        {/if}

        <div class="sidebar-promo">
          <Brand compact lightBackground />
          <strong>Temukan kegiatan yang tepat.</strong>
          <p>
            Ikuti seminar, workshop, dan kegiatan Informatika.
          </p>
        </div>
      </aside>

      <main class="public-content">
        {@render children()}
      </main>
    </div>

    <footer class="public-footer">
      © {new Date().getFullYear()} INFORHUB · Event Information Hub
    </footer>
  </div>
{:else}
  {#if isAuth}
    <div class="auth-theme">
      <ThemeToggle />
    </div>
  {/if}

  {@render children()}
{/if}

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
      'Segoe UI', sans-serif;
  }

  :global(a) {
    color: inherit;
    text-decoration: none;
  }

  :global(button),
  :global(input),
  :global(select) {
    font: inherit;
  }

  .public-shell {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
  }

  .public-header {
    height: 82px;
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    align-items: center;
    gap: 30px;
    padding: 0 28px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    box-shadow: 0 3px 16px #172b4608;
  }

  .global-search {
    height: 46px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    max-width: 690px;
    margin: auto;
    padding: 0 15px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface-2);
    color: var(--muted);
  }

  .global-search input {
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text);
    font-size: 13px;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    white-space: nowrap;
  }

  .button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    min-height: 42px;
    padding: 0 16px;
    border-radius: 9px;
    font-size: 12px;
    font-weight: 650;
    cursor: pointer;
  }

  .button-primary {
    background: var(--accent);
    color: white;
    border: 1px solid var(--accent);
  }

  .button-quiet {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-2);
  }

  /* Avatar profil */
  .profile-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    z-index: 55;
  }

  .profile-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    padding: 0;
    border: 2px solid var(--border);
    border-radius: 50%;
    background: var(--accent);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      transform 0.2s ease;
  }

  .profile-avatar:hover {
    border-color: var(--accent);
    transform: scale(1.04);
  }

  .profile-avatar-large {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    cursor: default;
  }

  .profile-trigger {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 10px 4px 4px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: transparent;
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }

  .profile-trigger:hover,
  .profile-trigger[aria-expanded='true'] {
    border-color: var(--border);
    background: var(--surface-2);
  }

  .profile-trigger :global(svg) {
    color: var(--muted);
    transition: transform 0.18s ease;
  }

  .profile-trigger[aria-expanded='true'] :global(svg) {
    transform: rotate(180deg);
  }

  .profile-copy {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .profile-copy strong {
    max-width: 130px;
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-copy small {
    color: var(--muted);
    font-size: 10px;
  }

  @media (max-width: 900px) {
    .profile-copy,
    .profile-trigger :global(svg) {
      display: none;
    }

    .profile-trigger {
      padding: 0;
    }
  }

  .profile-dismiss {
    position: fixed;
    inset: 0;
    z-index: -1;
    width: 100%;
    height: 100%;
    border: 0;
    background: transparent;
  }

  .profile-menu {
    position: absolute;
    top: calc(100% + 12px);
    right: 0;
    z-index: 60;
    width: 250px;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 12px 32px #0002;
  }

  .profile-info {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
  }

  .profile-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .profile-text strong {
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-text span {
    color: var(--muted);
    font-size: 11px;
    text-transform: capitalize;
  }

  .profile-divider {
    height: 1px;
    margin: 9px 0;
    background: var(--border);
  }

  .profile-menu a,
  .profile-menu .logout-button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 11px 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
  }

  .profile-menu a:hover,
  .profile-menu .logout-button:hover {
    background: var(--accent-soft);
    color: var(--accent-text);
  }

  .profile-menu .logout-button {
    color: #dc5353;
  }

  .public-body {
    display: grid;
    grid-template-columns: 248px minmax(0, 1fr);
    min-height: calc(100vh - 130px);
  }

  .public-sidebar {
    position: sticky;
    top: 82px;
    height: calc(100vh - 82px);
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 27px 16px 18px;
    border-right: 1px solid var(--border);
    background: var(--surface);
    overflow: auto;
  }

  .nav-label {
    margin: 7px 12px 12px;
    color: var(--muted);
    font-size: 10px;
    font-weight: 750;
    letter-spacing: 1.1px;
  }

  .public-sidebar > a {
    display: flex;
    align-items: center;
    gap: 13px;
    min-height: 47px;
    padding: 0 13px;
    border: 1px solid transparent;
    border-radius: 9px;
    color: var(--muted);
    font-size: 13px;
  }

  .public-sidebar > a :global(svg) {
    color: var(--muted);
  }

  .public-sidebar > a.active {
    background: var(--accent-soft);
    border-color: var(--border);
    color: var(--accent-text);
  }

  .public-sidebar > a.active :global(svg) {
    color: var(--accent-text);
  }

  .sidebar-separator {
    height: 1px;
    margin: 15px 5px;
    background: var(--border);
  }

  .sidebar-promo {
    margin-top: auto;
    padding: 17px 15px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: linear-gradient(
      145deg,
      var(--accent-soft),
      var(--surface)
    );
  }

  .sidebar-promo :global(img) {
    width: 42px;
  }

  .sidebar-promo strong {
    display: block;
    margin-top: 15px;
    color: var(--text);
    font-size: 12px;
  }

  .sidebar-promo p {
    margin: 7px 0 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.6;
  }

  .public-content {
    min-width: 0;
    width: 100%;
    max-width: 1600px;
    margin: 0 auto;
    padding: 30px clamp(20px, 3vw, 42px) 50px;
  }

  .public-footer {
    padding: 16px 20px 20px;
    text-align: center;
    color: var(--muted);
    font-size: 11px;
  }

  .auth-theme {
    position: fixed;
    top: 14px;
    right: 14px;
    z-index: 60;
  }

  .mobile-menu,
  .mobile-overlay {
    display: none;
  }

  .icon-button {
    border: 0;
    background: transparent;
    color: var(--text-2);
  }

  @media (max-width: 1000px) {
    .public-header {
      gap: 15px;
      padding: 0 18px;
    }

    .public-header :global(.brand img) {
      width: 190px;
    }

    .public-body {
      grid-template-columns: 220px minmax(0, 1fr);
    }
  }

  @media (max-width: 720px) {
    .public-header {
      height: 70px;
      gap: 12px;
      padding: 0 14px;
    }

    .mobile-menu {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      flex-shrink: 0;
    }

    .public-header :global(.brand img) {
      width: 150px;
    }

    .global-search {
      height: 40px;
      max-width: none;
      margin: 0;
    }

    .global-search input {
      font-size: 11px;
    }

    .global-search input::placeholder {
      color: transparent;
    }

    .header-actions {
      gap: 8px;
    }

    .header-actions .button {
      min-height: 37px;
      padding: 0 10px;
      font-size: 11px;
    }

    .public-body {
      display: block;
      min-height: calc(100vh - 118px);
    }

    .public-sidebar {
      position: fixed;
      top: 70px;
      bottom: 0;
      left: 0;
      z-index: 50;
      width: 265px;
      height: auto;
      transform: translateX(-105%);
      transition: transform 0.2s ease;
      box-shadow: 18px 0 50px #0005;
    }

    .public-sidebar.open {
      transform: translateX(0);
    }

    .mobile-overlay {
      display: block;
      position: fixed;
      inset: 70px 0 0;
      z-index: 45;
      background: #10233d66;
      border: 0;
    }

    .public-content {
      padding: 24px 16px 36px;
    }

    .public-footer {
      font-size: 10px;
    }
  }
</style>
