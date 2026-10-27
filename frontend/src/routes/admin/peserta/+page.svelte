
<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '#lib/api.js';
  import Icon from '#lib/components/Icon.svelte';

  type RegistrationStatus = 'registered' | 'cancelled';

  type Participant = {
    id: number;
    name: string;
    email: string;
    eventId: number;
    eventTitle: string;
    registrationCode: string;
    status: RegistrationStatus;
    registeredAt: string;
  };

  let participants = $state<Participant[]>([]);

  onMount(async () => {
    try {
      participants = await api<Participant[]>('/api/admin/participants');
    } catch (e) {
      console.error('Gagal memuat peserta:', e);
    }
  });
  let search = $state('');
  let eventFilter = $state('all');
  let statusFilter = $state('all');
  let selectedParticipant = $state<Participant | null>(null);

  let eventOptions = $derived(
    Array.from(
      new Map(
        participants.map((p) => [p.eventId, p.eventTitle])
      ),
      ([id, title]) => ({ id, title })
    )
  );

  let filteredParticipants = $derived(
    participants.filter((participant) => {
      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        participant.name.toLowerCase().includes(query) ||
        participant.email.toLowerCase().includes(query) ||
        participant.registrationCode.toLowerCase().includes(query);

      const matchesEvent =
        eventFilter === 'all' ||
        String(participant.eventId) === eventFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        participant.status === statusFilter;

      return matchesSearch && matchesEvent && matchesStatus;
    })
  );

  const statusLabel: Record<RegistrationStatus, string> = {
    registered: 'Terdaftar',
    cancelled: 'Dibatalkan'
  };

  function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function exportCsv() {
    if (!filteredParticipants.length) return;

    const rows = [
      ['Nama', 'Email', 'Acara', 'Kode Pendaftaran', 'Status', 'Tanggal Daftar'],
      ...filteredParticipants.map((p) => [
        p.name,
        p.email,
        p.eventTitle,
        p.registrationCode,
        statusLabel[p.status],
        formatDate(p.registeredAt)
      ])
    ];

    const escapeCsv = (value: string) =>
      `"${value.replace(/"/g, '""')}"`;

    const csv = '\uFEFF' + rows
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n');

    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    );

    const link = document.createElement('a');
    link.href = url;
    link.download = 'peserta-inforhub.csv';
    link.click();

    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>Peserta | INFORHUB Admin</title>
  <meta name="description" content="Kelola peserta dan pendaftaran acara INFORHUB." />
</svelte:head>

<section class="participants-page">
  <div class="page-heading">
    <div>
      <div class="breadcrumb">Admin / Peserta</div>
      <h1>Peserta</h1>
      <p>Lihat dan kelola pendaftaran peserta untuk seluruh acara.</p>
    </div>

    <button
      class="secondary-button"
      onclick={exportCsv}
      disabled={filteredParticipants.length === 0}
    >
      <span>↓</span> Ekspor CSV
    </button>
  </div>

  <div class="stats-grid">
    <article class="stat-card">
      <span class="stat-icon blue"><Icon name="users" size={19}/></span>
      <div>
        <p>Total pendaftaran</p>
        <strong>{participants.length}</strong>
      </div>
    </article>

    <article class="stat-card">
      <span class="stat-icon green"><Icon name="check" size={19}/></span>
      <div>
        <p>Terdaftar</p>
        <strong>{participants.filter(p => p.status === 'registered').length}</strong>
      </div>
    </article>

    <article class="stat-card">
      <span class="stat-icon red"><Icon name="close" size={19}/></span>
      <div>
        <p>Dibatalkan</p>
        <strong>{participants.filter(p => p.status === 'cancelled').length}</strong>
      </div>
    </article>
  </div>

  <section class="panel">
    <div class="panel-heading">
      <div>
        <h2>Daftar Peserta</h2>
        <p>Cari peserta berdasarkan nama, email, atau kode pendaftaran.</p>
      </div>
      <span class="count-badge">{filteredParticipants.length} peserta</span>
    </div>

    <div class="filters">
      <label class="search-box">
        <Icon name="search" size={18}/>
        <input
          bind:value={search}
          type="search"
          placeholder="Cari nama, email, atau kode..."
          aria-label="Cari peserta"
        />
      </label>

      <select bind:value={eventFilter} aria-label="Filter acara">
        <option value="all">Semua acara</option>
        {#each eventOptions as event (event.id)}
          <option value={String(event.id)}>{event.title}</option>
        {/each}
      </select>

      <select bind:value={statusFilter} aria-label="Filter status pendaftaran">
        <option value="all">Semua status</option>
        <option value="registered">Terdaftar</option>
        <option value="cancelled">Dibatalkan</option>
      </select>
    </div>

    {#if filteredParticipants.length > 0}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Peserta</th>
              <th>Acara</th>
              <th>Kode Pendaftaran</th>
              <th>Tanggal Daftar</th>
              <th>Status</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredParticipants as participant (participant.id)}
              <tr>
                <td>
                  <div class="participant-cell">
                    <div class="avatar">
                      {participant.name.trim().charAt(0).toUpperCase()}
                    </div>
                    <div class="identity">
                      <strong>{participant.name}</strong>
                      <span>{participant.email}</span>
                    </div>
                  </div>
                </td>
                <td>{participant.eventTitle}</td>
                <td><code>{participant.registrationCode}</code></td>
                <td>{formatDate(participant.registeredAt)}</td>
                <td>
                  <span class="status {participant.status}">
                    {statusLabel[participant.status]}
                  </span>
                </td>
                <td>
                  <button
                    class="detail-button"
                    onclick={() => selectedParticipant = participant}
                  >
                    Lihat
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <div class="empty-state">
        <div class="empty-icon"><Icon name="users" size={24}/></div>
        <h3>
          {search || eventFilter !== 'all' || statusFilter !== 'all'
            ? 'Peserta tidak ditemukan'
            : 'Belum ada peserta'}
        </h3>
        <p>
          {search || eventFilter !== 'all' || statusFilter !== 'all'
            ? 'Coba ubah kata kunci atau filter yang dipilih.'
            : 'Peserta akan muncul di sini setelah mendaftar melalui halaman acara.'}
        </p>
        {#if search || eventFilter !== 'all' || statusFilter !== 'all'}
          <button
            class="secondary-button"
            onclick={() => {
              search = '';
              eventFilter = 'all';
              statusFilter = 'all';
            }}
          >
            Reset filter
          </button>
        {/if}
      </div>
    {/if}

    <footer class="panel-footer">
      Menampilkan {filteredParticipants.length} dari {participants.length} pendaftaran
    </footer>
  </section>
</section>

{#if selectedParticipant}
  <div class="modal-backdrop" role="presentation" onclick={(event) => {
    if (event.target === event.currentTarget) selectedParticipant = null;
  }}>
    <section class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div class="modal-heading">
        <div>
          <h2 id="detail-title">Detail Pendaftaran</h2>
          <p>Informasi peserta dan acara yang dipilih.</p>
        </div>
        <button class="close-button" aria-label="Tutup" onclick={() => selectedParticipant = null}><Icon name="close" size={17}/></button>
      </div>

      <dl>
        <dt>Nama peserta</dt>
        <dd>{selectedParticipant.name}</dd>
        <dt>Email</dt>
        <dd>{selectedParticipant.email}</dd>
        <dt>Acara</dt>
        <dd>{selectedParticipant.eventTitle}</dd>
        <dt>Kode pendaftaran</dt>
        <dd><code>{selectedParticipant.registrationCode}</code></dd>
        <dt>Tanggal pendaftaran</dt>
        <dd>{formatDate(selectedParticipant.registeredAt)}</dd>
        <dt>Status</dt>
        <dd>{statusLabel[selectedParticipant.status]}</dd>
      </dl>

      <button class="primary-button" onclick={() => selectedParticipant = null}>
        Tutup detail
      </button>
    </section>
  </div>
{/if}

<style>
  .participants-page { max-width: 1600px; margin: auto; color: var(--text)}
  .page-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 23px}
  .breadcrumb { color: var(--muted); font-size: 11px; margin-bottom: 9px}
  h1 { margin: 0 0 6px; font-size: 27px}
  .page-heading p, .panel-heading p, .modal-heading p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5}
  button, input, select { font: inherit}
  button { cursor: pointer}
  button:disabled { cursor: not-allowed; opacity: .45}
  .secondary-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 14px; border: 1px solid var(--border-strong); border-radius: 8px; background: var(--surface); color: var(--text-2); font-size: 11px}
  .secondary-button:hover:not(:disabled) { border-color: var(--accent); color: var(--text)}
  .stats-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 13px; margin-bottom: 17px}
  .stat-card { display: flex; align-items: center; gap: 13px; padding: 18px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface-2)}
  .stat-icon { display: grid; place-items: center; flex-shrink: 0; width: 43px; height: 43px; border-radius: 10px; font-size: 23px}
  .stat-icon.blue { color: var(--accent-text); background: var(--accent-soft)}
  .stat-icon.green { color: var(--ok-text); background: var(--ok-bg)}
  .stat-icon.red { color: var(--err-text); background: var(--err-bg)}
  .stat-card p { margin: 0 0 6px; color: var(--muted); font-size: 11px}
  .stat-card strong { font-size: 24px}
  .panel { overflow: hidden; border: 1px solid var(--border); border-radius: 11px; background: var(--surface-2)}
  .panel-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 20px 20px 17px}
  .panel-heading h2, .modal-heading h2 { margin: 0 0 6px; font-size: 15px}
  .count-badge { padding: 7px 9px; border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text-2); font-size: 10px; white-space: nowrap}
  .filters { display: flex; gap: 10px; padding: 0 20px 17px}
  .search-box { display: flex; align-items: center; flex: 1; gap: 10px; min-width: 120px; padding: 0 12px; border: 1px solid var(--border-strong); border-radius: 8px; background: var(--surface); color: var(--muted)}
  .search-box > span { font-size: 22px}
  .search-box input { width: 100%; min-width: 0; padding: 11px 0; border: 0; outline: 0; background: transparent; color: var(--text); font-size: 11px}
  .search-box input::placeholder { color: var(--muted)}
  .filters select { max-width: 200px; padding: 0 10px; border: 1px solid var(--border-strong); border-radius: 8px; background: var(--surface); color: var(--text-2); font-size: 11px}
  .table-wrap { overflow-x: auto}
  table { width: 100%; border-collapse: collapse; text-align: left; white-space: nowrap}
  th { padding: 13px 16px; background: var(--surface); color: var(--muted); font-size: 10px; font-weight: 600}
  td { padding: 13px 16px; border-top: 1px solid var(--border); color: var(--text-2); font-size: 11px}
  .participant-cell { display: flex; align-items: center; gap: 10px}
  .avatar { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: var(--accent-soft); color: var(--accent-text); font-weight: 700}
  .identity { display: grid; gap: 4px}
  .identity strong { color: var(--text); font-size: 11px}
  .identity span { color: var(--muted); font-size: 10px}
  code { color: var(--accent-text); font-family: ui-monospace, monospace; font-size: 10px}
  .status { display: inline-block; padding: 5px 8px; border-radius: 20px; font-size: 10px}
  .status.registered { background: var(--ok-bg); color: var(--ok-text)}
  .status.cancelled { background: var(--err-bg); color: var(--err-text)}
  .detail-button { padding: 7px 10px; border: 1px solid var(--border-strong); border-radius: 6px; background: var(--surface-3); color: var(--accent-text); font-size: 10px}
  .empty-state { display: flex; min-height: 290px; align-items: center; justify-content: center; flex-direction: column; padding: 30px; text-align: center}
  .empty-icon { margin-bottom: 10px; color: var(--muted); font-size: 42px}
  .empty-state h3 { margin: 0 0 7px; font-size: 15px}
  .empty-state p { max-width: 360px; margin: 0 0 15px; color: var(--muted); font-size: 12px; line-height: 1.6}
  .panel-footer { padding: 13px 18px; border-top: 1px solid var(--border); color: var(--muted); font-size: 10px}
  .modal-backdrop { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 20px; background: #02060bd9}
  .detail-modal { width: 100%; max-width: 480px; padding: 22px; border: 1px solid var(--border-strong); border-radius: 13px; background: var(--surface-2); box-shadow: 0 20px 80px #0008}
  .modal-heading { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 22px}
  .close-button { align-self: flex-start; border: 0; background: transparent; color: var(--text-2); font-size: 25px}
  dl { display: grid; grid-template-columns: 140px 1fr; gap: 13px 10px; margin: 0 0 24px}
  dt { color: var(--muted); font-size: 11px}
  dd { margin: 0; overflow-wrap: anywhere; color: var(--text); font-size: 11px}
  .primary-button { padding: 10px 14px; border: 0; border-radius: 8px; background: var(--accent); color: white; font-size: 11px}
  @media (max-width: 760px) { .filters { flex-wrap: wrap} .search-box { flex-basis: 100%} .filters select { flex: 1; max-width: none; min-height: 38px} }
  @media (max-width: 520px) { .page-heading { align-items: flex-start; flex-direction: column} .stats-grid { grid-template-columns: 1fr} .panel-heading { padding: 16px} .filters { padding: 0 16px 16px} dl { grid-template-columns: 1fr; gap: 5px} dd { margin-bottom: 9px} }
</style>
