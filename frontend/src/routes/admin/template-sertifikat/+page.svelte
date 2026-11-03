<script lang="ts">
  import Icon from '#lib/components/Icon.svelte';

  // F-23: tampilan pengelolaan template. Persistensi menunggu kontrak API backend.
  let editorOpen = $state(false);
  let templateName = $state('');
  let certificateTitle = $state('SERTIFIKAT');
  let institution = $state('Program Studi Informatika');
  let signer = $state('');
  let message = $state('');

  function openEditor() {
    message = '';
    editorOpen = true;
  }
</script>

<svelte:head>
  <title>Template Sertifikat | INFORHUB Administrator</title>
  <meta name="description" content="Pengelolaan template sertifikat INFORHUB." />
</svelte:head>

<section class="page">
  <div class="breadcrumb">Administrator / Pengaturan Sertifikat</div>
  <div class="heading">
    <div>
      <h1>Template Sertifikat</h1>
      <p>Atur format standar yang akan digunakan penyelenggara saat menerbitkan sertifikat.</p>
    </div>
    <button class="primary" onclick={openEditor}><Icon name="plus" size={16}/> Rancang Template</button>
  </div>

  <div class="notice">
    <Icon name="info" size={18}/>
    <div><strong>Integrasi backend belum tersedia.</strong><p>Halaman ini menyiapkan antarmuka F-23. Template belum dapat dimuat atau disimpan secara permanen karena endpoint pengelolaan template belum tercantum pada kontrak API yang tersedia.</p></div>
  </div>

  <section class="empty-panel">
    <div class="empty-icon"><Icon name="file" size={28}/></div>
    <h2>Belum ada template yang terhubung</h2>
    <p>Template yang sudah tersimpan nantinya akan tampil di sini dan dapat dipilih oleh penyelenggara ketika menerbitkan sertifikat.</p>
    <button class="secondary" onclick={openEditor}>Buka rancangan template</button>
  </section>

  {#if editorOpen}
    <div class="editor">
      <div class="editor-head"><div><span class="eyebrow">F-23 · EDITOR TEMPLATE</span><h2>Rancangan Template Sertifikat</h2></div><button class="close" aria-label="Tutup editor" onclick={() => editorOpen = false}><Icon name="close"/></button></div>
      <div class="editor-grid">
        <div class="fields">
          <label>Nama template<input bind:value={templateName} placeholder="Contoh: Template Seminar Informatika"/></label>
          <label>Judul sertifikat<input bind:value={certificateTitle} /></label>
          <label>Nama institusi / unit<input bind:value={institution} /></label>
          <label>Nama penandatangan<input bind:value={signer} placeholder="Nama dan jabatan penandatangan"/></label>
          <p class="helper">Rancangan ini hanya pratinjau di browser. Penyimpanan, unggah logo, pengaturan elemen, dan versi template membutuhkan endpoint backend F-23.</p>
          <button class="save" disabled title="Menunggu endpoint backend untuk menyimpan template">Simpan Template</button>
        </div>
        <div class="preview-wrap">
          <span class="preview-label">PRATINJAU</span>
          <article class="certificate">
            <div class="cert-border">
              <span class="cert-brand">INFORHUB · INFORMATIKA</span>
              <h3>{certificateTitle || 'SERTIFIKAT'}</h3>
              <p class="cert-caption">Diberikan kepada</p>
              <strong class="participant">Nama Peserta</strong>
              <p class="cert-copy">Atas partisipasinya dalam kegiatan</p>
              <strong class="event-name">Nama Kegiatan</strong>
              <p class="cert-copy">yang diselenggarakan oleh {institution || 'Institusi'}.</p>
              <div class="sign"><span>{signer || 'Nama Penandatangan'}</span><small>Penanggung Jawab</small></div>
            </div>
          </article>
          <p class="preview-note">Nama peserta, kegiatan, tanggal, dan nomor sertifikat akan diisi dari data sistem ketika penerbitan dilakukan.</p>
        </div>
      </div>
    </div>
  {/if}
</section>

<style>
  .page{max-width:1250px;margin:auto;color:var(--text)}.breadcrumb{margin-bottom:10px;color:var(--muted);font-size:11px}
  .heading{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:22px}h1{margin:0 0 7px;font-size:27px}.heading p{margin:0;color:var(--muted);font-size:12px;line-height:1.6}
  button{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:8px;font:inherit;font-size:11px;font-weight:650;cursor:pointer}
  .primary,.save{padding:11px 15px;border:1px solid var(--accent);background:var(--accent);color:#fff}.secondary{padding:10px 14px;border:1px solid var(--border-strong);background:var(--surface);color:var(--text)}
  .notice{display:flex;gap:12px;padding:15px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);color:var(--accent-text);margin-bottom:18px}.notice strong{font-size:12px}.notice p{margin:5px 0 0;color:var(--muted);font-size:11px;line-height:1.6}
  .empty-panel{display:flex;align-items:center;flex-direction:column;padding:58px 22px;border:1px dashed var(--border-strong);border-radius:12px;background:var(--surface-2);text-align:center}.empty-icon{display:grid;place-items:center;width:55px;height:55px;border-radius:13px;background:var(--accent-soft);color:var(--accent-text)}.empty-panel h2{margin:16px 0 7px;font-size:16px}.empty-panel p{max-width:490px;margin:0 0 18px;color:var(--muted);font-size:11px;line-height:1.7}
  .editor{margin-top:20px;padding:20px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2)}.editor-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px}.eyebrow,.preview-label{color:var(--accent-text);font-size:9px;font-weight:800;letter-spacing:1.2px}.editor-head h2{margin:6px 0 0;font-size:17px}.close{width:34px;height:34px;border:1px solid var(--border);background:var(--surface);color:var(--text)}
  .editor-grid{display:grid;grid-template-columns:minmax(260px,.8fr) minmax(0,1.2fr);gap:22px}.fields{display:grid;align-content:start;gap:13px}.fields label{display:grid;gap:7px;color:var(--text-2);font-size:11px;font-weight:650}.fields input{width:100%;padding:11px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface);color:var(--text);font:inherit;font-size:12px}.helper,.preview-note{color:var(--muted);font-size:10px;line-height:1.6}.save:disabled{opacity:.45;cursor:not-allowed}
  .preview-wrap{display:grid;gap:10px}.certificate{aspect-ratio:1.414/1;padding:15px;background:#e8edf4;border-radius:5px;box-shadow:0 8px 25px #0002;color:#172b45}.cert-border{height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;border:5px double #7c9abb;padding:18px;text-align:center}.cert-brand{font-size:9px;letter-spacing:2px;color:#3c6c9e}.certificate h3{margin:18px 0 12px;font-family:Georgia,serif;font-size:clamp(18px,3vw,30px);letter-spacing:2px}.cert-caption,.cert-copy{margin:5px 0;font-family:Georgia,serif;font-size:clamp(9px,1.3vw,13px)}.participant{margin:8px 0;border-bottom:1px solid #9aabc0;padding:0 20px 5px;font-family:Georgia,serif;font-size:clamp(13px,2vw,21px)}.event-name{margin:5px 0;font-size:clamp(11px,1.6vw,16px)}.sign{display:grid;gap:4px;margin-top:auto;padding-top:15px;font-size:11px}.sign small{font-size:9px;color:#52647a}
  @media(max-width:760px){.heading{align-items:flex-start;flex-direction:column}.editor-grid{grid-template-columns:1fr}.certificate{min-height:240px}.certificate h3{font-size:22px}.participant{font-size:17px}}
</style>
