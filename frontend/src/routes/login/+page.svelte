
<script lang="ts">
  import { goto } from "$app/navigation";
  import { api } from "#lib/api.js";

  let email = $state("");
  let password = $state("");
  let showPassword = $state(false);
  let error = $state("");

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
      goto(user.role === "mahasiswa" ? "/" : "/admin");
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
  <a class="brand" href="/">
    <span class="logo">▦</span>
    <span>INFOR<span class="blue">HUB</span></span>
  </a>

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
        <span>Gunakan akun terdaftar</span>
        <a href="/forgot-password">Lupa password?</a>
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
  :global(*) { box-sizing: border-box; }
  :global(body) {
    margin: 0;
    background: #0d1117;
    color: #e6edf3;
    font-family: Inter, "Segoe UI", sans-serif;
  }
  :global(input), :global(button) { font: inherit; }

  .auth-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 35px 18px 20px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    color: white;
    text-decoration: none;
    font-size: 23px;
    font-weight: 850;
    letter-spacing: -.5px;
  }

  .logo {
    display: grid;
    place-items: center;
    width: 39px;
    height: 39px;
    border-radius: 10px;
    background: #287cf0;
    color: white;
    font-size: 24px;
  }

  .blue { color: #4898ff; }

  .auth-card {
    width: 100%;
    max-width: 420px;
    margin: 55px 0 35px;
    padding: 32px;
    border: 1px solid #253443;
    border-radius: 15px;
    background: #121a23;
  }

  .symbol {
    display: grid;
    place-items: center;
    width: 43px;
    height: 43px;
    border: 1px solid #315a85;
    border-radius: 11px;
    background: #172b40;
    color: #72b6ff;
    font-size: 25px;
  }

  .eyebrow {
    margin-top: 24px;
    color: #65aaff;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.4px;
  }

  h1 { margin: 9px 0; font-size: 27px; letter-spacing: -.6px; }
  .subtitle { margin: 0 0 27px; color: #98a6b5; font-size: 12px; line-height: 1.8; }

  form { display: flex; flex-direction: column; gap: 10px; }
  label { margin-top: 6px; color: #dce5ee; font-size: 12px; font-weight: 650; }

  input {
    width: 100%;
    min-width: 0;
    padding: 12px 13px;
    border: 1px solid #304050;
    border-radius: 8px;
    outline: none;
    background: #0d141c;
    color: white;
    font-size: 12px;
  }

  input:focus { border-color: #4898ff; }
  input::placeholder { color: #667789; }

  .password-field { position: relative; display: flex; align-items: center; }
  .password-field input { padding-right: 76px; }
  .show-password {
    position: absolute;
    right: 10px;
    border: 0;
    background: transparent;
    color: #78b8ff;
    font-size: 11px;
  }

  .form-options {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin: 4px 0 10px;
    color: #8797a7;
    font-size: 10px;
  }

  a { color: #70b3ff; text-decoration: none; }
  a:hover { text-decoration: underline; }

  .submit {
    padding: 13px;
    border: 0;
    border-radius: 8px;
    background: #287cf0;
    color: white;
    font-size: 13px;
    font-weight: 750;
    cursor: pointer;
  }

  .submit:hover { background: #398bff; }
  .error { color: #ff9292; font-size: 11px; line-height: 1.6; }
  .switch { margin: 23px 0 0; color: #98a6b5; text-align: center; font-size: 12px; }
  .switch a { margin-left: 4px; font-weight: 700; }
  footer { margin-top: auto; padding: 25px 0 5px; color: #667789; font-size: 10px; }

  @media (max-width: 480px) {
    .auth-page { padding: 25px 14px 15px; }
    .auth-card { margin-top: 35px; padding: 23px; }
    h1 { font-size: 24px; }
  }
</style>
