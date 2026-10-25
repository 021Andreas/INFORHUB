
<script lang="ts">
  let dateRange = $state('7 hari terakhir');

  const stats = [
    {
      label: 'Total Acara',
      value: 0,
      description: 'Semua acara yang dibuat',
      icon: '▣',
      color: 'blue'
    },
    {
      label: 'Total Peserta',
      value: 0,
      description: 'Peserta terdaftar',
      icon: '♧',
      color: 'green'
    },
    {
      label: 'Peserta Hadir',
      value: 0,
      description: 'Telah melakukan absensi',
      icon: '▦',
      color: 'yellow'
    },
    {
      label: 'Sertifikat Terbit',
      value: 0,
      description: 'Sertifikat yang dikeluarkan',
      icon: '◇',
      color: 'purple'
    }
  ];

  const eventStatuses = [
    { label: 'Pendaftaran dibuka', count: 0, color: 'green' },
    { label: 'Sedang berlangsung', count: 0, color: 'blue' },
    { label: 'Segera berlangsung', count: 0, color: 'yellow' },
    { label: 'Selesai', count: 0, color: 'red' }
  ];
</script>

<svelte:head>
  <title>Dashboard | INFORHUB Admin</title>
</svelte:head>

<div class="dashboard">
  <div class="page-heading">
    <div>
      <h1>Dashboard</h1>
      <p>Ringkasan aktivitas dan statistik acara INFORHUB.</p>
    </div>

    <label class="date-filter">
      <span>▣</span>
      <select bind:value={dateRange} aria-label="Rentang waktu grafik">
        <option>7 hari terakhir</option>
        <option>30 hari terakhir</option>
        <option>90 hari terakhir</option>
      </select>
    </label>
  </div>

  <section class="stats-grid" aria-label="Statistik utama">
    {#each stats as stat}
      <article class="stat-card">
        <div class="stat-icon {stat.color}">{stat.icon}</div>
        <div class="stat-info">
          <p>{stat.label}</p>
          <strong>{stat.value}</strong>
          <small>{stat.description}</small>
        </div>
      </article>
    {/each}
  </section>

  <section class="overview-grid">
    <article class="panel chart-panel">
      <div class="panel-heading">
        <h2><span class="heading-icon blue-text">▥</span> Grafik Pendaftaran</h2>
        <span class="period-label">{dateRange}</span>
      </div>

      <div class="empty-chart">
        <div class="chart-grid">
          <span>50</span>
          <span>40</span>
          <span>30</span>
          <span>20</span>
          <span>10</span>
          <span>0</span>
        </div>
        <div class="chart-message">
          <span class="empty-icon">▥</span>
          <strong>Belum ada data pendaftaran</strong>
          <p>Grafik akan menampilkan tren peserta setelah tersedia data.</p>
        </div>
        <div class="chart-axis">
          <span>Hari 1</span>
          <span>Hari 2</span>
          <span>Hari 3</span>
          <span>Hari 4</span>
          <span>Hari 5</span>
          <span>Hari 6</span>
          <span>Hari 7</span>
        </div>
      </div>
    </article>

    <article class="panel status-panel">
      <div class="panel-heading">
        <h2><span class="heading-icon">◷</span> Status Acara</h2>
      </div>

      <div class="status-empty">
        <span class="large-empty-icon">▣</span>
        <strong>Belum ada acara</strong>
        <p>Status acara akan muncul setelah admin menerbitkan acara.</p>
      </div>

      <div class="status-list">
        {#each eventStatuses as status}
          <div class="status-row">
            <span class="status-dot {status.color}"></span>
            <span>{status.label}</span>
            <strong>{status.count}</strong>
          </div>
        {/each}
      </div>
    </article>
  </section>

  <section class="content-grid">
    <article class="panel content-panel">
      <div class="panel-heading">
        <h2><span class="heading-icon">▣</span> Acara Terbaru</h2>
        <a href="/admin/acara" class="view-all">Lihat semua ↗</a>
      </div>

      <div class="empty-state">
        <span class="large-empty-icon">▣</span>
        <strong>Belum ada acara</strong>
        <p>Buat acara pertama untuk mulai mengisi halaman INFORHUB.</p>
        <a class="primary-button" href="/admin/acara">
          <span>＋</span> Buat Acara
        </a>
      </div>
    </article>

    <article class="panel content-panel">
      <div class="panel-heading">
        <h2><span class="heading-icon">♧</span> Peserta Terbaru</h2>
        <a href="/admin/peserta" class="view-all">Lihat semua ↗</a>
      </div>

      <div class="empty-state">
        <span class="large-empty-icon">♧</span>
        <strong>Belum ada peserta</strong>
        <p>Peserta yang mendaftar akan ditampilkan di sini.</p>
      </div>
    </article>

    <article class="panel content-panel">
      <div class="panel-heading">
        <h2><span class="heading-icon blue-text">▦</span> Perlu Absensi</h2>
        <a href="/admin/absensi" class="view-all">Lihat semua ↗</a>
      </div>

      <div class="empty-state">
        <span class="large-empty-icon">▦</span>
        <strong>Belum ada peserta untuk absensi</strong>
        <p>Peserta terdaftar akan muncul ketika tersedia data acara.</p>
      </div>
    </article>

    <article class="panel content-panel">
      <div class="panel-heading">
        <h2><span class="heading-icon">◇</span> Sertifikat Terbaru</h2>
        <a href="/admin/sertifikat" class="view-all">Lihat semua ↗</a>
      </div>

      <div class="empty-state">
        <span class="large-empty-icon">◇</span>
        <strong>Belum ada sertifikat</strong>
        <p>Sertifikat muncul setelah peserta memenuhi persyaratan acara.</p>
      </div>
    </article>
  </section>
</div>

<style>
  .dashboard { width: 100%; max-width: 1600px; margin: 0 auto; }
  h1, h2, p { margin-top: 0; }
  .page-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    margin-bottom: 24px;
  }
  h1 { margin-bottom: 5px; font-size: 28px; letter-spacing: -.8px; }
  .page-heading p { margin-bottom: 0; color: #91a2b8; font-size: 13px; }

  .date-filter {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
    min-height: 40px;
    border: 1px solid #28384b;
    border-radius: 8px;
    color: #b8c7da;
    background: #101a27;
  }
  .date-filter select {
    max-width: 170px;
    border: 0;
    outline: 0;
    background: transparent;
    color: #cbd7e7;
    font-size: 12px;
  }
  .date-filter option { background: #101a27; }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 14px;
  }
  .stat-card {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
    min-height: 116px;
    padding: 18px;
    border: 1px solid #26364a;
    border-radius: 11px;
    background: linear-gradient(135deg, #12233a, #101b29);
  }
  .stat-card:nth-child(2) { background: linear-gradient(135deg, #102b2b, #101c27); }
  .stat-card:nth-child(3) { background: linear-gradient(135deg, #29251c, #151b24); }
  .stat-card:nth-child(4) { background: linear-gradient(135deg, #24203a, #151b2a); }

  .stat-icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 53px;
    height: 53px;
    border-radius: 11px;
    font-size: 28px;
    color: white;
    background: #237cf4;
  }
  .stat-icon.green { background: #21896f; }
  .stat-icon.yellow { background: #a87912; }
  .stat-icon.purple { background: #7250b7; }

  .stat-info { min-width: 0; }
  .stat-info p { margin-bottom: 5px; color: #c4d1e2; font-size: 12px; }
  .stat-info strong { display: block; margin-bottom: 5px; font-size: 27px; }
  .stat-info small { color: #95a6bc; font-size: 10px; line-height: 1.4; }

  .overview-grid, .content-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(260px, .9fr);
    gap: 14px;
    margin-bottom: 14px;
  }
  .panel {
    min-width: 0;
    border: 1px solid #223145;
    border-radius: 11px;
    background: #0d1722;
  }
  .chart-panel, .status-panel { min-height: 280px; padding: 17px; }
  .panel-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
  .panel-heading h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 0;
    font-size: 13px;
    font-weight: 650;
  }
  .heading-icon { color: #d0ddef; font-size: 19px; }
  .blue-text { color: #3994ff; }
  .period-label {
    padding: 7px 9px;
    border: 1px solid #2a3a4e;
    border-radius: 7px;
    color: #b8c7d8;
    font-size: 10px;
  }

  .empty-chart { position: relative; height: 208px; margin-top: 17px; }
  .chart-grid {
    position: absolute;
    inset: 4px 0 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    color: #7f91a8;
    font-size: 10px;
  }
  .chart-grid span {
    display: block;
    position: relative;
    padding-left: 4px;
  }
  .chart-grid span::after {
    content: '';
    position: absolute;
    left: 25px;
    right: 0;
    top: 50%;
    border-top: 1px dashed #1e2c3c;
  }
  .chart-message {
    position: absolute;
    top: 40px;
    left: 28px;
    right: 0;
    bottom: 35px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
  }
  .empty-icon { margin-bottom: 8px; color: #8fa2bc; font-size: 29px; }
  .chart-message strong, .empty-state strong, .status-empty strong {
    font-size: 12px;
  }
  .chart-message p, .empty-state p, .status-empty p {
    max-width: 310px;
    margin: 7px 0 0;
    color: #91a2b8;
    font-size: 11px;
    line-height: 1.6;
  }
  .chart-axis {
    position: absolute;
    bottom: 0;
    left: 28px;
    right: 0;
    display: flex;
    justify-content: space-between;
    color: #8294aa;
    font-size: 9px;
  }

  .status-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 24px 0 18px;
  }
  .large-empty-icon {
    display: block;
    margin-bottom: 8px;
    color: #7f94ae;
    font-size: 35px;
    line-height: 1.1;
  }
  .status-empty p { max-width: 250px; margin-top: 5px; }
  .status-list { display: grid; gap: 11px; margin-top: 3px; }
  .status-row {
    display: flex;
    align-items: center;
    gap: 9px;
    color: #aab9cc;
    font-size: 10px;
  }
  .status-row strong { margin-left: auto; color: #dbe5f3; }
  .status-dot { width: 9px; height: 9px; border-radius: 50%; }
  .status-dot.green { background: #36b88d; }
  .status-dot.blue { background: #398bfa; }
  .status-dot.yellow { background: #edbd43; }
  .status-dot.red { background: #ef626e; }

  .content-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .content-panel { min-height: 198px; padding: 17px; }
  .view-all { color: #3994ff; font-size: 11px; white-space: nowrap; }
  .view-all:hover { color: #82bbff; }
  .empty-state {
    display: flex;
    min-height: 139px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px 0 0;
    text-align: center;
  }
  .empty-state p { margin-top: 5px; }
  .primary-button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-top: 12px;
    padding: 10px 18px;
    border-radius: 7px;
    color: white;
    background: #247cf4;
    font-size: 11px;
    font-weight: 650;
    transition: background .15s;
  }
  .primary-button:hover { background: #4090ff; }
  .primary-button span { font-size: 17px; line-height: 12px; }

  @media (max-width: 1200px) {
    .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .overview-grid { grid-template-columns: minmax(0, 1.3fr) minmax(240px, .9fr); }
    .stat-card { padding: 15px; }
  }
  @media (max-width: 760px) {
    .page-heading { align-items: flex-start; flex-direction: column; }
    h1 { font-size: 24px; }
    .overview-grid, .content-grid { grid-template-columns: 1fr; }
    .chart-panel, .status-panel { min-height: 250px; }
    .content-panel { min-height: 190px; }
  }
  @media (max-width: 420px) {
    .stats-grid { grid-template-columns: 1fr; }
    .stat-card { min-height: 95px; }
    .panel-heading h2 { font-size: 12px; }
  }
</style>
