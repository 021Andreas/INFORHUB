
<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '#lib/api.js';

  type User = {
    id: number;
    name: string;
    email: string;
    role: 'Admin' | 'Penyelenggara' | 'Peserta';
    status: 'Aktif' | 'Nonaktif';
    joinedAt: string | null;
  };

  // Bentuk data dari GET /api/admin/users (nilai asli di database)
  type ApiUser = {
    id: number;
    name: string;
    email: string;
    role: 'mahasiswa' | 'penyelenggara' | 'admin';
    status: 'pending_verification' | 'active' | 'suspended';
    createdAt: string | null;
  };

  const roleLabel: Record<ApiUser['role'], User['role']> = {
    mahasiswa: 'Peserta',
    penyelenggara: 'Penyelenggara',
    admin: 'Admin'
  };

  function toUser(u: ApiUser): User {
    const date = u.createdAt ? new Date(u.createdAt) : null;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: roleLabel[u.role] ?? 'Peserta',
      status: u.status === 'active' ? 'Aktif' : 'Nonaktif',
      joinedAt:
        date && !Number.isNaN(date.getTime())
          ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(date)
          : null
    };
  }

  let users = $state<User[]>([]);
  let loading = $state(true);
  let error = $state('');
  let search = $state('');
  let roleFilter = $state('Semua');
  let statusFilter = $state('Semua');

  let filtered = $derived(
    users.filter((user) => {
      const keyword = search.toLowerCase();

      return (
        (user.name.toLowerCase().includes(keyword) ||
          user.email.toLowerCase().includes(keyword)) &&
        (roleFilter === 'Semua' || user.role === roleFilter) &&
        (statusFilter === 'Semua' || user.status === statusFilter)
      );
    })
  );

  let activeCount = $derived(
    users.filter((user) => user.status === 'Aktif').length
  );

  let adminCount = $derived(
    users.filter((user) => user.role === 'Admin').length
  );

  onMount(async () => {
    try {
      const data = await api<ApiUser[]>('/api/admin/users');
      users = data.map(toUser);
    } catch (err) {
      error = err instanceof Error
        ? err.message
        : 'Terjadi kesalahan saat memuat pengguna.';
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Pengguna | INFORHUB Admin</title>
</svelte:head>

<section class="page">
  <div class="breadcrumb">Admin / Pengguna</div>
  <h1>Manajemen Pengguna</h1>
  <p class="subtitle">Lihat akun yang terdaftar di INFORHUB.</p>

  <div class="stats">
    <article><span>Total pengguna</span><strong>{users.length}</strong></article>
    <article><span>Akun aktif</span><strong>{activeCount}</strong></article>
    <article><span>Administrator</span><strong>{adminCount}</strong></article>
  </div>

  <div class="filters">
    <input bind:value={search} placeholder="Cari nama atau email..." />
    <select bind:value={roleFilter}>
      <option>Semua</option>
      <option>Admin</option>
      <option>Penyelenggara</option>
      <option>Peserta</option>
    </select>
    <select bind:value={statusFilter}>
      <option>Semua</option>
      <option>Aktif</option>
      <option>Nonaktif</option>
    </select>
  </div>

  <section class="panel">
    {#if loading}
      <p class="empty">Memuat data pengguna...</p>
    {:else if error}
      <div class="empty">
        <strong>Data pengguna gagal dimuat</strong>
        <p>{error}</p>
        <p>Periksa koneksi API backend.</p>
      </div>
    {:else if filtered.length === 0}
      <div class="empty">
        <strong>Belum ada pengguna</strong>
        <p>Data akun akan muncul setelah tersedia dari backend.</p>
      </div>
    {:else}
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nama pengguna</th>
              <th>Email</th>
              <th>Peran</th>
              <th>Bergabung</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {#each filtered as user (user.id)}
              <tr>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.joinedAt ?? '—'}</td>
                <td>
                  <span class:active={user.status === 'Aktif'} class="status">
                    {user.status}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</section>

<style>
  .page { max-width:1200px; margin:auto; color:#e7edf7; }
  .breadcrumb { color:#7f94ad; font-size:11px; margin-bottom:9px; }
  h1 { margin:0 0 8px; font-size:27px; }
  .subtitle { color:#91a2b8; font-size:12px; margin-bottom:24px; }
  .stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:15px; margin-bottom:20px; }
  .stats article,.panel { border:1px solid #223145; border-radius:11px; background:#0d1722; }
  .stats article { padding:20px; display:grid; gap:12px; }
  .stats span { color:#91a2b8; font-size:11px; }
  .stats strong { font-size:27px; }
  .filters { display:flex; gap:12px; margin-bottom:16px; }
  input,select { padding:12px; border:1px solid #2a3b50; border-radius:8px; background:#101c29; color:#e7edf7; }
  input { flex:1; min-width:0; }
  .panel { overflow:hidden; }
  .empty { padding:40px 20px; text-align:center; color:#91a2b8; font-size:12px; }
  .empty strong { color:#e7edf7; }
  .table-scroll { overflow-x:auto; }
  table { width:100%; border-collapse:collapse; text-align:left; white-space:nowrap; font-size:12px; }
  th,td { padding:15px; border-bottom:1px solid #223145; }
  th { background:#101c29; color:#91a2b8; }
  .status { padding:5px 9px; border-radius:20px; background:#3c301a; color:#f3ca76; }
  .status.active { background:#123b30; color:#71dfb0; }
  @media(max-width:700px) { .stats { grid-template-columns:1fr; } .filters { flex-direction:column; } }
</style>
