
<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '#lib/api.js';

  type Certificate = {
    id: number;
    participant: string;
    email: string;
    event: string;
    number: string | null;
    issuedAt: string | null;
    status: 'Terbit' | 'Menunggu';
  };

  // Bentuk data dari GET /api/admin/certificates
  type ApiCertificate = {
    id: number;
    participant: string;
    email: string;
    event: string;
    certificateNumber: string | null;
    issuedAt: string | null;
  };

  function formatDate(value: string | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(date);
  }

  // Sertifikat dianggap terbit jika sudah punya nomor, selain itu menunggu.
  function toCertificate(c: ApiCertificate): Certificate {
    return {
      id: c.id,
      participant: c.participant,
      email: c.email,
      event: c.event,
      number: c.certificateNumber,
      issuedAt: formatDate(c.issuedAt),
      status: c.certificateNumber ? 'Terbit' : 'Menunggu'
    };
  }

  let certificates = $state<Certificate[]>([]);
  let loading = $state(true);
  let error = $state('');
  let search = $state('');
  let statusFilter = $state('Semua');

  let filtered = $derived(
    certificates.filter((item) => {
      const keyword = search.toLowerCase();

      const matchesSearch =
        item.participant.toLowerCase().includes(keyword) ||
        item.email.toLowerCase().includes(keyword) ||
        item.event.toLowerCase().includes(keyword);

      return matchesSearch &&
        (statusFilter === 'Semua' || item.status === statusFilter);
    })
  );

  let issuedCount = $derived(
    certificates.filter((item) => item.status === 'Terbit').length
  );

  let pendingCount = $derived(
    certificates.filter((item) => item.status === 'Menunggu').length
  );

  onMount(async () => {
    try {
      const data = await api<ApiCertificate[]>('/api/admin/certificates');
      certificates = data.map(toCertificate);
    } catch (err) {
      error = err instanceof Error
        ? err.message
        : 'Terjadi kesalahan saat memuat sertifikat.';
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Sertifikat | INFORHUB Admin</title>
</svelte:head>

<section class="page">
  <div class="breadcrumb">Admin / Sertifikat</div>
  <h1>Sertifikat</h1>
  <p class="subtitle">Kelola sertifikat yang diterbitkan untuk peserta acara.</p>

  <div class="stats">
    <article><span>Total sertifikat</span><strong>{certificates.length}</strong></article>
    <article><span>Terbit</span><strong>{issuedCount}</strong></article>
    <article><span>Menunggu</span><strong>{pendingCount}</strong></article>
  </div>

  <div class="filters">
    <input bind:value={search} placeholder="Cari peserta, email, atau acara..." />
    <select bind:value={statusFilter}>
      <option>Semua</option>
      <option>Terbit</option>
      <option>Menunggu</option>
    </select>
  </div>

  <section class="panel">
    {#if loading}
      <p class="empty">Memuat data sertifikat...</p>
    {:else if error}
      <div class="empty">
        <strong>Data sertifikat gagal dimuat</strong>
        <p>{error}</p>
        <p>Periksa koneksi API backend.</p>
      </div>
    {:else if filtered.length === 0}
      <div class="empty">
        <strong>Belum ada sertifikat</strong>
        <p>Sertifikat akan muncul di sini setelah data tersedia dari backend.</p>
      </div>
    {:else}
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Peserta</th>
              <th>Acara</th>
              <th>Nomor sertifikat</th>
              <th>Tanggal terbit</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {#each filtered as item (item.id)}
              <tr>
                <td>{item.participant}<small>{item.email}</small></td>
                <td>{item.event}</td>
                <td>{item.number ?? '—'}</td>
                <td>{item.issuedAt ?? '—'}</td>
                <td>
                  <span class:issued={item.status === 'Terbit'} class="status">
                    {item.status}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</section>

<style>
  .page { max-width:1200px; margin:auto; color:#e7edf7; }
  .breadcrumb { color:#7f94ad; font-size:11px; margin-bottom:9px; }
  h1 { margin:0 0 8px; font-size:27px; }
  .subtitle { color:#91a2b8; font-size:12px; margin-bottom:24px; }
  .stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:15px; margin-bottom:20px; }
  .stats article,.panel { border:1px solid #223145; border-radius:11px; background:#0d1722; }
  .stats article { padding:20px; display:grid; gap:12px; }
  .stats span,small { color:#91a2b8; font-size:11px; }
  .stats strong { font-size:27px; }
  .filters { display:flex; gap:12px; margin-bottom:16px; }
  input,select { padding:12px; border:1px solid #2a3b50; border-radius:8px; background:#101c29; color:#e7edf7; }
  input { flex:1; min-width:0; }
  .panel { overflow:hidden; }
  .empty { padding:40px 20px; text-align:center; color:#91a2b8; font-size:12px; }
  .empty strong { color:#e7edf7; }
  .table-scroll { overflow-x:auto; }
  table { width:100%; border-collapse:collapse; text-align:left; white-space:nowrap; font-size:12px; }
  th,td { padding:15px; border-bottom:1px solid #223145; }
  th { background:#101c29; color:#91a2b8; }
  td small { display:block; margin-top:5px; }
  .status { padding:5px 9px; border-radius:20px; background:#3c301a; color:#f3ca76; }
  .status.issued { background:#123b30; color:#71dfb0; }
  @media(max-width:650px) { .stats { grid-template-columns:1fr; } .filters { flex-direction:column; } }
</style>
