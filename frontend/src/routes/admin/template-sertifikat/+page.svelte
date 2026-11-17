<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api, apiUrl } from '#lib/api.js';
  import Icon from '#lib/components/Icon.svelte';

  type Status = 'pending' | 'approved' | 'rejected' | 'draft' | 'all';
  type AuditItem = {
    id: number;
    action: 'submit' | 'approve' | 'reject';
    actorId: number;
    actorName: string;
    note?: string | null;
    createdAt: string;
  };
  type Submission = {
    id: number;
    name: string;
    status: Exclude<Status, 'all'>;
    organizerId?: number;
    organizerName?: string;
    organizerEmail?: string;
    organizationName?: string | null;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    reviewNote?: string | null;
    approvedTemplateId?: number | null;
    updatedAt?: string;
    createdAt?: string;
  };
  type SubmissionDetail = Submission & {
    layout: unknown;
    audit: AuditItem[];
  };

  let submissions = $state<Submission[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let detailLoading = $state(false);
  let error = $state('');
  let notice = $state('');
  let filter = $state<Status>('pending');
  let selected = $state<SubmissionDetail | null>(null);
  let decision = $state<'approve' | 'reject' | null>(null);
  let reviewNote = $state('');
  let previewUrl = $state('');
  let previewLoading = $state(false);
  let search = $state('');

  const endpoint = '/api/admin/certificate-template-submissions';
  const visibleSubmissions = $derived(
    submissions.filter((item) => {
      const q = search.trim().toLocaleLowerCase('id-ID');
      return !q || item.name.toLocaleLowerCase('id-ID').includes(q)
        || (item.organizerName ?? '').toLocaleLowerCase('id-ID').includes(q)
        || (item.organizerEmail ?? '').toLocaleLowerCase('id-ID').includes(q);
    })
  );

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  }

  async function loadSubmissions() {
    loading = true;
    error = '';
    try {
      const query = new URLSearchParams({ status: filter, limit: '1000', page: '1' });
      submissions = await api<Submission[]>(`${endpoint}?${query.toString()}`);
    } catch (e) {
      submissions = [];
      error = e instanceof Error ? e.message : 'Gagal memuat daftar pengajuan.';
    } finally {
      loading = false;
    }
  }

  async function changeFilter(next: Status) {
    if (filter === next) return;
    filter = next;
    selected = null;
    decision = null;
    clearPreview();
    await loadSubmissions();
  }

  async function openDetail(item: Submission) {
    selected = null;
    decision = null;
    reviewNote = '';
    notice = '';
    error = '';
    clearPreview();
    detailLoading = true;
    try {
      const detail = await api<SubmissionDetail>(`${endpoint}/${item.id}`);
      selected = detail;
      await loadPreview(item.id);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Gagal memuat detail pengajuan.';
    } finally {
      detailLoading = false;
    }
  }

  async function loadPreview(id: number) {
    previewLoading = true;
    clearPreview();
    try {
      const response = await fetch(apiUrl(`${endpoint}/${id}/preview`), {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(typeof body?.error === 'string' ? body.error : 'Pratinjau PDF gagal dibuat.');
      }
      const blob = await response.blob();
      previewUrl = URL.createObjectURL(blob);
    } catch (e) {
      error = e instanceof Error ? `Pratinjau tidak dapat dimuat: ${e.message}` : 'Pratinjau PDF tidak dapat dimuat.';
    } finally {
      previewLoading = false;
    }
  }

  function startDecision(action: 'approve' | 'reject') {
    decision = action;
    reviewNote = '';
    error = '';
    notice = '';
  }

  async function submitReview() {
    if (!selected || !decision) return;
    if (decision === 'reject' && reviewNote.trim().length < 3) {
      error = 'Catatan penolakan wajib diisi minimal 3 karakter.';
      return;
    }

    saving = true;
    error = '';
    notice = '';
    try {
      await api(`${endpoint}/${selected.id}/${decision}`, {
        method: 'POST',
        body: reviewNote.trim() ? { note: reviewNote.trim() } : {}
      });
      notice = decision === 'approve'
        ? `Template "${selected.name}" berhasil disetujui.`
        : `Template "${selected.name}" berhasil ditolak. Catatan sudah dikirim ke penyelenggara.`;
      selected = null;
      decision = null;
      clearPreview();
      await loadSubmissions();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Keputusan belum dapat disimpan.';
    } finally {
      saving = false;
    }
  }

  function closeDetail() {
    if (saving) return;
    selected = null;
    decision = null;
    clearPreview();
  }

  function dateLabel(value?: string | null) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function statusLabel(status: string) {
    if (status === 'pending') return 'Menunggu';
    if (status === 'approved') return 'Disetujui';
    if (status === 'rejected') return 'Ditolak';
    if (status === 'draft') return 'Draft';
    return status;
  }

  function actionLabel(action: string) {
    if (action === 'submit') return 'Mengajukan template';
    if (action === 'approve') return 'Menyetujui template';
    if (action === 'reject') return 'Menolak template';
    return action;
  }

  onMount(() => { void loadSubmissions(); });
  onDestroy(clearPreview);
</script>

<svelte:head>
  <title>Persetujuan Template Sertifikat | INFORHUB Administrator</title>
  <meta name="description" content="Tinjau desain sertifikat yang diajukan penyelenggara." />
</svelte:head>

<section class="page">
  <div class="breadcrumb">Administrator / Sertifikat / Persetujuan Template</div>
  <div class="heading">
    <div>
      <h1>Persetujuan Template Sertifikat</h1>
      <p>Tinjau desain yang diajukan penyelenggara. Admin hanya memeriksa, menyetujui, atau menolak template.</p>
    </div>
    <button class="secondary" onclick={loadSubmissions} disabled={loading}>
      <Icon name="clock" size={15} /> Muat ulang
    </button>
  </div>

  {#if notice}
    <div class="notice success"><Icon name="check" size={17} /><span>{notice}</span></div>
  {/if}
  {#if error && !selected}
    <div class="notice error"><Icon name="info" size={17} /><span>{error}</span></div>
  {/if}

  <div class="info">
    <Icon name="certificate" size={19} />
    <div>
      <strong>Admin bertugas melakukan pemeriksaan</strong>
      <p>Template dibuat oleh penyelenggara. Template yang disetujui akan menjadi versi template resmi milik penyelenggara dan dapat dipilih untuk acara.</p>
    </div>
  </div>

  <section class="panel">
    <div class="toolbar">
      <div class="filters" aria-label="Filter status pengajuan">
        <button class:active={filter === 'pending'} onclick={() => changeFilter('pending')}>Menunggu</button>
        <button class:active={filter === 'approved'} onclick={() => changeFilter('approved')}>Disetujui</button>
        <button class:active={filter === 'rejected'} onclick={() => changeFilter('rejected')}>Ditolak</button>
        <button class:active={filter === 'all'} onclick={() => changeFilter('all')}>Semua</button>
      </div>
      <label class="search">
        <Icon name="search" size={16} />
        <input bind:value={search} placeholder="Cari nama template atau penyelenggara..." />
      </label>
    </div>

    <div class="panel-head">
      <div>
        <h2>Daftar pengajuan</h2>
        <p>{visibleSubmissions.length} pengajuan ditampilkan</p>
      </div>
      <span class="count">{submissions.length} data</span>
    </div>

    {#if loading}
      <div class="state"><Icon name="clock" size={22} />Memuat pengajuan template...</div>
    {:else if visibleSubmissions.length === 0}
      <div class="state empty">
        <Icon name="file" size={27} />
        <strong>Belum ada pengajuan</strong>
        <p>{search ? 'Tidak ada hasil yang cocok dengan pencarian.' : 'Pengajuan template dari penyelenggara akan muncul di halaman ini.'}</p>
      </div>
    {:else}
      <div class="submission-list">
        {#each visibleSubmissions as item (item.id)}
          <article class="submission-row">
            <div class="file-icon"><Icon name="image" size={21} /></div>
            <div class="submission-copy">
              <strong>{item.name}</strong>
              <span>{item.organizerName ?? 'Penyelenggara tidak diketahui'}{item.organizationName ? ` · ${item.organizationName}` : ''}</span>
              <small>{item.organizerEmail ?? ''} · Diajukan {dateLabel(item.submittedAt)}</small>
            </div>
            <span class="status" class:pending={item.status === 'pending'} class:approved={item.status === 'approved'} class:rejected={item.status === 'rejected'}>{statusLabel(item.status)}</span>
            <div class="row-actions">
              <button class="secondary small" onclick={() => openDetail(item)} disabled={detailLoading}>Lihat detail</button>
              {#if item.status === 'pending'}
                <button class="primary small" onclick={() => openDetail(item)}>Tinjau</button>
              {/if}
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </section>
</section>

{#if detailLoading}
  <div class="modal-backdrop">
    <div class="loading-modal"><Icon name="clock" size={25} />Memuat detail pengajuan...</div>
  </div>
{/if}

{#if selected}
  <div class="modal-backdrop" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) closeDetail(); }}>
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <header class="modal-head">
        <div>
          <span class="eyebrow">DETAIL PENGAJUAN #{selected.id}</span>
          <h2 id="review-title">{selected.name}</h2>
        </div>
        <button class="close" aria-label="Tutup" onclick={closeDetail}><Icon name="close" size={18} /></button>
      </header>

      <div class="detail-grid">
        <div class="detail-item"><span>Penyelenggara</span><strong>{selected.organizerName ?? '—'}</strong></div>
        <div class="detail-item"><span>Organisasi</span><strong>{selected.organizationName ?? '—'}</strong></div>
        <div class="detail-item"><span>Email</span><strong>{selected.organizerEmail ?? '—'}</strong></div>
        <div class="detail-item"><span>Status</span><strong class="inline-status">{statusLabel(selected.status)}</strong></div>
        <div class="detail-item"><span>Tanggal pengajuan</span><strong>{dateLabel(selected.submittedAt)}</strong></div>
        <div class="detail-item"><span>Tanggal ditinjau</span><strong>{dateLabel(selected.reviewedAt)}</strong></div>
      </div>

      <section class="preview-section">
        <div class="section-title"><Icon name="file" size={17} /><strong>Pratinjau desain sertifikat</strong></div>
        {#if previewLoading}
          <div class="preview-state"><Icon name="clock" size={23} />Membuat pratinjau PDF...</div>
        {:else if previewUrl}
          <iframe title={`Pratinjau template ${selected.name}`} src={previewUrl}></iframe>
          <a class="download-link" href={previewUrl} target="_blank" rel="noreferrer"><Icon name="arrow-up-right" size={14} /> Buka pratinjau di tab baru</a>
        {:else}
          <div class="preview-state"><Icon name="info" size={22} />Pratinjau belum tersedia. Periksa pesan kesalahan di bawah.</div>
        {/if}
      </section>

      {#if error}
        <div class="notice error modal-error"><Icon name="info" size={16} /><span>{error}</span></div>
      {/if}

      {#if selected.reviewNote}
        <div class="previous-note">
          <strong>Catatan keputusan sebelumnya</strong>
          <p>{selected.reviewNote}</p>
        </div>
      {/if}

      {#if selected.audit?.length}
        <section class="audit">
          <strong>Riwayat pengajuan</strong>
          {#each selected.audit as entry (entry.id)}
            <div class="audit-row">
              <span class="audit-dot"></span>
              <div>
                <b>{actionLabel(entry.action)}</b>
                <small>{entry.actorName} · {dateLabel(entry.createdAt)}</small>
                {#if entry.note}<p>{entry.note}</p>{/if}
              </div>
            </div>
          {/each}
        </section>
      {/if}

      {#if decision}
        <label class="note-field">
          {decision === 'reject' ? 'Catatan penolakan (wajib)' : 'Catatan admin (opsional)'}
          <textarea bind:value={reviewNote} rows="3" maxlength="500" placeholder={decision === 'reject' ? 'Jelaskan bagian desain yang perlu diperbaiki...' : 'Tambahkan catatan jika diperlukan...'}></textarea>
          <small>{reviewNote.length}/500 karakter</small>
        </label>
        <div class="confirm-actions">
          <button class="secondary" onclick={() => decision = null} disabled={saving}>Kembali</button>
          <button class:danger={decision === 'reject'} class="primary" onclick={submitReview} disabled={saving}>
            {#if saving}<Icon name="clock" size={15} />Menyimpan...{:else}{decision === 'approve' ? 'Konfirmasi persetujuan' : 'Konfirmasi penolakan'}{/if}
          </button>
        </div>
      {:else if selected.status === 'pending'}
        <div class="confirm-actions">
          <button class="danger" onclick={() => startDecision('reject')}>Tolak pengajuan</button>
          <button class="primary" onclick={() => startDecision('approve')}>Setujui template</button>
        </div>
      {/if}
    </section>
  </div>
{/if}

<style>
  .page{max-width:1450px;margin:auto;color:var(--text);min-width:0}.breadcrumb{margin-bottom:10px;color:var(--muted);font-size:11px}.heading{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:22px}h1{margin:0 0 7px;font-size:27px}.heading p{margin:0;color:var(--muted);font-size:12px;line-height:1.6}button{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:8px;font:inherit;font-size:11px;font-weight:650;cursor:pointer}.primary,.secondary,.danger{padding:10px 14px;border:1px solid var(--border-strong)}.primary{border-color:var(--accent);background:var(--accent);color:white}.secondary{background:var(--surface);color:var(--text)}.danger{border-color:#d98b8b;background:var(--surface);color:#bd4545}button:disabled{opacity:.55;cursor:not-allowed}.notice,.info{display:flex;align-items:flex-start;gap:11px;padding:13px 15px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);margin-bottom:16px;font-size:11px;line-height:1.6}.info{color:var(--accent-text)}.info p{margin:4px 0 0;color:var(--muted)}.notice.success{color:var(--ok-text)}.notice.error{color:var(--err-text)}.panel{overflow:hidden;border:1px solid var(--border);border-radius:11px;background:var(--surface-2)}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 18px;border-bottom:1px solid var(--border)}.filters{display:flex;gap:4px;padding:4px;border:1px solid var(--border);border-radius:9px;background:var(--surface)}.filters button{padding:7px 10px;border:0;background:transparent;color:var(--muted);font-size:10px}.filters button.active{background:var(--accent-soft);color:var(--accent-text)}.search{display:flex;align-items:center;gap:8px;width:min(100%,330px);padding:9px 11px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--muted)}.search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--text);font:inherit;font-size:11px}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 18px;border-bottom:1px solid var(--border)}.panel-head h2{margin:0 0 5px;font-size:14px}.panel-head p{margin:0;color:var(--muted);font-size:11px}.count{padding:5px 8px;border-radius:20px;background:var(--surface-3);color:var(--muted);font-size:10px}.state{display:flex;align-items:center;justify-content:center;gap:10px;padding:48px 20px;color:var(--muted);font-size:12px}.state.empty{flex-direction:column;text-align:center}.state strong{color:var(--text)}.state p{margin:0}.submission-list{display:grid}.submission-row{display:flex;align-items:center;gap:13px;padding:15px 18px;border-bottom:1px solid var(--border)}.submission-row:last-child{border-bottom:0}.file-icon{display:grid;place-items:center;width:42px;height:42px;flex-shrink:0;border-radius:9px;background:var(--accent-soft);color:var(--accent-text)}.submission-copy{display:grid;gap:4px;min-width:0;flex:1}.submission-copy strong{font-size:12px}.submission-copy span,.submission-copy small{font-size:10px;color:var(--muted);overflow-wrap:anywhere}.status{padding:5px 8px;border-radius:20px;background:var(--surface-3);color:var(--muted);font-size:9px;font-weight:700;white-space:nowrap}.status.pending{background:#fff4dc;color:#986719}.status.approved{background:var(--ok-bg);color:var(--ok-text)}.status.rejected{background:#fdecec;color:#b33e3e}.row-actions{display:flex;gap:6px;flex-wrap:wrap}.small{padding:7px 9px;font-size:10px}.modal-backdrop{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:18px;background:#0009}.modal{width:min(900px,100%);max-height:calc(100vh - 36px);overflow:auto;padding:20px;border:1px solid var(--border);border-radius:14px;background:var(--surface);box-shadow:0 25px 70px #0007}.loading-modal{display:flex;align-items:center;gap:12px;padding:22px 28px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text);font-size:12px}.modal-head{display:flex;justify-content:space-between;gap:14px;margin-bottom:18px}.eyebrow{font-size:9px;letter-spacing:1.2px;font-weight:800;color:var(--accent-text)}.modal-head h2{margin:6px 0 0;font-size:19px}.close{width:34px;height:34px;border:1px solid var(--border);background:var(--surface-2);color:var(--text)}.detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:17px}.detail-item{display:grid;gap:5px;padding:11px;border:1px solid var(--border);border-radius:8px;min-width:0}.detail-item span{font-size:10px;color:var(--muted)}.detail-item strong{font-size:11px;overflow-wrap:anywhere}.inline-status{color:var(--accent-text)}.preview-section{border:1px solid var(--border);border-radius:9px;overflow:hidden}.section-title{display:flex;align-items:center;gap:8px;padding:11px 13px;background:var(--surface-2);font-size:11px}.preview-section iframe{display:block;width:100%;height:min(60vh,620px);border:0;background:#e8e8e8}.preview-state{display:flex;align-items:center;justify-content:center;gap:10px;min-height:180px;color:var(--muted);font-size:11px}.download-link{display:flex;align-items:center;justify-content:center;gap:7px;padding:10px;border-top:1px solid var(--border);color:var(--accent-text);font-size:10px}.modal-error{margin-top:12px;margin-bottom:0}.previous-note{margin-top:14px;padding:12px;border:1px solid #d98b8b;border-radius:8px;background:var(--surface-2);font-size:11px}.previous-note p{margin:5px 0 0;color:var(--muted)}.audit{display:grid;gap:11px;margin-top:17px;padding-top:15px;border-top:1px solid var(--border);font-size:11px}.audit-row{display:flex;gap:10px}.audit-dot{width:8px;height:8px;margin:4px 0 0 2px;flex-shrink:0;border-radius:50%;background:var(--accent)}.audit-row>div{display:grid;gap:4px}.audit-row b{font-size:10px}.audit-row small,.audit-row p{margin:0;color:var(--muted);font-size:10px}.note-field{display:grid;gap:7px;margin-top:16px;font-size:11px;font-weight:650}.note-field textarea{width:100%;resize:vertical;padding:10px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface-2);color:var(--text);font:inherit;font-size:11px}.note-field small{color:var(--muted);font-weight:400;text-align:right}.confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:17px;padding-top:14px;border-top:1px solid var(--border)}@media(max-width:850px){.heading,.toolbar{align-items:flex-start;flex-direction:column}.search{width:100%}.submission-row{align-items:flex-start;flex-wrap:wrap}.submission-copy{min-width:calc(100% - 60px)}.row-actions{width:100%;padding-left:55px}.status{margin-left:55px}.detail-grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.filters{width:100%;justify-content:space-between}.filters button{padding:7px 6px}.detail-grid{grid-template-columns:1fr}.modal{padding:14px}.confirm-actions{flex-wrap:wrap}.confirm-actions button{flex:1}.modal-backdrop{padding:8px}.modal{max-height:calc(100vh - 16px)}}
</style>
