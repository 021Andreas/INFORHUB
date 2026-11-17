<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '#lib/api.js';
  import Icon from '#lib/components/Icon.svelte';

  type RegistrationStatus = 'registered' | 'cancelled';
  type Participant = {
    registrationId: number; userId: number; name: string; email: string; nim?: string | null;
    status: RegistrationStatus; registeredAt: string; attendanceStatus?: 'present' | 'absent';
    checkedAt?: string | null; certificateId?: number | null; certificateNumber?: string | null;
    registrationCode?: string | null; eventId?: number; eventTitle?: string;
  };
  type EventItem = { id: number; title: string; startAt?: string; location?: string; status?: string; registered?: number };

  let participants = $state<Participant[]>([]);
  let events = $state<EventItem[]>([]);
  let loading = $state(true);
  let participantsLoading = $state(false);
  let error = $state('');
  let selectedEventId = $state<number | null>(null);
  let search = $state('');
  let statusFilter = $state('all');
  let selectedParticipant = $state<Participant | null>(null);

  onMount(async () => {
    loading = true;
    try {
      events = await api<EventItem[]>('/api/admin/events?status=all');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Gagal memuat daftar acara.';
    } finally { loading = false; }
  });

  async function loadParticipants(eventId: number) {
    participantsLoading = true; error = ''; participants = [];
    try {
      const result = await api<{ event: { id: number; title: string }; total: number; participants: Participant[] }>(
        `/api/events/${eventId}/participants?status=all`
      );
      participants = result.participants.map((p) => ({ ...p, registrationCode: p.registrationCode ?? '' }));
    } catch (e) {
      error = e instanceof Error ? e.message : 'Gagal memuat peserta acara.';
    } finally { participantsLoading = false; }
  }

  function chooseEvent(eventId: number) { selectedEventId = eventId; search = ''; statusFilter = 'all'; void loadParticipants(eventId); }

  let selectedEvent = $derived(events.find((event) => event.id === selectedEventId) ?? null);
  let eventParticipants = $derived(participants);
  let filteredParticipants = $derived(eventParticipants.filter((p) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [p.name, p.email, p.registrationCode ?? ''].some((v) => v.toLowerCase().includes(query));
    return matchesSearch && (statusFilter === 'all' || p.status === statusFilter);
  }));
  const statusLabel: Record<RegistrationStatus, string> = { registered: 'Terdaftar', cancelled: 'Dibatalkan' };

  function formatDate(value?: string) {
    if (!value) return 'Jadwal belum tersedia';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  }
  function exportCsv() {
    if (!filteredParticipants.length || !selectedEvent) return;
    const rows = [['Nama', 'Email', 'Acara', 'Kode Pendaftaran', 'Status', 'Tanggal Daftar'], ...filteredParticipants.map((p) => [p.name, p.email, selectedEvent.title, p.registrationCode, statusLabel[p.status], formatDate(p.registeredAt)])];
    const csv = '\uFEFF' + rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url;
    link.download = `peserta-${selectedEvent.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`; link.click(); URL.revokeObjectURL(url);
  }
</script>

<svelte:head><title>Peserta Acara | INFORHUB Penyelenggara</title><meta name="description" content="Pilih acara untuk melihat peserta yang terdaftar." /></svelte:head>

<section class="page">
  <div class="heading">
    <div><div class="breadcrumb">Penyelenggara / Peserta Acara</div><h1>{selectedEvent ? 'Peserta Acara' : 'Peserta Acara'}</h1><p>{selectedEvent ? `Daftar peserta untuk ${selectedEvent.title}.` : 'Pilih salah satu acara untuk melihat dan mengelola pendaftarnya.'}</p></div>
    {#if selectedEvent}<button class="secondary" onclick={() => { selectedEventId = null; search = ''; statusFilter = 'all'; }}><Icon name="arrow-up-right" size={16}/> Semua acara</button>{/if}
  </div>

  {#if error}<div class="alert" role="alert">{error}</div>{/if}
  {#if loading}
    <div class="state">Memuat acara dan data peserta...</div>
  {:else if !selectedEvent}
    {#if events.length === 0}
      <div class="state"><Icon name="calendar" size={28}/><strong>Belum ada acara</strong><p>Buat acara terlebih dahulu agar dapat mengelola pesertanya.</p><a class="primary" href="/penyelenggara/acara">Buka Acara Saya</a></div>
    {:else}
      <div class="event-grid">
        {#each events as event (event.id)}
          <button class="event-card" onclick={() => chooseEvent(event.id)}>
            <div class="event-icon"><Icon name="calendar" size={21}/></div>
            <div class="event-copy"><strong>{event.title}</strong><span>{formatDate(event.startAt)}{event.location ? ` · ${event.location}` : ''}</span></div>
            <div class="event-bottom"><span><Icon name="users" size={14}/> {event.registered ?? '—'} pendaftar</span><span class="open-link">Lihat peserta <Icon name="arrow-up-right" size={15}/></span></div>
          </button>
        {/each}
      </div>
    {/if}
  {:else}
    <div class="event-banner"><div class="event-icon"><Icon name="calendar" size={22}/></div><div><span>ACARA DIPILIH</span><strong>{selectedEvent.title}</strong><small>{formatDate(selectedEvent.startAt)}{selectedEvent.location ? ` · ${selectedEvent.location}` : ''}</small></div></div>
    <div class="stats">
      <article><span>Total pendaftaran</span><strong>{eventParticipants.length}</strong></article>
      <article><span>Terdaftar</span><strong>{eventParticipants.filter(p => p.status === 'registered').length}</strong></article>
      <article><span>Dibatalkan</span><strong>{eventParticipants.filter(p => p.status === 'cancelled').length}</strong></article>
    </div>
    <section class="panel">
      <div class="panel-head"><div><h2>Daftar Peserta</h2><p>Data hanya menampilkan pendaftar acara yang dipilih.</p></div><button class="secondary" onclick={exportCsv} disabled={!filteredParticipants.length}><Icon name="share" size={15}/> Ekspor CSV</button></div>
      <div class="filters"><label><Icon name="search" size={17}/><input bind:value={search} placeholder="Cari nama, email, atau kode pendaftaran..." aria-label="Cari peserta"/></label><select bind:value={statusFilter} aria-label="Filter status"><option value="all">Semua status</option><option value="registered">Terdaftar</option><option value="cancelled">Dibatalkan</option></select><span class="count">{filteredParticipants.length} peserta</span></div>
      {#if participantsLoading}<div class="state">Memuat peserta acara...</div>{:else if filteredParticipants.length}
        <div class="table-wrap"><table><thead><tr><th>Peserta</th><th>Kode pendaftaran</th><th>Tanggal daftar</th><th>Status pendaftaran</th><th>Kehadiran</th><th>Sertifikat</th><th></th></tr></thead><tbody>
          {#each filteredParticipants as participant (participant.registrationId)}<tr><td><div class="person"><span class="avatar">{participant.name.trim().charAt(0).toUpperCase()}</span><span><strong>{participant.name}</strong><small>{participant.email}</small></span></div></td><td><code>{participant.registrationCode || '—'}</code></td><td>{formatDate(participant.registeredAt)}</td><td><span class="status" class:cancelled={participant.status === 'cancelled'}>{statusLabel[participant.status]}</span></td><td>{participant.attendanceStatus === 'present' ? 'Hadir' : 'Belum hadir'}</td><td>{participant.certificateNumber ?? 'Belum terbit'}</td><td><button class="detail" onclick={() => selectedParticipant = participant}>Detail</button></td></tr>{/each}
        </tbody></table></div>
      {:else}<div class="state"><Icon name="users" size={27}/><strong>{search || statusFilter !== 'all' ? 'Peserta tidak ditemukan' : 'Belum ada peserta'}</strong><p>{search || statusFilter !== 'all' ? 'Ubah kata kunci atau filter untuk melihat data lainnya.' : 'Peserta akan muncul setelah mendaftar pada acara ini.'}</p></div>{/if}
      <footer>Menampilkan {filteredParticipants.length} dari {eventParticipants.length} pendaftaran acara ini.</footer>
    </section>
  {/if}
</section>

{#if selectedParticipant}
  <div class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) selectedParticipant = null; }}><section class="modal" role="dialog" aria-modal="true" aria-labelledby="detail-title"><div class="modal-head"><div><h2 id="detail-title">Detail Pendaftaran</h2><p>Informasi peserta acara.</p></div><button class="close" aria-label="Tutup" onclick={() => selectedParticipant = null}>×</button></div><dl><dt>Nama peserta</dt><dd>{selectedParticipant.name}</dd><dt>Email</dt><dd>{selectedParticipant.email}</dd><dt>Acara</dt><dd>{selectedEvent?.title}</dd><dt>Kode pendaftaran</dt><dd><code>{selectedParticipant.registrationCode}</code></dd><dt>Tanggal pendaftaran</dt><dd>{formatDate(selectedParticipant.registeredAt)}</dd><dt>Status</dt><dd>{statusLabel[selectedParticipant.status]}</dd></dl><button class="primary" onclick={() => selectedParticipant = null}>Tutup detail</button></section></div>
{/if}

<style>
  .page{max-width:1500px;margin:auto;color:var(--text)}.heading{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:23px}.breadcrumb{color:var(--muted);font-size:11px;margin-bottom:8px}h1{font-size:27px;margin:0 0 7px}.heading p,.panel-head p,.modal-head p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}button,input,select{font:inherit}button{cursor:pointer}.secondary,.primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface);color:var(--text-2);font-size:11px}.primary{border-color:var(--accent);background:var(--accent);color:white}.secondary:disabled{opacity:.45;cursor:not-allowed}.event-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.event-card{display:grid;grid-template-columns:44px 1fr;gap:12px;padding:18px;border:1px solid var(--border);border-radius:11px;background:var(--surface-2);color:var(--text);text-align:left}.event-card:hover{border-color:var(--accent);transform:translateY(-1px)}.event-icon{display:grid;place-items:center;width:44px;height:44px;border-radius:10px;background:var(--accent-soft);color:var(--accent-text)}.event-copy{display:grid;gap:6px;min-width:0}.event-copy strong{font-size:13px}.event-copy span{font-size:10px;color:var(--muted);line-height:1.5}.event-bottom{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--border);color:var(--muted);font-size:10px}.event-bottom span{display:flex;align-items:center;gap:6px}.open-link{color:var(--accent-text);font-weight:700}.event-banner{display:flex;align-items:center;gap:14px;padding:17px 19px;margin-bottom:15px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2)}.event-banner>div:last-child{display:grid;gap:5px}.event-banner span{font-size:9px;letter-spacing:1px;color:var(--muted);font-weight:700}.event-banner strong{font-size:15px}.event-banner small{font-size:10px;color:var(--muted)}.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px}.stats article{display:grid;gap:8px;padding:17px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2)}.stats span{font-size:10px;color:var(--muted)}.stats strong{font-size:24px}.panel{overflow:hidden;border:1px solid var(--border);border-radius:11px;background:var(--surface-2)}.panel-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:19px}.panel-head h2{font-size:15px;margin:0 0 6px}.filters{display:flex;align-items:center;gap:10px;padding:0 19px 16px}.filters label{display:flex;align-items:center;gap:9px;flex:1;padding:0 11px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface);color:var(--muted)}.filters input{width:100%;min-width:0;padding:11px 0;border:0;outline:0;background:transparent;color:var(--text);font-size:11px}.filters select{padding:10px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface);color:var(--text);font-size:11px}.count{font-size:10px;color:var(--muted);white-space:nowrap}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left;white-space:nowrap}th{padding:13px 16px;background:var(--surface);color:var(--muted);font-size:10px}td{padding:13px 16px;border-top:1px solid var(--border);color:var(--text-2);font-size:11px}.person{display:flex;align-items:center;gap:10px}.person>span:last-child{display:grid;gap:4px}.person strong{font-size:11px;color:var(--text)}.person small{font-size:10px;color:var(--muted)}.avatar{display:grid;place-items:center;width:35px;height:35px;border-radius:50%;background:var(--accent-soft);color:var(--accent-text);font-weight:700}code{color:var(--accent-text);font-size:10px}.status{padding:5px 8px;border-radius:20px;background:var(--ok-bg);color:var(--ok-text);font-size:10px}.status.cancelled{background:var(--err-bg);color:var(--err-text)}.detail{padding:7px 10px;border:1px solid var(--border-strong);border-radius:6px;background:var(--surface);color:var(--accent-text);font-size:10px}footer{padding:13px 18px;border-top:1px solid var(--border);font-size:10px;color:var(--muted)}.state{display:flex;min-height:250px;align-items:center;justify-content:center;flex-direction:column;gap:9px;padding:30px;text-align:center;color:var(--muted);font-size:12px}.state strong{color:var(--text);font-size:14px}.state p{max-width:380px;margin:0 0 8px;line-height:1.6}.alert{padding:12px 14px;margin-bottom:15px;border:1px solid var(--err-text);border-radius:8px;color:var(--err-text);font-size:11px}.backdrop{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:20px;background:#02060bd9}.modal{width:100%;max-width:480px;padding:22px;border:1px solid var(--border-strong);border-radius:13px;background:var(--surface-2)}.modal-head{display:flex;justify-content:space-between;margin-bottom:20px}.modal-head h2{margin:0 0 5px;font-size:15px}.close{border:0;background:transparent;color:var(--text);font-size:25px}dl{display:grid;grid-template-columns:140px 1fr;gap:13px 10px;margin:0 0 22px}dt{font-size:11px;color:var(--muted)}dd{margin:0;font-size:11px;color:var(--text);overflow-wrap:anywhere}
  @media(max-width:700px){.event-grid{grid-template-columns:1fr}.heading{align-items:flex-start;flex-direction:column}.stats{grid-template-columns:1fr}.filters{flex-wrap:wrap}.filters label{flex-basis:100%}.filters select{flex:1}.panel-head{align-items:flex-start;flex-direction:column}dl{grid-template-columns:1fr;gap:5px}dd{margin-bottom:8px}}
</style>
