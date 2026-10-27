
<script lang="ts">
  import Brand from "#lib/components/Brand.svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { api } from "#lib/api.js";

  let email = $state("");
  let password = $state("");
  let showPassword = $state(false);
  let error = $state("");

  onMount(async () => {
    try {
      const result = await api<{ user: { role: string } }>("/api/auth/me");
      const redirect = page.url.searchParams.get("redirect");
      goto(redirect?.startsWith("/") && !redirect.startsWith("//")
        ? redirect
        : result.user.role === "mahasiswa" ? "/" : "/admin");
    } catch {
      // Belum login; formulir tetap ditampilkan.
    }
  });

  async function handleLogin(event: SubmitEvent) {
    event.preventDefault();
    error = "";

    if (!email.trim() || !password) {
      error = "Email dan password wajib diisi.";
      return;
    }

    try {
      const { user } = await api<{ user: { role: string } }>("/api/auth/login", {
        method: "POST",
        body: { email, password }
      });
      const redirect = page.url.searchParams.get("redirect");
      goto(redirect?.startsWith("/") && !redirect.startsWith("//")
        ? redirect
        : user.role === "mahasiswa" ? "/" : "/admin");
    } catch (e) {
      error = e instanceof Error ? e.message : "Gagal masuk.";
    }
  }
</script>

<svelte:head>
  <title>Masuk — INFORHUB</title>
  <meta name="description" content="Masuk ke akun INFORHUB." />
</svelte:head>

<main class="auth-page">
  <Brand />

  <section class="auth-card">
    <h1>Masuk ke akunmu</h1>
    <p class="subtitle">
      Masuk untuk mendaftar acara dan mengakses sertifikatmu.
    </p>

    <form onsubmit={handleLogin}>
      <label for="email">Email</label>
      <input
        id="email"
        type="email"
        bind:value={email}
        placeholder="nama@email.com"
        autocomplete="email"
        required
      />

      <label for="password">Password</label>
      <div class="password-field">
        <input
          id="password"
          type={showPassword ? "text" : "password"}
          bind:value={password}
          placeholder="Masukkan password"
          autocomplete="current-password"
          required
        />
        <button
          type="button"
          class="show-password"
          onclick={() => showPassword = !showPassword}
        >
          {showPassword ? "Sembunyikan" : "Lihat"}
        </button>
      </div>

      <div class="form-options">
        <span>Gunakan akun INFORHUB terdaftar</span>
      </div>

      {#if error}
        <p class="error" role="alert">{error}</p>
      {/if}

      <button class="submit" type="submit">Masuk</button>
    </form>

    <p class="switch">
      Belum punya akun?
      <a href="/register">Daftar sekarang</a>
    </p>
  </section>

  <footer>© 2026 INFORHUB · Event Information Hub</footer>
</main>

<style>
  :global(*) { box-sizing: border-box}
  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: Inter, "Segoe UI", sans-serif}
  :global(input), :global(button) { font: inherit}

  .auth-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 35px 18px 20px}

  .brand img { display:block; width:220px; max-width:80vw; height:auto; object-fit:contain}
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text);
    text-decoration: none;
    font-size: 23px;
    font-weight: 850;
    letter-spacing: -.5px}

  .logo {
    display: grid;
    place-items: center;
    width: 39px;
    height: 39px;
    border-radius: 10px;
    background: var(--accent);
    color: white;
    font-size: 24px}

  .blue { color: var(--accent-text)}

  .auth-card {
    width: 100%;
    max-width: 420px;
    margin: 55px 0 35px;
    padding: 32px;
    border: 1px solid var(--border);
    border-radius: 15px;
    background: var(--surface)}

  .symbol {
    display: grid;
    place-items: center;
    width: 43px;
    height: 43px;
    border: 1px solid var(--accent);
    border-radius: 11px;
    background: var(--surface-3);
    color: var(--accent-text);
    font-size: 25px}

  .eyebrow {
    margin-top: 24px;
    color: var(--accent-text);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.4px}

  h1 { margin: 9px 0; font-size: 27px; letter-spacing: -.6px}
  .subtitle { margin: 0 0 27px; color: var(--muted); font-size: 12px; line-height: 1.8}

  form { display: flex; flex-direction: column; gap: 10px}
  label { margin-top: 6px; color: var(--text); font-size: 12px; font-weight: 650}

  input {
    width: 100%;
    min-width: 0;
    padding: 12px 13px;
    border: 1px solid var(--border-strong);
    border-radius: 8px;
    outline: none;
    background: var(--surface-2);
    color: var(--text);
    font-size: 12px}

  input:focus { border-color: var(--accent)}
  input::placeholder { color: var(--muted)}

  .password-field { position: relative; display: flex; align-items: center}
  .password-field input { padding-right: 76px}
  .show-password {
    position: absolute;
    right: 10px;
    border: 0;
    background: transparent;
    color: var(--accent-text);
    font-size: 11px}

  .form-options {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin: 4px 0 10px;
    color: var(--muted);
    font-size: 10px}

  a { color: var(--accent-text); text-decoration: none}
  a:hover { text-decoration: underline}

  .submit {
    padding: 13px;
    border: 0;
    border-radius: 8px;
    background: var(--accent);
    color: white;
    font-size: 13px;
    font-weight: 750;
    cursor: pointer}

  .submit:hover { background: var(--accent)}
  .error { color: var(--err-text); font-size: 11px; line-height: 1.6}
  .switch { margin: 23px 0 0; color: var(--muted); text-align: center; font-size: 12px}
  .switch a { margin-left: 4px; font-weight: 700}
  footer { margin-top: auto; padding: 25px 0 5px; color: var(--muted); font-size: 10px}

  @media (max-width: 480px) {
    .auth-page { padding: 25px 14px 15px}
    .auth-card { margin-top: 35px; padding: 23px}
    h1 { font-size: 24px}
  }
</style>
