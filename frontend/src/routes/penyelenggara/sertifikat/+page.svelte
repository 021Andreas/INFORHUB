<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "#lib/api.js";

  type Certificate = {
    id: number; certificateNumber: string | null; issuedAt: string | null;
    participant: string; email: string; event: string; eventId: number;
  };
  let rows = $state<Certificate[]>([]);
  let loading = $state(true);
  let error = $state("");
  let search = $state("");

  let filtered = $derived(rows.filter((row) =>
    `${row.certificateNumber ?? ""} ${row.participant} ${row.email} ${row.event}`
      .toLowerCase().includes(search.trim().toLowerCase())
  ));

  onMount(async () => {
    try {
      rows = (await api<Certificate[]>("/api/admin/certificates")).filter((row) => Boolean(row.certificateNumber));
    } catch (e) {
      error = e instanceof Error ? e.message : "Gagal memuat sertifikat.";
    } finally {
      loading = false;
    }
  });

  function dateLabel(value: string) {
    return new Date(value).toLocaleDateString("id-ID", { dateStyle: "medium" });
  }
</script>

<svelte:head><title>Sertifikat | INFORHUB Penyelenggara</title></svelte:head>

<section class="page">
  <div class="breadcrumb">Penyelenggara / Sertifikat</div>
  <h1>Sertifikat dan Penerbitan</h1>
  <p class="subtitle">Pantau sertifikat yang telah diterbitkan untuk peserta acara yang dikelola.</p>
  <div class="issue-note"><strong>F-16 dan F-24 · Penerbitan otomatis dan massal</strong><p>Halaman ini saat ini menampilkan catatan sertifikat yang sudah terbit. Form pemilihan peserta, pemeriksaan kelayakan kehadiran, dan aksi penerbitan massal memerlukan endpoint backend yang belum tersedia pada kode frontend ini.</p></div>

  <div class="summary">
    <div><span>Total sertifikat</span><strong>{rows.length}</strong></div>
  </div>

  <div class="toolbar">
    <input bind:value={search} placeholder="Cari peserta, email, acara, atau nomor sertifikat..." aria-label="Cari sertifikat" />
  </div>

  <section class="panel">
    <div class="panel-head"><div><h2>Daftar Sertifikat</h2><p>{filtered.length} data ditemukan</p></div></div>
    {#if loading}
      <div class="state">Memuat sertifikat...</div>
    {:else if error}
      <div class="state error"><strong>Sertifikat gagal dimuat</strong><p>{error}</p></div>
    {:else if filtered.length === 0}
      <div class="state"><strong>Belum ada sertifikat</strong><p>Sertifikat yang diterbitkan akan muncul di sini.</p></div>
    {:else}
      <div class="table-scroll"><table>
        <thead><tr><th>Peserta</th><th>Acara</th><th>Nomor sertifikat</th><th>Tanggal terbit</th></tr></thead>
        <tbody>{#each filtered as row (row.id)}
          <tr>
            <td><strong>{row.participant}</strong><small>{row.email}</small></td>
            <td>{row.event}</td><td class="number">{row.certificateNumber ?? "—"}</td><td>{row.issuedAt ? dateLabel(row.issuedAt) : "—"}</td>
          </tr>
        {/each}</tbody>
      </table></div>
    {/if}
  </section>
</section>

<style>
  .page{max-width:1200px;margin:auto;color:var(--text)}.breadcrumb{color:var(--muted);font-size:11px;margin-bottom:9px}h1{margin:0 0 8px;font-size:27px}.subtitle{margin:0 0 24px;color:var(--muted);font-size:12px}
  .issue-note{margin:0 0 18px;padding:13px 15px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface);font-size:11px;line-height:1.6}.issue-note strong{color:var(--text)}.issue-note p{margin:5px 0 0;color:var(--muted)}
  .summary,.panel{border:1px solid var(--border);border-radius:11px;background:var(--surface-2)}.summary{display:inline-grid;min-width:220px;padding:18px;margin-bottom:18px;gap:8px}.summary span,.panel-head p,small{color:var(--muted);font-size:11px}.summary strong{display:block;font-size:27px;margin-top:7px}
  .toolbar{display:flex;margin-bottom:15px}input{width:100%;padding:12px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface);color:var(--text);font-size:12px}.panel{overflow:hidden}.panel-head{padding:18px;border-bottom:1px solid var(--border)}.panel-head h2{margin:0 0 7px;font-size:14px}.panel-head p{margin:0}
  .table-scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left;white-space:nowrap;font-size:12px}th,td{padding:15px;border-bottom:1px solid var(--border)}th{background:var(--surface);color:var(--muted)}td strong,td small{display:block}td small{margin-top:5px}.number{color:var(--accent-text)}.state{padding:42px 20px;text-align:center;color:var(--muted);font-size:12px}.state strong{color:var(--text)}.state p{line-height:1.6}.error{color:var(--err-text)}
</style>
