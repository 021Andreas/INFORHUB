
<script lang="ts">
  let name = $state("");
  let email = $state("");
  let password = $state("");
  let confirmPassword = $state("");
  let showPassword = $state(false);
  let acceptedTerms = $state(false);
  let error = $state("");

  function handleRegister(event: SubmitEvent) {
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

    if (!acceptedTerms) {
      error = "Kamu harus menyetujui ketentuan penggunaan.";
      return;
    }

    error = "Registrasi backend belum terhubung.";
  }
</script>

<svelte:head>
  <title>Daftar — INFORHUB</title>
  <meta name="description" content="Buat akun peserta INFORHUB." />
</svelte:head>

<main class="auth-page">
  <a class="brand" href="/">
    <span class="logo">▦</span>
    <span>INFOR<span class="blue">HUB</span></span>
  </a>

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

      <label class="terms">
        <input type="checkbox" bind:checked={acceptedTerms} />
        <span>
          Saya menyetujui ketentuan penggunaan dan kebijakan privasi INFORHUB.
        </span>
      </label>

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
    padding: 28px 18px 18px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    color: white;
    text-decoration: none;
    font-size: 23px;
    font-weight: 850;
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
    max-width: 440px;
    margin: 30px 0;
    padding: 29px 32px;
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
    font-size: 27px;
  }

  .eyebrow {
    margin-top: 20px;
    color: #65aaff;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.4px;
  }

  h1 { margin: 8px 0; font-size: 26px; }
  .subtitle { margin: 0 0 20px; color: #98a6b5; font-size: 12px; line-height: 1.8; }

  form { display: flex; flex-direction: column; gap: 9px; }
  label { margin-top: 5px; color: #dce5ee; font-size: 12px; font-weight: 650; }

  input:not([type="checkbox"]) {
    width: 100%;
    min-width: 0;
    padding: 11px 13px;
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
  .password-field input { padding-right: 78px !important; }
  .show-password {
    position: absolute;
    right: 10px;
    border: 0;
    background: transparent;
    color: #78b8ff;
    font-size: 11px;
    cursor: pointer;
  }

  .terms {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin: 12px 0;
    color: #aab8c7;
    font-size: 11px;
    font-weight: 400;
    line-height: 1.7;
  }

  .terms input {
    flex-shrink: 0;
    margin-top: 3px;
    accent-color: #287cf0;
  }

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
  .switch { margin: 21px 0 0; color: #98a6b5; text-align: center; font-size: 12px; }
  .switch a { margin-left: 4px; color: #70b3ff; font-weight: 700; text-decoration: none; }
  footer { margin-top: auto; padding: 10px 0; color: #667789; font-size: 10px; }

  @media (max-width: 480px) {
    .auth-page { padding: 22px 14px; }
    .auth-card { margin: 24px 0; padding: 23px; }
    h1 { font-size: 23px; }
  }
</style>
