<script lang="ts">
  import Icon from "#lib/components/Icon.svelte";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { api, ApiError, apiUrl } from "#lib/api.js";

  type Certificate = {
    id: number;
    certificateNumber: string;
    issuedAt: string;
    eventTitle: string;
    eventStartAt: string;
  };

  let certificates = $state<Certificate[]>([]);
  let loading = $state(true);
  let error = $state("");

  onMount(async () => {
    try {
      certificates = await api<Certificate[]>("/api/me/certificates");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        goto("/login?redirect=%2Fsertifikat");
        return;
      }
      error = e instanceof Error ? e.message : "Gagal memuat sertifikat.";
    } finally {
      loading = false;
    }
  });

  function dateLabel(value: string) {
    return new Date(value).toLocaleDateString("id-ID", { dateStyle: "long" });
  }
</script>

<svelte:head><title>Sertifikat Saya | INFORHUB</title></svelte:head>

<main class="page">
  <section class="intro">
    <h1>Sertifikat Saya</h1>
    <p>Sertifikat yang sudah diterbitkan untuk acara yang kamu ikuti.</p>
  </section>

  {#if loading}
    <div class="state">Memuat sertifikat...</div>
  {:else if error}
    <div class="state error"><strong>Sertifikat gagal dimuat</strong><p>{error}</p></div>
  {:else if certificates.length === 0}
    <div class="state">
      <div class="icon"><Icon name="certificate" size={24}/></div>
      <strong>Belum ada sertifikat</strong>
      <p>Sertifikat akan muncul setelah acara selesai, kehadiran tercatat, dan sertifikat diterbitkan.</p>
      <a href="/pendaftaran">Lihat pendaftaran saya →</a>
    </div>
  {:else}
    <section class="grid">
      {#each certificates as certificate (certificate.id)}
        <article class="card">
          <div class="certificate-icon"><Icon name="certificate" size={21}/></div>
          <div class="content">
            <span class="pill">SERTIFIKAT TERBIT</span>
            <h2>{certificate.eventTitle}</h2>
            <p>Nomor: {certificate.certificateNumber}</p>
            <p>Tanggal terbit: {dateLabel(certificate.issuedAt)}</p>
            <a class="download" href={apiUrl(`/api/certificates/${certificate.id}/download`)}>Unduh PDF</a>
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
  .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.card{display:flex;gap:18px;padding:20px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2)}.certificate-icon{display:grid;place-items:center;flex-shrink:0;width:64px;height:64px;border-radius:12px;background:var(--accent-soft);color:var(--accent-text);font-size:34px}
  .content{min-width:0}.pill{display:inline-block;padding:5px 8px;border-radius:20px;background:var(--ok-bg);color:var(--ok-text);font-size:9px;letter-spacing:.5px}.content h2{font-size:16px;line-height:1.4;margin:12px 0}.content p{color:var(--muted);font-size:11px;overflow-wrap:anywhere}
  .download{display:inline-block;margin-top:12px;padding:9px 16px;border-radius:8px;background:var(--accent);color:#fff;font-size:11px;font-weight:700}.state{padding:50px 20px;text-align:center;border:1px dashed var(--border-strong);border-radius:12px;color:var(--muted);font-size:12px}.state strong{color:var(--text)}.state p{max-width:440px;margin:9px auto 15px;line-height:1.6}.state a{color:var(--accent-text)}.icon{font-size:42px;margin-bottom:10px}.error{color:var(--err-text)}
  @media(max-width:650px){.page{padding:0 15px 35px}.grid{grid-template-columns:1fr}.card{flex-direction:column}}
</style>
