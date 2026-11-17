<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import Icon from '#lib/components/Icon.svelte';
  import { api, apiUpload } from '#lib/api.js';

  type ElementKind = 'text' | 'placeholder' | 'shape' | 'image' | 'qr';
  type DesignElement = {
    id: string;
    type: ElementKind;
    name: string;
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    color: string;
    bold: boolean;
    align: 'left' | 'center' | 'right';
    background: string;
    src?: string;
  };
  type TemplateDraft = { name: string; orientation: 'landscape' | 'portrait'; background: string; elements: DesignElement[]; updatedAt: string };

  const STORE_KEY = 'inforhub-organizer-certificate-drafts-v1';
  type EventItem = { id: number; title: string; startAt?: string; status?: string };
  let events = $state<EventItem[]>([]);
  const eventId = $derived(Number(page.url.searchParams.get('eventId')) || null);
  let selectedEvent = $derived(events.find((event) => event.id === eventId) ?? null);
  function storeKey() { return eventId ? `${STORE_KEY}-event-${eventId}` : STORE_KEY; }
  const W = 1123;
  const H = 794;
  const placeholders = [
    { label: 'Nama peserta', value: '{{participant_name}}' },
    { label: 'Nama acara', value: '{{event_title}}' },
    { label: 'Tanggal acara', value: '{{event_date}}' },
    { label: 'Nomor sertifikat', value: '{{certificate_number}}' },
    { label: 'Tanggal terbit', value: '{{issue_date}}' },
    { label: 'Nama penyelenggara', value: '{{organizer_name}}' }
  ];

  let templateName = $state('Template Sertifikat Baru');
  let orientation = $state<'landscape' | 'portrait'>('landscape');
  let background = $state('#ffffff');
  let elements = $state<DesignElement[]>([]);
  let selectedId = $state('');
  let drafts = $state<TemplateDraft[]>([]);
  let message = $state('');
  let messageType = $state<'success' | 'warning'>('success');
  let dragging = $state(false);
  let dragOffset = { x: 0, y: 0 };
  let canvasElement: HTMLDivElement;
  let imageInput: HTMLInputElement;
  let jsonInput: HTMLInputElement;
  let savedAt = $state('');
  let showGrid = $state(false);
  type Submission = { id: number; name: string; eventId?: number; status: 'draft' | 'pending' | 'approved' | 'rejected'; submittedAt?: string | null; reviewedAt?: string | null; reviewNote?: string | null; updatedAt?: string };
  let submissions = $state<Submission[]>([]);
  let submitting = $state(false);
  let historyLoading = $state(false);
  let eventSubmissionLocked = $derived(submissions.some((item) => item.status === 'pending' || item.status === 'approved')); 

  let selected = $derived(elements.find((item) => item.id === selectedId));
  let canvasWidth = $derived(orientation === 'landscape' ? W : H);
  let canvasHeight = $derived(orientation === 'landscape' ? H : W);

  onMount(async () => {
    try { events = await api<EventItem[]>('/api/admin/events?status=all'); }
    catch (e) { message = e instanceof Error ? `Daftar acara gagal dimuat: ${e.message}` : 'Daftar acara gagal dimuat.'; messageType = 'warning'; }
    try {
      const raw = localStorage.getItem(storeKey());
      if (raw) drafts = JSON.parse(raw) as TemplateDraft[];
    } catch { drafts = []; }
    if (!elements.length) loadStarter();
    if (eventId) void loadSubmissionHistory();
  });

  function makeId() { return `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
  function addElement(type: ElementKind, content = '') {
    const defaults: Record<ElementKind, Partial<DesignElement>> = {
      text: { name: 'Teks', content: content || 'Teks baru', width: 360, height: 70, fontSize: 34, color: '#183b69', bold: false, align: 'center' },
      placeholder: { name: 'Placeholder', content: content || '{{participant_name}}', width: 500, height: 70, fontSize: 32, color: '#183b69', bold: true, align: 'center' },
      shape: { name: 'Garis dekoratif', content: '', width: 420, height: 8, fontSize: 16, color: '#c49a45', background: '#c49a45', bold: false, align: 'center' },
      image: { name: 'Gambar', content: '', width: 180, height: 110, fontSize: 16, color: '#183b69', bold: false, align: 'center' },
      qr: { name: 'QR verifikasi', content: 'QR VERIFIKASI', width: 110, height: 110, fontSize: 12, color: '#183b69', bold: true, align: 'center' }
    };
    const d = defaults[type];
    const item: DesignElement = {
      id: makeId(), type, name: d.name!, content: d.content!,
      x: Math.max(20, Math.round((canvasWidth - (d.width ?? 200)) / 2)),
      y: Math.max(20, Math.round((canvasHeight - (d.height ?? 60)) / 2)),
      width: d.width!, height: d.height!, fontSize: d.fontSize!, color: d.color!,
      bold: d.bold!, align: d.align!, background: d.background ?? '#ffffff'
    };
    elements.push(item);
    selectedId = item.id;
  }

  function loadStarter() {
    elements = [
      { id: makeId(), type: 'text', name: 'Identitas', content: 'INFORHUB · INFORMATIKA', x: 300, y: 70, width: 520, height: 35, fontSize: 20, color: '#315d91', bold: true, align: 'center' },
      { id: makeId(), type: 'shape', name: 'Garis atas', content: '', x: 250, y: 130, width: 620, height: 5, fontSize: 16, color: '#c49a45', background: '#c49a45', bold: false, align: 'center' },
      { id: makeId(), type: 'text', name: 'Judul', content: 'SERTIFIKAT', x: 250, y: 190, width: 620, height: 75, fontSize: 56, color: '#183b69', bold: true, align: 'center' },
      { id: makeId(), type: 'text', name: 'Pengantar', content: 'Diberikan kepada', x: 300, y: 295, width: 520, height: 40, fontSize: 22, color: '#475569', bold: false, align: 'center' },
      { id: makeId(), type: 'placeholder', name: 'Nama peserta', content: '{{participant_name}}', x: 200, y: 345, width: 720, height: 65, fontSize: 38, color: '#183b69', bold: true, align: 'center' },
      { id: makeId(), type: 'text', name: 'Keterangan', content: 'Atas partisipasinya dalam kegiatan', x: 260, y: 430, width: 600, height: 35, fontSize: 20, color: '#475569', bold: false, align: 'center' },
      { id: makeId(), type: 'placeholder', name: 'Nama acara', content: '{{event_title}}', x: 220, y: 475, width: 680, height: 50, fontSize: 27, color: '#183b69', bold: true, align: 'center' },
      { id: makeId(), type: 'text', name: 'Penandatangan', content: 'Nama Penanggung Jawab', x: 280, y: 650, width: 300, height: 35, fontSize: 17, color: '#183b69', bold: true, align: 'center' },
      { id: makeId(), type: 'qr', name: 'QR verifikasi', content: 'QR VERIFIKASI', x: 920, y: 630, width: 110, height: 110, fontSize: 12, color: '#183b69', bold: true, align: 'center' }
    ];
    selectedId = elements[4]?.id ?? '';
  }

  function startDrag(event: PointerEvent, item: DesignElement) {
    event.preventDefault();
    selectedId = item.id;
    const rect = canvasElement.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    dragOffset = { x: event.clientX * scaleX - item.x, y: event.clientY * scaleY - item.y };
    dragging = true;
    canvasElement.setPointerCapture(event.pointerId);
  }
  function moveElement(event: PointerEvent) {
    if (!dragging || !selected) return;
    const rect = canvasElement.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    selected.x = Math.max(0, Math.min(canvasWidth - selected.width, Math.round(event.clientX * scaleX - dragOffset.x)));
    selected.y = Math.max(0, Math.min(canvasHeight - selected.height, Math.round(event.clientY * scaleY - dragOffset.y)));
  }
  function stopDrag() { dragging = false; }
  function removeSelected() {
    if (!selected) return;
    elements = elements.filter((item) => item.id !== selectedId);
    selectedId = elements.at(-1)?.id ?? '';
  }
  function duplicateSelected() {
    if (!selected) return;
    const copy = { ...selected, id: makeId(), name: `${selected.name} (salinan)`, x: selected.x + 24, y: selected.y + 24 };
    elements.push(copy);
    selectedId = copy.id;
  }
  function moveLayer(direction: -1 | 1) {
    const index = elements.findIndex((item) => item.id === selectedId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= elements.length) return;
    const copy = [...elements];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    elements = copy;
  }
  function saveDraft() {
    const draft: TemplateDraft = { name: templateName.trim() || 'Template tanpa nama', orientation, background, elements: JSON.parse(JSON.stringify(elements)), updatedAt: new Date().toISOString() };
    const index = drafts.findIndex((item) => item.name === draft.name);
    if (index >= 0) drafts[index] = draft; else drafts = [draft, ...drafts];
    localStorage.setItem(storeKey(), JSON.stringify(drafts));
    savedAt = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    message = 'Draft tersimpan di browser ini. Template belum dikirim untuk persetujuan admin.';
    messageType = 'warning';
  }
  function openDraft(draft: TemplateDraft) {
    templateName = draft.name; orientation = draft.orientation; background = draft.background;
    elements = JSON.parse(JSON.stringify(draft.elements)); selectedId = elements[0]?.id ?? '';
    message = `Draft “${draft.name}” dibuka.`; messageType = 'success';
  }
  function deleteDraft(name: string) {
    drafts = drafts.filter((draft) => draft.name !== name);
    localStorage.setItem(storeKey(), JSON.stringify(drafts));
  }
  function importDraft(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (
          typeof data.name !== 'string' ||
          !['landscape', 'portrait'].includes(data.orientation) ||
          !Array.isArray(data.elements) ||
          data.elements.some((item: any) =>
            !item || typeof item.id !== 'string' ||
            !['text', 'placeholder', 'shape', 'image', 'qr'].includes(item.type) ||
            typeof item.content !== 'string' ||
            !Number.isFinite(Number(item.x)) ||
            !Number.isFinite(Number(item.y))
          )
        ) throw new Error('Struktur file tidak sesuai format template INFORHUB.');
        templateName = data.name;
        orientation = data.orientation;
        background = typeof data.background === 'string' && /^#[0-9a-fA-F]{6}$/.test(data.background)
          ? data.background : '#ffffff';
        elements = data.elements;
        selectedId = elements[0]?.id ?? '';
        message = `Template “${templateName}” berhasil diimpor. Klik Simpan Draft untuk menyimpannya di browser.`;
        messageType = 'success';
      } catch (e) {
        message = e instanceof Error ? e.message : 'File JSON tidak dapat dibaca.';
        messageType = 'warning';
      }
    };
    reader.readAsText(file);
    (event.currentTarget as HTMLInputElement).value = '';
  }

  function exportDraft() {
    const data = { name: templateName, orientation, background, width: canvasWidth, height: canvasHeight, elements };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${templateName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'template'}.json`; anchor.click(); URL.revokeObjectURL(url);
  }
  function uploadImage(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) { message = 'Format gambar harus PNG atau JPEG.'; messageType = 'warning'; return; }
    if (file.size > 2 * 1024 * 1024) { message = 'Ukuran gambar maksimal 2 MB.'; messageType = 'warning'; return; }
    const reader = new FileReader();
    reader.onload = () => {
      addElement('image');
      if (selected) { selected.src = String(reader.result); selected.content = file.name; selected.name = file.name; }
    };
    reader.readAsDataURL(file);
    (event.currentTarget as HTMLInputElement).value = '';
  }
  function addPlaceholder(value: string) { addElement('placeholder', value); }

  async function loadSubmissionHistory() {
    historyLoading = true;
    try {
      const history = await api<Submission[]>('/api/organizer/certificate-template-submissions');
      submissions = history.filter((item) => Number(item.eventId) === eventId);
    } catch (e) {
      message = e instanceof Error ? `Riwayat pengajuan belum dapat dimuat: ${e.message}` : 'Riwayat pengajuan belum dapat dimuat.';
      messageType = 'warning';
    } finally {
      historyLoading = false;
    }
  }

  async function imageDataToAsset(src: string): Promise<number> {
    const response = await fetch(src);
    const blob = await response.blob();
    const file = new File([blob], `certificate-image-${Date.now()}.png`, { type: blob.type || 'image/png' });
    const form = new FormData();
    form.append('file', file);
    const asset = await apiUpload<{ id: number }>('/api/certificate-assets', form);
    return asset.id;
  }

  async function buildBackendLayout() {
    const converted = [];
    for (const item of elements) {
      if (item.type === 'text' || item.type === 'placeholder') {
        converted.push({
          type: 'text', id: item.id, x: item.x, y: item.y, width: item.width,
          text: item.content, fontSize: item.fontSize, fontFamily: 'sans',
          bold: item.bold, italic: false, color: item.color, align: item.align,
          fit: 'wrap', lineHeight: 1.25
        });
      } else if (item.type === 'shape') {
        converted.push({
          type: 'rect', id: item.id, x: item.x, y: item.y,
          width: item.width, height: Math.max(1, item.height),
          fill: item.background, stroke: null, strokeWidth: 0
        });
      } else if (item.type === 'qr') {
        converted.push({
          type: 'qr', id: item.id, x: item.x, y: item.y,
          size: Math.max(1, Math.min(item.width, item.height))
        });
      } else if (item.type === 'image') {
        if (!item.src) throw new Error(`Gambar "${item.name}" belum memiliki file yang dapat diunggah.`);
        const assetId = await imageDataToAsset(item.src);
        converted.push({
          type: 'image', id: item.id, assetId, x: item.x, y: item.y,
          width: item.width, height: item.height
        });
      }
    }
    return {
      version: 1,
      canvas: { orientation, width: canvasWidth, height: canvasHeight, background },
      elements: converted
    };
  }

  async function submitToAdmin() {
    if (submitting) return;
    const name = templateName.trim();
    if (name.length < 2) {
      message = 'Nama template minimal 2 karakter.';
      messageType = 'warning';
      return;
    }
    if (elements.length > 60) {
      message = 'Maksimal 60 elemen dalam satu template.';
      messageType = 'warning';
      return;
    }
    if (!elements.some((item) => item.type === 'qr')) {
      message = 'Tambahkan elemen QR verifikasi sebelum mengirim template.';
      messageType = 'warning';
      return;
    }
    if (!elements.some((item) => (item.type === 'text' || item.type === 'placeholder') && item.content.includes('{{participant_name}}'))) {
      message = 'Tambahkan placeholder {{participant_name}} sebelum mengirim template.';
      messageType = 'warning';
      return;
    }
    if (!confirm(`Kirim template "${name}" kepada admin untuk ditinjau? Setelah dikirim, desain akan terkunci selama proses peninjauan.`)) return;

    submitting = true;
    message = '';
    try {
      const layout = await buildBackendLayout();
      await api('/api/organizer/certificate-template-submissions', {
        method: 'POST',
        body: { name, layout, eventId, submit: true }
      });
      message = 'Template berhasil dikirim kepada admin untuk ditinjau.';
      messageType = 'success';
      await loadSubmissionHistory();
    } catch (e) {
      message = e instanceof Error ? e.message : 'Template gagal dikirim kepada admin.';
      messageType = 'warning';
    } finally {
      submitting = false;
    }
  }

  function statusLabel(status: Submission['status']) {
    return ({ draft: 'Draft', pending: 'Menunggu admin', approved: 'Disetujui', rejected: 'Ditolak' })[status];
  }

  function dateLabel(value?: string | null) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  }
</script>

<svelte:head>
  <title>Editor Template Sertifikat | INFORHUB</title>
  <meta name="description" content="Buat dan atur desain template sertifikat acara INFORHUB." />
</svelte:head>

{#if selectedEvent}
<section class="studio">
  <div class="crumb">Penyelenggara <span>/</span> Sertifikat <span>/</span> {selectedEvent?.title} <span>/</span> Template Editor</div>
  <header class="heading">
    <div><div class="eyebrow">CERTIFICATE STUDIO · {selectedEvent?.title}</div><h1>Editor Template Sertifikat</h1><p>Template ini khusus untuk acara {selectedEvent?.title}. Satu acara hanya menggunakan satu template.</p></div>
    <div class="head-actions"><a class="btn ghost" href="/penyelenggara/sertifikat/template">Ganti acara</a><input bind:this={jsonInput} class="hidden" type="file" accept="application/json,.json" onchange={importDraft}/><button class="btn ghost" onclick={() => jsonInput.click()}><Icon name="share" size={16}/> Impor JSON</button><button class="btn ghost" onclick={exportDraft}><Icon name="share" size={16}/> Ekspor JSON</button><button class="btn ghost" onclick={saveDraft}><Icon name="check" size={16}/> Simpan Draft</button><button class="btn primary" onclick={submitToAdmin} disabled={submitting || eventSubmissionLocked}><Icon name="share" size={16}/> {submitting ? "Mengirim..." : eventSubmissionLocked ? "Sudah diajukan" : "Kirim ke Admin"}</button></div>
  </header>

  {#if eventSubmissionLocked}<div class="notice warning"><Icon name="info" size={17}/><span>Acara ini sudah memiliki template yang sedang ditinjau atau telah disetujui. Satu acara hanya dapat memiliki satu template aktif.</span></div>{/if}
  {#if message}<div class:warning={messageType === 'warning'} class="notice"><Icon name={messageType === 'warning' ? 'info' : 'check'} size={17}/><span>{message}</span><button aria-label="Tutup pesan" onclick={() => message = ''}><Icon name="close" size={15}/></button></div>{/if}

  <div class="workspace">
    <aside class="left-panel">
      <div class="panel-title">Tambah elemen</div>
      <button class="tool" onclick={() => addElement('text')}><span class="tool-icon"><Icon name="type" size={18}/></span><span><strong>Teks</strong><small>Tambahkan teks bebas</small></span></button>
      <button class="tool" onclick={() => addElement('placeholder')}><span class="tool-icon"><Icon name="braces" size={18}/></span><span><strong>Data peserta</strong><small>Nama dan data dinamis</small></span></button>
      <button class="tool" onclick={() => addElement('shape')}><span class="tool-icon"><Icon name="shapes" size={18}/></span><span><strong>Bentuk / garis</strong><small>Elemen dekoratif</small></span></button>
      <button class="tool" onclick={() => imageInput.click()}><span class="tool-icon"><Icon name="image" size={18}/></span><span><strong>Unggah gambar</strong><small>Logo, tanda tangan, ornamen</small></span></button>
      <input bind:this={imageInput} class="hidden" type="file" accept="image/*" onchange={uploadImage}/>
      <button class="tool" onclick={() => addElement('qr')}><span class="tool-icon"><Icon name="qr" size={18}/></span><span><strong>QR placeholder</strong><small>Area QR verifikasi</small></span></button>
      <div class="panel-divider"></div>
      <div class="panel-title">Placeholder dinamis</div>
      <p class="panel-help">Pilih data yang akan diisi otomatis saat sertifikat diterbitkan.</p>
      {#each placeholders as item}<button class="placeholder" onclick={() => addPlaceholder(item.value)}><span>{item.label}</span><code>{item.value}</code><Icon name="plus" size={14}/></button>{/each}
      <div class="panel-divider"></div>
      <div class="panel-title">Draft tersimpan</div>
      {#if drafts.length === 0}<p class="panel-help">Belum ada draft di browser ini.</p>{:else}
        {#each drafts as draft}<div class="draft-row"><button class="draft-open" onclick={() => openDraft(draft)}><strong>{draft.name}</strong><small>{draft.elements.length} elemen · {new Date(draft.updatedAt).toLocaleDateString('id-ID')}</small></button><button class="icon-button danger" aria-label="Hapus draft" onclick={() => deleteDraft(draft.name)}><Icon name="trash" size={15}/></button></div>{/each}
      {/if}
    </aside>

    <main class="editor-main">
      <div class="canvas-toolbar">
        <div class="doc-name"><Icon name="file" size={16}/><input aria-label="Nama template" bind:value={templateName}/></div>
        <div class="canvas-actions">
          <button class:active={orientation === 'landscape'} title="Landscape" onclick={() => orientation = 'landscape'}>Landscape</button>
          <button class:active={orientation === 'portrait'} title="Portrait" onclick={() => orientation = 'portrait'}>Portrait</button>
          <button class:active={showGrid} title="Tampilkan grid" onclick={() => showGrid = !showGrid}><Icon name="grid" size={15}/></button>
        </div>
      </div>
      <div class="canvas-stage">
        <div class="canvas" bind:this={canvasElement} style={`aspect-ratio:${canvasWidth}/${canvasHeight};background:${background};${showGrid ? 'background-image:linear-gradient(#94a3b822 1px,transparent 1px),linear-gradient(90deg,#94a3b822 1px,transparent 1px);background-size:25px 25px;' : ''}`} onpointermove={moveElement} onpointerup={stopDrag} onpointercancel={stopDrag}>
          {#if elements.length === 0}<div class="canvas-empty">Tambahkan elemen dari panel kiri</div>{/if}
          {#each elements as item (item.id)}
            <div class="design-item" class:selected={selectedId === item.id} style={`left:${item.x / canvasWidth * 100}%;top:${item.y / canvasHeight * 100}%;width:${item.width / canvasWidth * 100}%;height:${item.height / canvasHeight * 100}%;color:${item.color};font-size:${item.fontSize / canvasWidth * 100}cqw;font-weight:${item.bold ? 700 : 400};text-align:${item.align};background:${item.type === 'shape' ? item.background : 'transparent'};`} onpointerdown={(event) => startDrag(event, item)} role="button" tabindex="0" aria-label={`Pilih ${item.name}`}>
              {#if item.type === 'image'}
                {#if item.src}<img src={item.src} alt={item.name}/>{:else}<span class="image-empty"><Icon name="image" size={22}/>Gambar</span>{/if}
              {:else if item.type === 'qr'}
                <div class="qr-placeholder"><div class="qr-pattern"></div><small>SCAN UNTUK VERIFIKASI</small></div>
              {:else if item.type === 'shape'}
                <span class="shape-label">{item.content}</span>
              {:else}
                <span>{item.content}</span>
              {/if}
              {#if selectedId === item.id}<span class="selection-dot"></span>{/if}
            </div>
          {/each}
        </div>
      </div>
      <div class="canvas-footer"><span>{canvasWidth} × {canvasHeight} px</span><span>A4 {orientation === 'landscape' ? 'Landscape' : 'Portrait'}</span><span>{elements.length} elemen</span></div>
    </main>

    <aside class="right-panel">
      <div class="panel-title">Pengaturan desain</div>
      <label class="field">Warna latar belakang<div class="color-control"><input type="color" bind:value={background}/><code>{background}</code></div></label>
      {#if selected}
        <div class="panel-divider"></div>
        <div class="selected-head"><div><div class="panel-title">Elemen dipilih</div><small>{selected.name}</small></div><button class="icon-button danger" aria-label="Hapus elemen" onclick={removeSelected}><Icon name="trash" size={16}/></button></div>
        <label class="field">Nama elemen<input bind:value={selected.name}/></label>
        {#if selected.type !== 'image' && selected.type !== 'qr' && selected.type !== 'shape'}<label class="field">Konten<textarea rows="3" bind:value={selected.content}></textarea></label>{/if}
        {#if selected.type === 'text' || selected.type === 'placeholder'}
          <label class="field">Ukuran teks <div class="range-row"><input type="range" min="12" max="72" bind:value={selected.fontSize}/><output>{selected.fontSize}px</output></div></label>
          <label class="field">Warna teks<div class="color-control"><input type="color" bind:value={selected.color}/><code>{selected.color}</code></div></label>
          <label class="check-field"><input type="checkbox" bind:checked={selected.bold}/> Tebal</label>
          <label class="field">Perataan<select bind:value={selected.align}><option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option></select></label>
        {/if}
        {#if selected.type === 'shape'}<label class="field">Warna bentuk<div class="color-control"><input type="color" bind:value={selected.background}/><code>{selected.background}</code></div></label>{/if}
        {#if selected.type === 'image' || selected.type === 'qr' || selected.type === 'shape'}
          <label class="field">Lebar <div class="range-row"><input type="range" min="30" max={canvasWidth} bind:value={selected.width}/><output>{selected.width}px</output></div></label>
          <label class="field">Tinggi <div class="range-row"><input type="range" min="5" max={canvasHeight} bind:value={selected.height}/><output>{selected.height}px</output></div></label>
        {/if}
        <div class="panel-divider"></div>
        <div class="panel-title">Posisi dan lapisan</div>
        <div class="position-grid"><label class="field">X<input type="number" min="0" max={canvasWidth} bind:value={selected.x}/></label><label class="field">Y<input type="number" min="0" max={canvasHeight} bind:value={selected.y}/></label></div>
        <div class="layer-actions"><button class="btn ghost" onclick={() => moveLayer(-1)}><Icon name="arrow-up" size={14}/> Turunkan</button><button class="btn ghost" onclick={() => moveLayer(1)}><Icon name="arrow-up" size={14}/> Naikkan</button></div>
        <button class="btn full ghost" onclick={duplicateSelected}><Icon name="copy" size={15}/> Duplikat elemen</button>
      {:else}
        <div class="empty-selection"><Icon name="mouse-pointer-2" size={25}/><strong>Belum ada elemen dipilih</strong><span>Pilih elemen pada kanvas untuk mengatur propertinya.</span></div>
      {/if}
      <div class="panel-divider"></div>
      <div class="tip"><Icon name="info" size={16}/><span>Geser elemen langsung pada kanvas. Pilih elemen untuk mengubah konten, ukuran, warna, dan posisinya.</span></div>
    </aside>
  </div>
  <section class="submission-history">
    <div class="history-heading"><div><strong>Riwayat pengajuan template</strong><p>Status pengajuan yang sudah dikirim ke admin.</p></div><button class="btn ghost" onclick={loadSubmissionHistory} disabled={historyLoading}><Icon name="check" size={14}/> Muat ulang</button></div>
    {#if historyLoading}
      <div class="history-empty">Memuat riwayat pengajuan...</div>
    {:else if submissions.length === 0}
      <div class="history-empty">Belum ada pengajuan template.</div>
    {:else}
      <div class="submission-list">
        {#each submissions as submission (submission.id)}
          <article class="submission-row">
            <div class="submission-main"><strong>{submission.name}</strong><small>Diperbarui {dateLabel(submission.updatedAt)}</small></div>
            <span class:pending={submission.status === 'pending'} class:approved={submission.status === 'approved'} class:rejected={submission.status === 'rejected'} class="status-pill">{statusLabel(submission.status)}</span>
            {#if submission.reviewNote}<p class="review-note">Catatan admin: {submission.reviewNote}</p>{/if}
          </article>
        {/each}
      </div>
    {/if}
  </section>
  <p class="integration-note"><Icon name="info" size={16}/> Simpan Draft tetap menyimpan desain di browser. Tombol Kirim ke Admin menyimpan desain ke backend dan mengirimkannya untuk ditinjau. QR pada kanvas adalah penanda posisi; QR verifikasi asli dibuat server saat sertifikat diterbitkan.</p>
</section>
{:else}
<section class="event-picker">
  <div class="crumb">Penyelenggara <span>/</span> Sertifikat <span>/</span> Template</div>
  <div class="picker-heading"><div><div class="eyebrow">CERTIFICATE STUDIO</div><h1>Pilih Acara</h1><p>Pilih acara terlebih dahulu. Setiap acara hanya memiliki satu template sertifikat.</p></div></div>
  {#if events.length}
    <div class="event-grid">
      {#each events as event (event.id)}
        <a class="event-card" href={`/penyelenggara/sertifikat/template?eventId=${event.id}`}>
          <span class="event-icon"><Icon name="calendar" size={21}/></span>
          <span class="event-copy"><strong>{event.title}</strong><small>{event.startAt ? new Date(event.startAt).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : 'Jadwal belum tersedia'}</small></span>
          <span class="event-action">Buat / kelola template <Icon name="arrow-up-right" size={15}/></span>
        </a>
      {/each}
    </div>
  {:else}
    <div class="picker-empty"><Icon name="calendar" size={27}/><strong>Acara belum tersedia</strong><p>Buat acara terlebih dahulu sebelum membuat template sertifikat.</p><a href="/penyelenggara/acara">Buka Acara Saya</a></div>
  {/if}
</section>
{/if}

<style>
  .studio{width:100%;min-width:0;max-width:none;margin:0;color:var(--text)}.crumb{font-size:11px;color:var(--muted);margin-bottom:12px}.crumb span{padding:0 6px;color:var(--border-strong)}.heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:18px}.eyebrow{font-size:9px;letter-spacing:1.5px;font-weight:800;color:var(--accent-text)}h1{font-size:25px;margin:6px 0}.heading p{font-size:12px;color:var(--muted);margin:0;line-height:1.6}.head-actions{display:flex;gap:8px;flex-shrink:0}.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer}.btn.primary{border:1px solid var(--accent);background:var(--accent);color:white}.btn.ghost{border:1px solid var(--border-strong);background:var(--surface);color:var(--text)}.btn.full{width:100%;margin-top:9px}.notice{display:flex;align-items:center;gap:9px;padding:10px 12px;margin-bottom:13px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface);color:var(--text-2);font-size:11px}.notice.warning{border-color:#d5ad5b;background:color-mix(in srgb,#d5ad5b 10%,var(--surface))}.notice button{margin-left:auto;border:0;background:transparent;color:var(--muted);cursor:pointer}.workspace{display:grid;min-width:0;grid-template-columns:210px minmax(420px,1fr) 265px;height:calc(100vh - 178px);min-height:620px;max-height:1000px;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--surface-2)}.left-panel,.right-panel{padding:13px;background:var(--surface-2);min-width:0;overflow:auto}.left-panel{border-right:1px solid var(--border)}.right-panel{border-left:1px solid var(--border)}.panel-title{font-size:11px;font-weight:800;margin-bottom:12px}.tool{display:flex;align-items:center;gap:10px;width:100%;padding:9px 7px;border:0;border-radius:8px;background:transparent;text-align:left;color:var(--text);cursor:pointer}.tool:hover,.placeholder:hover,.draft-open:hover{background:var(--surface-3)}.tool-icon{display:grid;place-items:center;width:34px;height:34px;flex-shrink:0;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--accent-text)}.tool strong,.tool small{display:block}.tool strong{font-size:11px}.tool small{font-size:9px;color:var(--muted);margin-top:4px}.panel-divider{height:1px;background:var(--border);margin:14px 0}.panel-help{font-size:10px;color:var(--muted);line-height:1.55;margin:-5px 0 9px}.placeholder{display:flex;align-items:center;gap:5px;width:100%;padding:8px 5px;border:0;border-radius:6px;background:transparent;text-align:left;color:var(--text-2);cursor:pointer}.placeholder span{font-size:10px;white-space:nowrap}.placeholder code{font-size:8px;color:var(--accent-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.placeholder :global(svg){flex-shrink:0;color:var(--muted)}.hidden{display:none}.draft-row{display:flex;align-items:center;gap:5px}.draft-open{flex:1;min-width:0;display:grid;gap:4px;padding:8px 6px;border:0;border-radius:7px;background:transparent;text-align:left;color:var(--text);cursor:pointer}.draft-open strong{font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.draft-open small{font-size:9px;color:var(--muted)}.icon-button{display:grid;place-items:center;width:29px;height:29px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--muted);cursor:pointer}.icon-button.danger{color:var(--err-text)}.editor-main{min-width:0;display:flex;flex-direction:column;background:var(--surface)}.canvas-toolbar{height:52px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 13px;border-bottom:1px solid var(--border);background:var(--surface-2)}.doc-name{display:flex;align-items:center;gap:7px;min-width:0;color:var(--muted)}.doc-name input{width:min(260px,100%);border:0;outline:0;background:transparent;color:var(--text);font-size:11px;font-weight:700}.canvas-actions{display:flex;gap:4px}.canvas-actions button{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:7px 9px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--muted);font-size:9px;cursor:pointer}.canvas-actions button.active{border-color:var(--border-strong);background:var(--surface);color:var(--accent-text)}.canvas-stage{display:grid;place-items:center;flex:1;min-height:0;padding:25px;background-color:var(--surface-3);background-image:radial-gradient(var(--border-strong) .8px,transparent .8px);background-size:15px 15px;overflow:auto}.canvas{container-type:inline-size;position:relative;width:min(100%,900px);max-height:100%;box-shadow:0 8px 30px #0002;overflow:hidden;touch-action:none;user-select:none}.design-item{position:absolute;display:flex;align-items:center;justify-content:center;overflow:hidden;white-space:pre-wrap;line-height:1.2;padding:2px;cursor:move;user-select:none;touch-action:none;border:1px solid transparent}.design-item.selected{border:1px solid #3985e8;outline:1px solid #3985e855}.design-item img{width:100%;height:100%;object-fit:contain;pointer-events:none}.image-empty{display:flex;align-items:center;justify-content:center;gap:5px;width:100%;height:100%;border:1px dashed #94a3b8;color:#64748b;font-size:12px}.qr-placeholder{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:100%;height:100%;background:#fff;border:1px solid #cbd5e1;padding:5px}.qr-pattern{width:72%;aspect-ratio:1;background:repeating-conic-gradient(#172b45 0% 25%,#fff 0% 50%) 0 0/9px 9px}.qr-placeholder small{font-size:clamp(5px,.65cqw,8px);color:#334155;font-weight:700}.shape-label{display:none}.selection-dot{position:absolute;right:-4px;bottom:-4px;width:8px;height:8px;border:1px solid white;border-radius:50%;background:#3985e8}.canvas-empty{position:absolute;inset:0;display:grid;place-items:center;color:#94a3b8;font-size:14px}.canvas-footer{display:flex;justify-content:space-between;padding:9px 14px;border-top:1px solid var(--border);color:var(--muted);font-size:9px}.field{display:grid;gap:7px;margin:12px 0;color:var(--text-2);font-size:10px;font-weight:650}.field input:not([type=color]):not([type=range]),.field textarea,.field select{width:100%;padding:8px;border:1px solid var(--border-strong);border-radius:7px;background:var(--surface);color:var(--text);font:inherit;font-size:10px}.field textarea{resize:vertical;line-height:1.5}.color-control{display:flex;align-items:center;gap:8px}.color-control input{width:35px;height:29px;padding:2px;border:1px solid var(--border);border-radius:6px;background:var(--surface)}.color-control code{font-size:10px;color:var(--muted)}.range-row{display:flex;align-items:center;gap:8px}.range-row input{width:100%;accent-color:var(--accent)}.range-row output{min-width:42px;text-align:right;color:var(--muted);font-size:9px}.check-field{display:flex;align-items:center;gap:8px;font-size:10px;color:var(--text-2)}.check-field input{accent-color:var(--accent)}.selected-head{display:flex;align-items:center;justify-content:space-between}.selected-head small{font-size:9px;color:var(--muted)}.position-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.position-grid .field{min-width:0}.layer-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px}.layer-actions .btn{padding:8px 4px;font-size:9px}.empty-selection{display:grid;justify-items:center;gap:8px;padding:28px 12px;text-align:center;color:var(--muted)}.empty-selection strong{font-size:11px;color:var(--text)}.empty-selection span{font-size:10px;line-height:1.5}.tip{display:flex;align-items:flex-start;gap:8px;color:var(--muted);font-size:9px;line-height:1.6}.tip :global(svg){flex-shrink:0;color:var(--accent-text)}.integration-note{display:flex;align-items:flex-start;gap:8px;margin:12px 2px 0;color:var(--muted);font-size:10px;line-height:1.6}.integration-note :global(svg){flex-shrink:0;color:var(--accent-text)}
  .submission-history{margin-top:14px;border:1px solid var(--border);border-radius:11px;background:var(--surface-2);overflow:hidden}.history-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border)}.history-heading strong{font-size:12px}.history-heading p{margin:4px 0 0;color:var(--muted);font-size:10px}.history-empty{padding:20px;text-align:center;color:var(--muted);font-size:11px}.submission-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;border-bottom:1px solid var(--border)}.submission-row:last-child{border-bottom:0}.submission-main{display:grid;gap:4px;min-width:180px;flex:1}.submission-main strong{font-size:11px}.submission-main small{font-size:9px;color:var(--muted)}.status-pill{padding:5px 9px;border-radius:20px;background:var(--surface-3);color:var(--text-2);font-size:9px;font-weight:700}.status-pill.pending{background:#fef3c7;color:#92400e}.status-pill.approved{background:#dcfce7;color:#166534}.status-pill.rejected{background:#fee2e2;color:#991b1b}.review-note{width:100%;margin:0;color:var(--muted);font-size:10px;line-height:1.5}.btn:disabled{opacity:.55;cursor:not-allowed}
  @media(max-width:1150px){.workspace{height:auto;max-height:none;min-height:0;grid-template-columns:190px minmax(0,1fr)}.right-panel{grid-column:1/-1;border-left:0;border-top:1px solid var(--border);display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:18px}.right-panel>.panel-title:first-child,.right-panel>.panel-divider,.right-panel>.tip{grid-column:1/-1}.right-panel>.panel-divider{margin:8px 0}.right-panel>.field{align-self:start}.right-panel .selected-head{grid-column:1/-1}}
  @media(max-width:760px){.workspace{height:auto}.canvas-stage{min-height:360px}.heading{align-items:flex-start;flex-direction:column}.head-actions{width:100%}.head-actions .btn{flex:1}.workspace{display:flex;flex-direction:column}.left-panel{border-right:0;border-bottom:1px solid var(--border)}.left-panel .tool{display:inline-flex;width:49%;vertical-align:top}.left-panel .placeholder{display:inline-flex;width:100%}.editor-main{min-height:440px}.canvas-stage{min-height:300px;padding:12px}.right-panel{display:block}.canvas-toolbar{padding:0 8px}.canvas-actions button{padding:6px}.canvas-footer{font-size:8px}}


  .event-picker{max-width:1250px;margin:0 auto;color:var(--text)}
  .picker-heading{margin:20px 0 22px}.picker-heading h1{margin:7px 0;font-size:27px}.picker-heading p{margin:0;color:var(--muted);font-size:12px}
  .event-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
  .event-card{display:grid;grid-template-columns:44px 1fr;gap:12px;padding:17px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);color:var(--text);text-decoration:none}
  .event-card:hover{border-color:var(--accent)}.event-icon{display:grid;place-items:center;width:44px;height:44px;border-radius:10px;background:var(--accent-soft);color:var(--accent-text)}
  .event-copy{display:grid;align-content:center;gap:5px}.event-copy strong{font-size:13px}.event-copy small{font-size:10px;color:var(--muted)}
  .event-action{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;padding-top:11px;border-top:1px solid var(--border);font-size:10px;color:var(--accent-text);font-weight:700}
  .picker-empty{display:grid;justify-items:center;gap:9px;min-height:230px;padding:30px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);color:var(--muted);text-align:center;font-size:12px}.picker-empty strong{color:var(--text);font-size:14px}.picker-empty p{margin:0;line-height:1.6}.picker-empty a{padding:9px 13px;border-radius:7px;background:var(--accent);color:white;text-decoration:none}
  @media(max-width:700px){.event-grid{grid-template-columns:1fr}}

</style>
