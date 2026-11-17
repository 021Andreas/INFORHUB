<script lang="ts">
  import { onMount } from 'svelte';
  import { api, apiUrl } from '#lib/api.js';
  import Icon from '#lib/components/Icon.svelte';

  type EventItem = { id:number; title:string; startAt?:string; status:string; registered:number; present:number; certificateAvailable:boolean };
  type Participant = { registrationId:number; userId:number; name:string; email:string; status:'registered'|'cancelled'; attendanceStatus:'present'|'absent'; checkedAt:string|null; certificateId:number|null; certificateNumber:string|null };
  type CertificateRow = { id:number; participant:string; email:string; event:string; eventId:number; certificateId:number|null; certificateNumber:string|null; certificateStatus:string|null; issuedAt:string|null };
  let events = $state<EventItem[]>([]);
  let participants = $state<Participant[]>([]);
  let certificateRows = $state<CertificateRow[]>([]);
  let selectedEventId = $state<number|null>(null);
  let loading = $state(true);
  let detailLoading = $state(false);
  let issuing = $state(false);
  let error = $state('');
  let notice = $state('');
  let search = $state('');
  let selectedEvent = $derived(events.find(e => e.id === selectedEventId) ?? null);
  let present = $derived(participants.filter(p => p.status === 'registered' && p.attendanceStatus === 'present'));
  let absent = $derived(participants.filter(p => p.status === 'registered' && p.attendanceStatus !== 'present'));
  let eligible = $derived(present.filter(p => !p.certificateId));
  let issued = $derived(present.filter(p => !!p.certificateId));
  let filtered = $derived(participants.filter(p => `${p.name} ${p.email}`.toLowerCase().includes(search.trim().toLowerCase())));

  onMount(async () => {
    try { events = await api<EventItem[]>('/api/admin/events?status=all'); }
    catch(e) { error = e instanceof Error ? e.message : 'Gagal memuat acara.'; }
    finally { loading = false; }
  });

  async function selectEvent(id:number) {
    selectedEventId = id; search = ''; error = ''; notice = ''; detailLoading = true;
    try {
      const [recap, rows] = await Promise.all([
        api<{ participants: Omit<Participant, 'status'>[] }>(`/api/events/${id}/attendance`),
        api<CertificateRow[]>(`/api/admin/certificates?eventId=${id}`)
      ]);
      // Endpoint attendance hanya mengembalikan pendaftaran berstatus 'registered'.
      // Status tidak dikirim backend, jadi tetapkan berdasarkan kontrak endpoint tersebut.
      participants = recap.participants.map(p => ({ ...p, status: 'registered' }));
      certificateRows = rows;
    } catch(e) { error = e instanceof Error ? e.message : 'Gagal memuat rekap kehadiran.'; }
    finally { detailLoading = false; }
  }

  async function issue() {
    if (!selectedEvent || issuing) return;
    if (!confirm(`Terbitkan sertifikat untuk ${eligible.length} peserta yang hadir pada acara “${selectedEvent.title}”?`)) return;
    issuing = true; error = ''; notice = '';
    try {
      const result = await api<{ eligible:number; issued:number; failed:{registrationId:number;error:string}[]; remaining:number }>(`/api/events/${selectedEvent.id}/certificates`, { method:'POST' });
      notice = `${result.issued} sertifikat berhasil diterbitkan. ${result.failed.length ? `${result.failed.length} gagal diproses.` : ''}${result.remaining ? ` Masih tersisa ${result.remaining} peserta.` : ''}`;
      await selectEvent(selectedEvent.id);
    } catch(e) { error = e instanceof Error ? e.message : 'Penerbitan sertifikat gagal.'; }
    finally { issuing = false; }
  }
  function dateLabel(v?:string|null) { if(!v)return '—'; const d=new Date(v); return Number.isNaN(d.getTime())?'—':d.toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'}); }
  function download(id:number) { window.open(apiUrl(`/api/certificates/${id}/download`), '_blank', 'noopener'); }
</script>

<svelte:head><title>Penerbitan Sertifikat | INFORHUB</title></svelte:head>
<section class="page">
  <header class="heading"><div><div class="breadcrumb">Penyelenggara / Sertifikat</div><h1>{selectedEvent ? 'Penerbitan Sertifikat' : 'Sertifikat Acara'}</h1><p>{selectedEvent ? `Pemeriksaan kehadiran dan penerbitan untuk ${selectedEvent.title}.` : 'Pilih acara untuk memeriksa kelayakan peserta dan menerbitkan sertifikat.'}</p></div>{#if selectedEvent}<button class="secondary" onclick={() => {selectedEventId=null;participants=[];certificateRows=[];error='';notice='';}}>Semua acara</button>{/if}</header>
  {#if error}<div class="alert">{error}</div>{/if}{#if notice}<div class="success">{notice}</div>{/if}
  {#if loading}<div class="state">Memuat acara...</div>
  {:else if !selectedEvent}
    {#if !events.length}<div class="state">Belum ada acara.</div>{:else}<div class="event-grid">{#each events as e (e.id)}<button class="event-card" onclick={() => selectEvent(e.id)}><span class="event-icon"><Icon name="award" size={22}/></span><span><strong>{e.title}</strong><small>{dateLabel(e.startAt)} · {e.status}</small></span><b>{e.present ?? 0} hadir · Kelola →</b></button>{/each}</div>{/if}
  {:else}
    <section class="banner"><div><small>ACARA DIPILIH</small><h2>{selectedEvent.title}</h2><p>Status acara: {selectedEvent.status}</p></div><a class="secondary" href={`/penyelenggara/sertifikat/template?eventId=${selectedEvent.id}`}>Kelola template</a></section>
    {#if detailLoading}<div class="state">Memuat rekap kehadiran...</div>{:else}
      <div class="stats"><article><span>Terdaftar aktif</span><strong>{participants.filter(p=>p.status==='registered').length}</strong></article><article><span>Hadir</span><strong>{present.length}</strong></article><article><span>Belum hadir</span><strong>{absent.length}</strong></article><article><span>Sudah bersertifikat</span><strong>{issued.length}</strong></article><article><span>Layak diterbitkan</span><strong>{eligible.length}</strong></article></div>
      <section class="panel"><div class="panel-head"><div><h2>Pemeriksaan kelayakan</h2><p>Hanya peserta terdaftar dengan kehadiran valid yang dapat menerima sertifikat.</p></div><button class="primary" onclick={issue} disabled={issuing || selectedEvent.status !== 'completed' || !selectedEvent.certificateAvailable || eligible.length===0}>{issuing?'Menerbitkan...':`Terbitkan ${eligible.length} sertifikat`}</button></div>
        {#if selectedEvent.status !== 'completed'}<p class="hint">Penerbitan aktif setelah status acara menjadi completed.</p>{:else if !selectedEvent.certificateAvailable}<p class="hint">Acara ini belum diaktifkan untuk penerbitan sertifikat.</p>{/if}
        <div class="toolbar"><label><Icon name="search" size={16}/><input bind:value={search} placeholder="Cari nama atau email peserta"/></label></div>
        <div class="table-wrap"><table><thead><tr><th>Peserta</th><th>Pendaftaran</th><th>Kehadiran</th><th>Waktu check-in</th><th>Sertifikat</th><th>Aksi</th></tr></thead><tbody>
        {#each filtered as p (p.registrationId)}<tr><td><strong>{p.name}</strong><small>{p.email}</small></td><td>{p.status==='registered'?'Terdaftar':'Dibatalkan'}</td><td><span class:good={p.attendanceStatus==='present'} class:bad={p.attendanceStatus!=='present'}>{p.attendanceStatus==='present'?'Hadir':'Belum hadir'}</span></td><td>{dateLabel(p.checkedAt)}</td><td>{p.certificateNumber ?? 'Belum terbit'}</td><td>{#if p.certificateId}<button class="link" onclick={() => download(p.certificateId!)}>Unduh PDF</button>{:else if p.attendanceStatus==='present'}Menunggu penerbitan{:else}—{/if}</td></tr>{/each}
        </tbody></table></div>
      </section>
    {/if}
  {/if}
</section>
<style>
.page{max-width:1400px;margin:auto;color:var(--text)}.heading{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:22px}.breadcrumb{font-size:11px;color:var(--muted);margin-bottom:8px}h1{font-size:27px;margin:0 0 7px}.heading p,.banner p{font-size:12px;color:var(--muted);margin:0}.event-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.event-card{display:grid;grid-template-columns:44px 1fr;gap:12px;text-align:left;padding:17px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);color:var(--text);cursor:pointer}.event-icon{grid-row:span 2;width:44px;height:44px;display:grid;place-items:center;border-radius:9px;background:var(--accent-soft);color:var(--accent-text)}.event-card strong,.event-card small{display:block}.event-card strong{font-size:13px}.event-card small{font-size:10px;color:var(--muted);margin-top:5px}.event-card b{grid-column:2;font-size:10px;color:var(--accent-text)}.secondary,.primary{display:inline-flex;align-items:center;justify-content:center;padding:10px 13px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface);color:var(--text);font-size:11px;text-decoration:none;cursor:pointer}.primary{background:var(--accent);color:white;border-color:var(--accent)}button:disabled{opacity:.45;cursor:not-allowed}.banner,.panel{border:1px solid var(--border);border-radius:11px;background:var(--surface-2);padding:18px;margin-bottom:15px}.banner{display:flex;justify-content:space-between;align-items:center;gap:12px}.banner small{font-size:9px;color:var(--muted);letter-spacing:1px}.banner h2{font-size:17px;margin:6px 0}.stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:15px}.stats article{padding:15px;border:1px solid var(--border);border-radius:9px;background:var(--surface-2)}.stats span,.stats strong{display:block}.stats span{font-size:10px;color:var(--muted)}.stats strong{font-size:23px;margin-top:7px}.panel{padding:0;overflow:hidden}.panel-head{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:17px}.panel-head h2{font-size:14px;margin:0 0 5px}.panel-head p,.hint{font-size:10px;color:var(--muted);margin:0;line-height:1.6}.hint{padding:0 18px 12px}.toolbar{padding:0 18px 13px}.toolbar label{display:flex;align-items:center;gap:8px;padding:0 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface)}input{width:100%;padding:10px 0;border:0;outline:0;background:transparent;color:var(--text);font-size:11px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;text-align:left;white-space:nowrap}th,td{padding:12px 14px;border-top:1px solid var(--border);font-size:10px}th{background:var(--surface);color:var(--muted)}td strong,td small{display:block}td small{color:var(--muted);margin-top:4px}.good,.bad{padding:5px 8px;border-radius:20px}.good{background:#dcfce7;color:#166534}.bad{background:#fee2e2;color:#991b1b}.link{border:0;background:none;color:var(--accent-text);cursor:pointer;font-size:10px}.state{padding:40px;text-align:center;color:var(--muted);font-size:12px}.alert,.success{padding:12px;border-radius:8px;margin-bottom:13px;font-size:11px}.alert{color:var(--err-text);border:1px solid var(--err-text)}.success{color:#166534;background:#dcfce7}@media(max-width:800px){.event-grid,.stats{grid-template-columns:1fr 1fr}.heading,.panel-head,.banner{align-items:flex-start;flex-direction:column}}@media(max-width:480px){.event-grid,.stats{grid-template-columns:1fr}}
</style>
