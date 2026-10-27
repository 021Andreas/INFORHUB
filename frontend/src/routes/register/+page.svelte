
<script lang="ts">
  import Brand from "#lib/components/Brand.svelte";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { api } from "#lib/api.js";

  let name = $state("");
  let email = $state("");
  let password = $state("");
  let confirmPassword = $state("");
  let showPassword = $state(false);
  let error = $state("");

  onMount(async () => {
    try {
      const result = await api<{ user: { role: string } }>("/api/auth/me");
      goto(result.user.role === "mahasiswa" ? "/" : "/admin");
    } catch {
      // Belum login; formulir pendaftaran tetap ditampilkan.
    }
  });

  async function handleRegister(event: SubmitEvent) {
    event.preventDefault();
    error = "";

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      error = "Semua kolom wajib diisi.";
      return;
    }

    if (password.length < 8) {
      error = "Password minimal 8 karakter.";
      return;
    }

    if (password !== confirmPassword) {
      error = "Konfirmasi password tidak cocok.";
      return;
    }

    try {
      await api("/api/auth/register", {
        method: "POST",
        body: { name, email, password }
      });
      goto("/");
    } catch (e) {
      error = e instanceof Error ? e.message : "Registrasi gagal.";
    }
  }
</script>

<svelte:head>
  <title>Daftar — INFORHUB</title>
  <meta name="description" content="Buat akun peserta INFORHUB." />
</svelte:head>

<main class="auth-page">
  <Brand />

  <section class="auth-card">
    <h1>Buat akun baru</h1>
    <p class="subtitle">
      Daftar untuk mengikuti acara, mencatat kehadiran,
      dan mendapatkan sertifikat.
    </p>

    <form onsubmit={handleRegister}>
      <label for="name">Nama lengkap</label>
      <input
        id="name"
        type="text"
        bind:value={name}
        placeholder="Nama sesuai identitas"
        autocomplete="name"
        maxlength="100"
        required
      />

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
          placeholder="Minimal 8 karakter"
          autocomplete="new-password"
          minlength="8"
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

      <label for="confirm">Konfirmasi password</label>
      <input
        id="confirm"
        type={showPassword ? "text" : "password"}
        bind:value={confirmPassword}
        placeholder="Ulangi password"
        autocomplete="new-password"
        required
      />

      {#if error}
        <p class="error" role="alert">{error}</p>
      {/if}

      <button class="submit" type="submit">Buat Akun</button>
    </form>

    <p class="switch">
      Sudah punya akun?
      <a href="/login">Masuk</a>
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
    padding: 28px 18px 18px}

  .brand img { display:block; width:220px; max-width:80vw; height:auto; object-fit:contain}
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text);
    text-decoration: none;
    font-size: 23px;
    font-weight: 850}

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
    max-width: 440px;
    margin: 30px 0;
    padding: 29px 32px;
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
    font-size: 27px}

  .eyebrow {
    margin-top: 20px;
    color: var(--accent-text);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.4px}

  h1 { margin: 8px 0; font-size: 26px}
  .subtitle { margin: 0 0 20px; color: var(--muted); font-size: 12px; line-height: 1.8}

  form { display: flex; flex-direction: column; gap: 9px}
  label { margin-top: 5px; color: var(--text); font-size: 12px; font-weight: 650}

  input:not([type="checkbox"]) {
    width: 100%;
    min-width: 0;
    padding: 11px 13px;
    border: 1px solid var(--border-strong);
    border-radius: 8px;
    outline: none;
    background: var(--surface-2);
    color: var(--text);
    font-size: 12px}

  input:focus { border-color: var(--accent)}
  input::placeholder { color: var(--muted)}

  .password-field { position: relative; display: flex; align-items: center}
  .password-field input { padding-right: 78px !important}
  .show-password {
    position: absolute;
    right: 10px;
    border: 0;
    background: transparent;
    color: var(--accent-text);
    font-size: 11px;
    cursor: pointer}

  .terms {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin: 12px 0;
    color: var(--text-2);
    font-size: 11px;
    font-weight: 400;
    line-height: 1.7}

  .terms input {
    flex-shrink: 0;
    margin-top: 3px;
    accent-color: var(--accent)}

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
  .switch { margin: 21px 0 0; color: var(--muted); text-align: center; font-size: 12px}
  .switch a { margin-left: 4px; color: var(--accent-text); font-weight: 700; text-decoration: none}
  footer { margin-top: auto; padding: 10px 0; color: var(--muted); font-size: 10px}

  @media (max-width: 480px) {
    .auth-page { padding: 22px 14px}
    .auth-card { margin: 24px 0; padding: 23px}
    h1 { font-size: 23px}
  }
</style>
