
<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { api, apiUpload } from '#lib/api.js';

  let title = $state('');
  let description = $state('');
  let location = $state('');
  let startAt = $state('');
  let endAt = $state('');
  let deadline = $state('');
  let quota = $state(50);
  let status = $state('draft');
  let posterUrl = $state('');
  let error = $state('');
  let posterInput: HTMLInputElement;
  let posterFile: File | null = null;
  let saving = $state(false);
  let currentStatus = $state('draft');

  let isEditing = $derived(page.url.searchParams.has('id'));
  const editId = $derived(Number(page.url.searchParams.get('id')) || null);

  function toLocalInput(iso: string) {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  // Mode edit: isi formulir dari data acara di server.
  onMount(async () => {
    if (!editId) return;
    try {
      const e = await api<{
        title: string; description: string | null; location: string; quota: number;
        startAt: string; endAt: string; deadline: string | null; posterUrl: string | null; status: string;
      }>(`/api/events/${editId}`);
      title = e.title;
      description = e.description ?? '';
      location = e.location;
      startAt = toLocalInput(e.startAt);
      endAt = toLocalInput(e.endAt);
      deadline = toLocalInput(e.deadline ?? e.startAt);
      quota = e.quota;
      posterUrl = e.posterUrl ?? '';
      currentStatus = e.status;
      status = e.status === 'published' ? 'published' : 'draft';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal memuat acara.';
    }
  });

  function handlePoster(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      error = 'Poster harus berformat PNG, JPG, atau WEBP.';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      error = 'Ukuran poster maksimal 2 MB.';
      return;
    }

    error = '';

    if (posterUrl.startsWith('blob:')) {
      URL.revokeObjectURL(posterUrl);
    }

    posterUrl = URL.createObjectURL(file);
    posterFile = file;
  }

  async function saveEvent() {
    error = '';

    if (!title.trim() || !description.trim() || !location.trim()) {
      error = 'Judul, deskripsi, dan lokasi wajib diisi.';
      return;
    }

    if (!startAt || !endAt || !deadline) {
      error = 'Lengkapi jadwal acara dan batas pendaftaran.';
      return;
    }

    if (new Date(endAt) <= new Date(startAt)) {
      error = 'Waktu selesai harus setelah waktu mulai.';
      return;
    }

    if (new Date(deadline) > new Date(startAt)) {
      error = 'Batas pendaftaran tidak boleh melewati waktu mulai acara.';
      return;
    }

    if (!Number.isInteger(quota) || quota < 1) {
      error = 'Kuota minimal 1 peserta.';
      return;
    }

    saving = true;
    try {
      // Poster diunggah ke backend dulu; yang disimpan di acara adalah URL-nya.
      let finalPoster: string | null = posterUrl.startsWith('http') ? posterUrl : null;
      if (posterFile) {
        const fd = new FormData();
        fd.append('file', posterFile);
        finalPoster = (await apiUpload<{ url: string }>('/api/uploads/poster', fd)).url;
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        deadline: new Date(deadline).toISOString(),
        location: location.trim(),
        quota
      };

      let id = editId;
      if (id) {
        await api(`/api/events/${id}`, { method: 'PATCH', body: { ...payload, posterUrl: finalPoster } });
      } else {
        const created = await api<{ id: number }>('/api/events', {
          method: 'POST',
          body: { ...payload, posterUrl: finalPoster ?? undefined }
        });
        id = created.id;
        currentStatus = 'draft';
      }

      // Publikasi: draft -> pending -> published. Hanya admin yang boleh
      // mempublikasikan; selain itu acara menunggu persetujuan.
      if (status === 'published' && currentStatus !== 'published') {
        if (currentStatus !== 'pending') {
          await api(`/api/events/${id}/status`, { method: 'POST', body: { status: 'pending' } });
        }
        try {
          await api(`/api/events/${id}/status`, { method: 'POST', body: { status: 'published' } });
        } catch {
          // menunggu persetujuan admin
        }
      }

      goto('/admin/acara');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Gagal menyimpan acara.';
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>{isEditing ? 'Edit Acara' : 'Tambah Acara'} | INFORHUB Admin</title>
</svelte:head>

<section class="form-page">
  <div class="breadcrumb">
    <a href="/admin">Dashboard</a> /
    <a href="/admin/acara">Kelola Acara</a> /
    {isEditing ? 'Edit Acara' : 'Tambah Acara'}
  </div>

  <div class="heading">
    <div>
      <h1>{isEditing ? 'Edit Acara' : 'Buat Acara Baru'}</h1>
      <p>Lengkapi informasi yang akan ditampilkan kepada peserta INFORHUB.</p>
    </div>
    <a href="/admin/acara" class="back-button">← Kembali</a>
  </div>

  {#if error}
    <div class="notice" role="status">{error}</div>
  {/if}

  <form onsubmit={(event) => { event.preventDefault(); saveEvent(); }}>
    <div class="form-layout">
      <div class="main-column">
        <section class="panel">
          <div class="section-heading">
            <span class="section-number">01</span>
            <div>
              <h2>Informasi Acara</h2>
              <p>Informasi utama yang akan dilihat calon peserta.</p>
            </div>
          </div>

          <label class="field">
            <span>Judul Acara <b>*</b></span>
            <input bind:value={title} maxlength="200" required placeholder="Contoh: Seminar Teknologi Digital" />
          </label>

          <label class="field">
            <span>Deskripsi Acara <b>*</b></span>
            <textarea bind:value={description} rows="7" required placeholder="Jelaskan tujuan, agenda, dan informasi penting acara..."></textarea>
          </label>

          <label class="field">
            <span>Lokasi Acara <b>*</b></span>
            <input bind:value={location} maxlength="255" required placeholder="Alamat lokasi atau tautan acara online" />
          </label>
        </section>

        <section class="panel">
          <div class="section-heading">
            <span class="section-number">02</span>
            <div>
              <h2>Jadwal dan Kuota</h2>
              <p>Atur periode pendaftaran dan kapasitas peserta.</p>
            </div>
          </div>

          <label class="field">
            <span>Mulai Acara <b>*</b></span>
            <input type="datetime-local" bind:value={startAt} required />
          </label>

          <label class="field">
            <span>Selesai Acara <b>*</b></span>
            <input type="datetime-local" bind:value={endAt} required />
          </label>

          <label class="field">
            <span>Batas Pendaftaran <b>*</b></span>
            <input type="datetime-local" bind:value={deadline} required />
          </label>

          <label class="field">
            <span>Kuota Peserta <b>*</b></span>
            <input type="number" bind:value={quota} min="1" step="1" required />
            <small>Jumlah peserta maksimum yang dapat mendaftar.</small>
          </label>
        </section>
      </div>

      <div class="side-column">
        <section class="panel">
          <div class="section-heading">
            <span class="section-number">03</span>
            <div>
              <h2>Poster Acara</h2>
              <p>Gunakan gambar promosi yang jelas.</p>
            </div>
          </div>

          <button
            type="button"
            class="poster-preview"
            onclick={() => posterInput.click()}
            aria-label="Pilih gambar poster"
          >
            {#if posterUrl}
              <img src={posterUrl} alt="Pratinjau poster acara" />
            {:else}
              <span class="upload-icon">↑</span>
              <strong>Unggah poster</strong>
              <small>Klik untuk memilih gambar</small>
              <small>PNG, JPG, WEBP · Maks. 2 MB</small>
            {/if}
          </button>

          <input
            bind:this={posterInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            class="hidden-input"
            onchange={handlePoster}
          />

          {#if posterUrl}
            <button
              type="button"
              class="remove-poster"
              onclick={() => {
                if (posterUrl.startsWith('blob:')) URL.revokeObjectURL(posterUrl);
                posterUrl = '';
                posterFile = null;
                if (posterInput) posterInput.value = '';
              }}
            >
              Hapus poster
            </button>
          {/if}
        </section>

        <section class="panel">
          <div class="section-heading">
            <span class="section-number">04</span>
            <div>
              <h2>Publikasi</h2>
              <p>Atur status acara.</p>
            </div>
          </div>

          <label class="field">
            <span>Status Acara</span>
            <select bind:value={status}>
              <option value="draft">Draft</option>
              <option value="published">Publikasikan</option>
            </select>
            <small>Draft tidak ditampilkan sebagai acara publik.</small>
          </label>
        </section>

        <div class="form-actions">
          <a href="/admin/acara" class="cancel-button">Batal</a>
          <button type="submit" class="save-button" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Acara'}</button>
        </div>
      </div>
    </div>
  </form>
</section>

<style>
  .form-page { max-width: 1300px; margin: auto; color: var(--text)}
  .breadcrumb { margin-bottom: 13px; color: var(--muted); font-size: 11px}
  .breadcrumb a { color: var(--accent-text); text-decoration: none}
  .heading { display: flex; justify-content: space-between; align-items: center; gap: 15px; margin-bottom: 22px}
  h1 { margin: 0 0 6px; font-size: 26px}
  .heading p, .section-heading p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5}
  .back-button, .cancel-button { padding: 10px 13px; border: 1px solid var(--border-strong); border-radius: 8px; color: var(--text-2); text-decoration: none; font-size: 11px}
  .notice { margin-bottom: 18px; padding: 12px 14px; border: 1px solid var(--border-strong); border-radius: 8px; background: var(--surface-3); color: var(--accent-text); font-size: 12px; line-height: 1.5}
  .form-layout { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(260px, .8fr); align-items: start; gap: 18px}
  .main-column, .side-column { display: grid; gap: 18px}
  .panel { min-width: 0; padding: 21px; border: 1px solid var(--border); border-radius: 11px; background: var(--surface-2)}
  .section-heading { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 22px}
  .section-number { display: grid; place-items: center; flex-shrink: 0; width: 35px; height: 35px; border-radius: 8px; background: var(--accent-soft); color: var(--accent-text); font-size: 11px; font-weight: 700}
  .section-heading h2 { margin: 1px 0 5px; font-size: 14px}
  .field { display: grid; gap: 8px; margin-bottom: 19px}
  .field:last-child { margin-bottom: 0}
  .field > span { color: var(--text-2); font-size: 11px; font-weight: 600}
  .field b { color: var(--err-text)}
  .field input, .field textarea, .field select { width: 100%; min-width: 0; padding: 12px; border: 1px solid var(--border-strong); border-radius: 8px; outline: none; background: var(--surface); color: var(--text); font: inherit; font-size: 12px}
  .field input:focus, .field textarea:focus, .field select:focus { border-color: var(--accent); box-shadow: 0 0 0 2px #398cff20}
  .field textarea { resize: vertical; line-height: 1.6}
  .field input::placeholder, .field textarea::placeholder { color: var(--muted)}
  .field input[type="datetime-local"] { color-scheme: dark}
  .field small { color: var(--muted); font-size: 10px; line-height: 1.5}
  .poster-preview { width: 100%; min-height: 210px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; padding: 15px; border: 1px dashed var(--border-strong); border-radius: 9px; background: var(--surface); color: var(--text); cursor: pointer}
  .poster-preview:hover { border-color: var(--accent); background: var(--surface-3)}
  .poster-preview img { width: 100%; max-height: 300px; object-fit: contain; border-radius: 6px}
  .poster-preview strong { font-size: 12px}
  .poster-preview small { color: var(--muted); font-size: 10px}
  .upload-icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 10px; background: var(--accent-soft); color: var(--accent-text); font-size: 25px}
  .hidden-input { display: none}
  .remove-poster { margin-top: 10px; padding: 7px 0; border: 0; background: transparent; color: var(--err-text); font-size: 11px; cursor: pointer}
  .form-actions { display: flex; justify-content: flex-end; align-items: center; gap: 10px}
  .save-button { padding: 12px 16px; border: 0; border-radius: 8px; background: var(--accent); color: white; font-size: 11px; font-weight: 650; cursor: pointer}
  .save-button:hover { background: var(--accent)}
  @media (max-width: 800px) { .form-layout { grid-template-columns: 1fr} }
  @media (max-width: 520px) { .heading { align-items: flex-start; flex-direction: column} .panel { padding: 15px} }
</style>
