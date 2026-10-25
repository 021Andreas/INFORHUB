
<script lang="ts">
  import { goto } from '$app/navigation';

  type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

  type EventItem = {
    id: number;
    title: string;
    posterUrl: string | null;
    location: string;
    startAt: string;
    quota: number;
    registered: number;
    status: EventStatus;
  };

  // Akan diisi dari API backend nantinya.
  let events = $state<EventItem[]>([]);
  let search = $state('');
  let statusFilter = $state('all');

  const statusLabels: Record<EventStatus, string> = {
    draft: 'Draft',
    published: 'Dipublikasikan',
    cancelled: 'Dibatalkan',
    completed: 'Selesai'
  };

  let filteredEvents = $derived(
    events.filter((event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(search.toLowerCase()) ||
        event.location.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || event.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
  );

  function formatDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  }

  function createEvent() {
    goto('/admin/acara/form');
  }

  function editEvent(id: number) {
    goto(`/admin/acara/form?id=${id}`);
  }
</script>

<svelte:head>
  <title>Kelola Acara | INFORHUB Admin</title>
</svelte:head>

<section class="events-page">
  <div class="heading">
    <div>
      <div class="breadcrumb">Admin / Kelola Acara</div>
      <h1>Kelola Acara</h1>
      <p>Buat, atur, dan pantau publikasi acara INFORHUB.</p>
    </div>

    <button class="primary-button" onclick={createEvent}>
      <span>＋</span> Tambah Acara
    </button>
  </div>

  <div class="summary">
    <div class="summary-card">
      <span>Total acara</span>
      <strong>{events.length}</strong>
    </div>
    <div class="summary-card">
      <span>Dipublikasikan</span>
      <strong>{events.filter(e => e.status === 'published').length}</strong>
    </div>
    <div class="summary-card">
      <span>Draft</span>
      <strong>{events.filter(e => e.status === 'draft').length}</strong>
    </div>
    <div class="summary-card">
      <span>Total pendaftar</span>
      <strong>{events.reduce((sum, e) => sum + e.registered, 0)}</strong>
    </div>
  </div>

  <div class="panel">
    <div class="toolbar">
      <div>
        <h2>Daftar Acara</h2>
        <p>Kelola semua informasi acara dari satu tempat.</p>
      </div>

      <div class="filters">
        <label class="search">
          <span>⌕</span>
          <input
            bind:value={search}
            placeholder="Cari judul atau lokasi..."
            aria-label="Cari acara"
          />
        </label>

        <select bind:value={statusFilter} aria-label="Filter status">
          <option value="all">Semua status</option>
          <option value="draft">Draft</option>
          <option value="published">Dipublikasikan</option>
          <option value="cancelled">Dibatalkan</option>
          <option value="completed">Selesai</option>
        </select>
      </div>
    </div>

    {#if filteredEvents.length > 0}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Acara</th>
              <th>Jadwal</th>
              <th>Lokasi</th>
              <th>Pendaftar</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredEvents as event (event.id)}
              <tr>
                <td>
                  <div class="event-cell">
                    {#if event.posterUrl}
                      <img src={event.posterUrl} alt={`Poster ${event.title}`} />
                    {:else}
                      <div class="poster-placeholder">▣</div>
                    {/if}
                    <strong>{event.title}</strong>
                  </div>
                </td>
                <td>{formatDate(event.startAt)}</td>
                <td>{event.location}</td>
                <td>{event.registered} / {event.quota}</td>
                <td>
                  <span class="status {event.status}">
                    {statusLabels[event.status]}
                  </span>
                </td>
                <td>
                  <button class="edit-button" onclick={() => editEvent(event.id)}>
                    Edit
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <div class="empty">
        <div class="empty-icon">▣</div>
        <h3>{search || statusFilter !== 'all' ? 'Acara tidak ditemukan' : 'Belum ada acara'}</h3>
        <p>
          {search || statusFilter !== 'all'
            ? 'Coba ubah kata kunci atau filter status.'
            : 'Acara yang kamu buat akan tampil di halaman ini.'}
        </p>
        {#if !search && statusFilter === 'all'}
          <button class="primary-button" onclick={createEvent}>
            ＋ Buat Acara Pertama
          </button>
        {/if}
      </div>
    {/if}

    <div class="panel-footer">
      Menampilkan {filteredEvents.length} dari {events.length} acara
    </div>
  </div>
</section>

<style>
  .events-page { max-width: 1600px; margin: auto; color: #e7edf7; }
  .heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px; }
  .breadcrumb { color: #7f94ad; font-size: 11px; margin-bottom: 9px; }
  h1 { font-size: 27px; margin: 0 0 6px; }
  .heading p, .toolbar p { margin: 0; color: #91a2b8; font-size: 12px; }
  button { cursor: pointer; }
  .primary-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 16px; border: 0; border-radius: 8px; background: #247cf4; color: white; font-size: 12px; font-weight: 650; }
  .primary-button:hover { background: #408fff; }
  .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
  .summary-card { padding: 17px; border: 1px solid #223145; border-radius: 10px; background: #0d1722; }
  .summary-card span { display: block; color: #9bacc1; font-size: 11px; margin-bottom: 9px; }
  .summary-card strong { font-size: 25px; }
  .panel { overflow: hidden; border: 1px solid #223145; border-radius: 11px; background: #0d1722; }
  .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 20px; }
  .toolbar h2 { margin: 0 0 6px; font-size: 15px; }
  .filters { display: flex; gap: 9px; }
  .search, .filters select { display: flex; align-items: center; gap: 8px; min-height: 39px; padding: 0 11px; border: 1px solid #2a3b50; border-radius: 8px; background: #101c29; color: #cbd7e7; }
  .search input { width: 190px; border: 0; outline: 0; background: transparent; color: white; font-size: 11px; }
  .filters select { font-size: 11px; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; text-align: left; white-space: nowrap; }
  th { padding: 13px 17px; color: #8fa1b8; background: #101b28; font-size: 10px; font-weight: 600; }
  td { padding: 14px 17px; border-top: 1px solid #1e2c3d; color: #bac8d9; font-size: 11px; }
  .event-cell { display: flex; align-items: center; gap: 10px; max-width: 230px; white-space: normal; }
  .event-cell img, .poster-placeholder { width: 43px; height: 43px; flex-shrink: 0; object-fit: cover; border-radius: 7px; }
  .poster-placeholder { display: grid; place-items: center; background: #17283c; color: #6e9bd4; font-size: 20px; }
  .event-cell strong { color: #e4ecf8; font-size: 11px; }
  .status { display: inline-block; padding: 5px 8px; border-radius: 20px; font-size: 10px; }
  .status.published { background: #12352d; color: #53d6a7; }
  .status.draft { background: #332b1b; color: #e9c36a; }
  .status.cancelled { background: #3a2027; color: #ff8c9a; }
  .status.completed { background: #1d2b41; color: #9dc6ff; }
  .edit-button { padding: 7px 10px; border: 1px solid #30445c; border-radius: 6px; background: #152337; color: #78b4ff; font-size: 10px; }
  .empty { display: flex; min-height: 300px; align-items: center; justify-content: center; flex-direction: column; padding: 30px; text-align: center; }
  .empty-icon { margin-bottom: 12px; color: #6f86a2; font-size: 40px; }
  .empty h3 { margin: 0 0 7px; font-size: 15px; }
  .empty p { margin: 0 0 17px; color: #91a2b8; font-size: 12px; }
  .panel-footer { padding: 13px 18px; border-top: 1px solid #1e2c3d; color: #8093aa; font-size: 10px; }
  @media (max-width: 900px) {
    .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .toolbar { align-items: flex-start; flex-direction: column; }
    .filters { width: 100%; }
    .search { flex: 1; }
    .search input { width: 100%; min-width: 0; }
  }
  @media (max-width: 520px) {
    .heading { align-items: flex-start; flex-direction: column; }
    .summary { gap: 8px; }
    .summary-card { padding: 13px; }
    .summary-card strong { font-size: 21px; }
    .filters { flex-direction: column; }
    .filters select { min-height: 38px; }
  }
</style>
