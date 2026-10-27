<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '#lib/api.js';
  import Icon from '#lib/components/Icon.svelte';
  import StatCard from '#lib/components/StatCard.svelte';
  import EmptyState from '#lib/components/EmptyState.svelte';

  type Stats = { totalEvents: number; publishedEvents: number; pendingEvents: number; totalRegistrations: number; totalPresent: number; totalUsers: number };
  type EventItem = { id: number; title: string; location: string; startAt: string; status: string; registered: number; present: number; quota: number; category?: string | null };
  type Participant = { id: number; name: string; email: string; eventTitle: string; registeredAt: string; status: string };
  type Certificate = { id: number; participant: string; event: string; certificateNumber: string | null; issuedAt: string | null };

  let stats = $state<Stats | null>(null);
  let events = $state<EventItem[]>([]);
  let participants = $state<Participant[]>([]);
  let certificates = $state<Certificate[]>([]);
  let loading = $state(true);
  let loadError = $state('');

  onMount(async () => {
    const results = await Promise.allSettled([
      api<Stats>('/api/admin/stats'),
      api<EventItem[]>('/api/admin/events?status=all&limit=5'),
      api<Participant[]>('/api/admin/participants?status=all&limit=5'),
      api<Certificate[]>('/api/admin/certificates?limit=5')
    ]);
    if (results[0].status === 'fulfilled') stats = results[0].value;
    if (results[1].status === 'fulfilled') events = results[1].value;
    if (results[2].status === 'fulfilled') participants = results[2].value;
    if (results[3].status === 'fulfilled') certificates = results[3].value;
    if (results.every((r) => r.status === 'rejected')) loadError = 'Data dashboard belum dapat dimuat. Pastikan backend aktif dan akun memiliki akses pengelola.';
    loading = false;
  });

  const count = (n: number | undefined) => new Intl.NumberFormat('id-ID').format(n ?? 0);
  const dateLabel = (value: string) => { const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(d); };
  const eventStatus = (status: string) => ({ published: 'Dipublikasikan', pending: 'Menunggu persetujuan', draft: 'Draft', rejected: 'Ditolak', completed: 'Selesai', cancelled: 'Dibatalkan' }[status] ?? status);
</script>

<svelte:head><title>Dashboard | INFORHUB Admin</title><meta name="description" content="Ringkasan data acara, peserta, absensi, dan sertifikat INFORHUB." /></svelte:head>

<div class="dashboard">
  <div class="page-heading"><div><p class="eyebrow">PANEL PENGELOLA</p><h1>Dashboard</h1><p class="subtitle">Pantau acara, pendaftaran, dan aktivitas peserta dari satu tempat.</p></div><a class="refresh" href="/admin"><Icon name="chart" size={16}/> Muat ulang</a></div>
  {#if loadError}<div class="error-banner"><Icon name="info" size={18}/><span>{loadError}</span></div>{/if}
  <section class="stats-grid" aria-label="Statistik utama">
    <StatCard label="Total Acara" value={loading ? '—' : (stats ? count(stats.totalEvents) : '—')} note={`${(stats ? count(stats.publishedEvents) : '—')} acara dipublikasikan`} icon="calendar" tone="blue" />
    <StatCard label="Total Pendaftar" value={loading ? '—' : (stats ? count(stats.totalRegistrations) : '—')} note="Pendaftaran aktif dari database" icon="users" tone="green" />
    <StatCard label="Peserta Hadir" value={loading ? '—' : (stats ? count(stats.totalPresent) : '—')} note="Kehadiran yang tercatat" icon="check" tone="amber" />
    <StatCard label="Pengguna Terdaftar" value={loading ? '—' : (stats ? count(stats.totalUsers) : '—')} note={`${(stats ? count(stats.pendingEvents) : '—')} acara menunggu persetujuan`} icon="user" tone="violet" />
  </section>

  <section class="content-grid">
    <article class="panel wide-panel">
      <div class="panel-heading"><div><p class="eyebrow">AKTIVITAS</p><h2>Acara terbaru</h2></div><a href="/admin/acara" class="view-all">Kelola acara <Icon name="arrow-up-right" size={16}/></a></div>
      {#if loading}<div class="loading-line"><span></span>Memuat data acara…</div>
      {:else if events.length === 0}<EmptyState icon="calendar" title="Belum ada acara" description="Acara dari database akan muncul di sini setelah tersedia." />
      {:else}<div class="table-wrap"><table><thead><tr><th>Nama acara</th><th>Jadwal</th><th>Status</th><th>Pendaftar</th></tr></thead><tbody>{#each events.slice(0,5) as event (event.id)}<tr><td><strong>{event.title}</strong><small>{event.location}</small></td><td>{dateLabel(event.startAt)}</td><td><span class={`status status-${event.status}`}>{eventStatus(event.status)}</span></td><td>{count(event.registered)} / {count(event.quota)}</td></tr>{/each}</tbody></table></div>{/if}
    </article>
    <article class="panel side-panel">
      <div class="panel-heading"><div><p class="eyebrow">RINGKASAN</p><h2>Status acara</h2></div><Icon name="chart" size={19}/></div>
      <div class="status-summary"><div><span class="status-dot blue"></span><span>Dipublikasikan</span><strong>{(stats ? count(stats.publishedEvents) : '—')}</strong></div><div><span class="status-dot amber"></span><span>Menunggu persetujuan</span><strong>{(stats ? count(stats.pendingEvents) : '—')}</strong></div><div><span class="status-dot slate"></span><span>Total acara</span><strong>{(stats ? count(stats.totalEvents) : '—')}</strong></div></div>
      <a href="/admin/acara" class="secondary-link">Lihat semua acara <Icon name="arrow-up-right" size={15}/></a>
    </article>
    <article class="panel">
      <div class="panel-heading"><div><p class="eyebrow">PENDAFTARAN</p><h2>Peserta terbaru</h2></div><a href="/admin/peserta" class="view-all">Lihat semua <Icon name="arrow-up-right" size={16}/></a></div>
      {#if loading}<div class="loading-line"><span></span>Memuat peserta…</div>{:else if participants.length === 0}<EmptyState icon="users" title="Belum ada pendaftar" description="Pendaftar yang masuk akan ditampilkan di sini." />{:else}<div class="simple-list">{#each participants.slice(0,5) as participant (participant.id)}<div class="list-row"><span class="avatar">{participant.name.slice(0,1).toUpperCase()}</span><div class="list-copy"><strong>{participant.name}</strong><small>{participant.eventTitle} · {dateLabel(participant.registeredAt)}</small></div><span class={`status status-${participant.status}`}>{participant.status === 'registered' ? 'Terdaftar' : 'Dibatalkan'}</span></div>{/each}</div>{/if}
    </article>
    <article class="panel">
      <div class="panel-heading"><div><p class="eyebrow">SERTIFIKAT</p><h2>Sertifikat terbaru</h2></div><a href="/admin/sertifikat" class="view-all">Lihat semua <Icon name="arrow-up-right" size={16}/></a></div>
      {#if loading}<div class="loading-line"><span></span>Memuat sertifikat…</div>{:else if certificates.length === 0}<EmptyState icon="certificate" title="Belum ada sertifikat" description="Sertifikat yang diterbitkan dari data kehadiran akan muncul di sini." />{:else}<div class="simple-list">{#each certificates.slice(0,5) as certificate (certificate.id)}<div class="list-row"><span class="certificate-mark"><Icon name="certificate" size={18}/></span><div class="list-copy"><strong>{certificate.participant}</strong><small>{certificate.event}</small></div><span class="certificate-number">{certificate.certificateNumber ?? 'Belum terbit'}</span></div>{/each}</div>{/if}
    </article>
  </section>
</div>

<style>
.dashboard{max-width:1600px;margin:0 auto}.page-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;margin-bottom:25px}.eyebrow{margin:0 0 8px;color:var(--accent-text);font-size:9px;font-weight:800;letter-spacing:1.35px}.page-heading h1{margin:0 0 8px;font-size:29px;letter-spacing:-.8px}.subtitle{margin:0;color:var(--muted);font-size:12px;line-height:1.7}.refresh,.view-all,.secondary-link{display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;font-size:11px;font-weight:650}.refresh{height:39px;padding:0 13px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface);color:var(--text-2)}.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:15px}.content-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:15px}.panel{min-width:0;overflow:hidden;border:1px solid var(--border);border-radius:13px;background:var(--surface-2)}.wide-panel{grid-column:auto}.panel-heading{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:20px 21px;border-bottom:1px solid var(--border)}.panel-heading h2{margin:0;font-size:15px;letter-spacing:-.2px}.panel-heading .eyebrow{margin-bottom:5px}.panel-heading> :global(svg){color:var(--accent-text)}.view-all,.secondary-link{color:var(--accent-text);white-space:nowrap}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;text-align:left;white-space:nowrap}th{padding:12px 18px;background:var(--surface);color:var(--muted);font-size:9px;letter-spacing:.5px;text-transform:uppercase}td{padding:14px 18px;border-top:1px solid var(--border);color:var(--text-2);font-size:11px}td strong,td small{display:block}td strong{max-width:260px;overflow:hidden;color:var(--text);text-overflow:ellipsis;font-size:11px}td small{margin-top:5px;color:var(--muted);font-size:10px}.status{display:inline-flex;align-items:center;padding:5px 8px;border:1px solid var(--border-strong);border-radius:6px;background:var(--surface-3);color:var(--text-2);font-size:9px}.status-published,.status-registered{border-color:var(--ok-text);background:var(--ok-bg);color:var(--ok-text)}.status-pending{border-color:var(--warn-text);background:var(--warn-bg);color:var(--warn-text)}.status-draft{color:var(--text-2)}.status-rejected,.status-cancelled{border-color:var(--err-text);background:var(--err-bg);color:var(--err-text)}.status-completed{border-color:var(--border-strong);background:var(--surface-3);color:var(--accent-text)}.status-summary{padding:10px 20px 5px}.status-summary>div{display:flex;align-items:center;gap:10px;padding:13px 0;border-bottom:1px solid var(--border);color:var(--text-2);font-size:11px}.status-summary>div:last-child{border-bottom:0}.status-summary strong{margin-left:auto;color:var(--text);font-size:13px}.status-dot{width:8px;height:8px;border-radius:50%;background:var(--muted)}.status-dot.blue{background:var(--accent)}.status-dot.amber{background:var(--warn-text)}.status-dot.slate{background:var(--border-strong)}.secondary-link{margin:5px 20px 18px}.simple-list{padding:4px 20px 10px}.list-row{display:flex;align-items:center;gap:11px;padding:13px 0;border-bottom:1px solid var(--border)}.list-row:last-child{border-bottom:0}.avatar,.certificate-mark{display:grid;place-items:center;flex-shrink:0;width:36px;height:36px;border-radius:10px;background:var(--surface-3);color:var(--accent-text);font-size:13px;font-weight:700}.certificate-mark{background:var(--surface-3);color:var(--accent-text)}.list-copy{display:grid;gap:5px;min-width:0;flex:1}.list-copy strong{overflow:hidden;color:var(--text);text-overflow:ellipsis;white-space:nowrap;font-size:11px}.list-copy small{overflow:hidden;color:var(--muted);text-overflow:ellipsis;white-space:nowrap;font-size:10px}.certificate-number{max-width:100px;overflow:hidden;color:var(--muted);text-overflow:ellipsis;font-size:9px}.error-banner{display:flex;align-items:center;gap:10px;margin-bottom:15px;padding:12px 14px;border:1px solid var(--err-text);border-radius:9px;background:var(--surface);color:var(--err-text);font-size:11px}.loading-line{display:flex;align-items:center;gap:10px;padding:35px 20px;color:var(--muted);font-size:11px}.loading-line span{width:14px;height:14px;border:2px solid var(--border-strong);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:1100px){.stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.content-grid{grid-template-columns:1fr 1fr}.wide-panel{grid-column:1/-1}}@media(max-width:720px){.page-heading{align-items:flex-start;flex-direction:column}.page-heading h1{font-size:25px}.stats-grid{gap:9px}.content-grid{grid-template-columns:1fr}.wide-panel{grid-column:auto}.panel-heading{padding:17px}.stats-grid :global(.stat-card){padding:14px;gap:10px}.stats-grid :global(.stat-info strong){font-size:23px}.stats-grid :global(.stat-icon){width:36px;height:36px}.stats-grid :global(.stat-info small){font-size:9px}}
</style>
