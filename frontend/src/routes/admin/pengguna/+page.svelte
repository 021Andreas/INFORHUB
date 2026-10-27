<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "#lib/api.js";

  type User = {
    id: number; name: string; email: string;
    role: "mahasiswa" | "penyelenggara" | "admin";
    status: "pending_verification" | "active" | "suspended";
    createdAt: string;
  };

  let users = $state<User[]>([]);
  let loading = $state(true);
  let error = $state("");
  let search = $state("");
  let roleFilter = $state("Semua");
  let statusFilter = $state("Semua");

  let filtered = $derived(users.filter((user) => {
    const keyword = search.trim().toLowerCase();
    return (
      `${user.name} ${user.email}`.toLowerCase().includes(keyword) &&
      (roleFilter === "Semua" || user.role === roleFilter) &&
      (statusFilter === "Semua" || user.status === statusFilter)
    );
  }));

  let activeCount = $derived(users.filter((user) => user.status === "active").length);
  let adminCount = $derived(users.filter((user) => user.role === "admin").length);

  onMount(async () => {
    try {
      users = await api<User[]>("/api/admin/user");
    } catch (e) {
      error = e instanceof Error ? e.message : "Gagal memuat pengguna.";
    } finally {
      loading = false;
    }
  });

  function dateLabel(value: string) {
    return new Date(value).toLocaleDateString("id-ID", { dateStyle: "medium" });
  }

  function roleLabel(role: User["role"]) {
    return role === "mahasiswa" ? "Mahasiswa" : role === "penyelenggara" ? "Penyelenggara" : "Admin";
  }

  function statusLabel(status: User["status"]) {
    return status === "active" ? "Aktif" : status === "suspended" ? "Ditangguhkan" : "Menunggu verifikasi";
  }
</script>

<svelte:head><title>Pengguna | INFORHUB Admin</title></svelte:head>

<section class="page">
  <div class="breadcrumb">Admin / Pengguna</div>
  <h1>Manajemen Pengguna</h1>
  <p class="subtitle">Daftar akun pengguna yang tersimpan di database INFORHUB.</p>

  <div class="stats">
    <article><span>Total pengguna</span><strong>{users.length}</strong></article>
    <article><span>Akun aktif</span><strong class="blue">{activeCount}</strong></article>
    <article><span>Administrator</span><strong>{adminCount}</strong></article>
  </div>

  <section class="panel">
    <div class="filters">
      <input bind:value={search} placeholder="Cari nama atau email..." aria-label="Cari pengguna" />
      <select bind:value={roleFilter} aria-label="Filter peran">
        <option value="Semua">Semua peran</option>
        <option value="mahasiswa">Mahasiswa</option>
        <option value="penyelenggara">Penyelenggara</option>
        <option value="admin">Admin</option>
      </select>
      <select bind:value={statusFilter} aria-label="Filter status">
        <option value="Semua">Semua status</option>
        <option value="active">Aktif</option>
        <option value="pending_verification">Menunggu verifikasi</option>
        <option value="suspended">Ditangguhkan</option>
      </select>
    </div>
    <div class="count">{filtered.length} pengguna ditemukan</div>

    {#if loading}
      <div class="state">Memuat pengguna...</div>
    {:else if error}
      <div class="state error"><strong>Pengguna gagal dimuat</strong><p>{error}</p></div>
    {:else if filtered.length === 0}
      <div class="state"><strong>Belum ada pengguna</strong><p>Akun yang terdaftar akan muncul di sini.</p></div>
    {:else}
      <div class="table-scroll"><table>
        <thead><tr><th>Pengguna</th><th>Peran</th><th>Bergabung</th><th>Status akun</th></tr></thead>
        <tbody>{#each filtered as user (user.id)}
          <tr>
            <td><strong>{user.name}</strong><small>{user.email}</small></td>
            <td>{roleLabel(user.role)}</td>
            <td>{dateLabel(user.createdAt)}</td>
            <td><span class:active={user.status === "active"} class="status">{statusLabel(user.status)}</span></td>
          </tr>
        {/each}</tbody>
      </table></div>
    {/if}
  </section>
</section>

<style>
  .page{max-width:1200px;margin:auto;color:var(--text)}.breadcrumb{color:var(--muted);font-size:11px;margin-bottom:9px}h1{margin:0 0 8px;font-size:27px}.subtitle{margin:0 0 24px;color:var(--muted);font-size:12px}
  .stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:18px}.stats article,.panel{border:1px solid var(--border);border-radius:11px;background:var(--surface-2)}.stats article{padding:19px;display:grid;gap:10px}.stats span{color:var(--muted);font-size:11px}.stats strong{font-size:27px}.stats .blue{color:var(--accent-text)}
  .panel{overflow:hidden}.filters{display:flex;gap:10px;padding:17px 18px 10px}input,select{min-width:0;padding:11px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface);color:var(--text);font-size:11px}input{flex:1}.count{padding:8px 18px 15px;color:var(--muted);font-size:11px}
  .table-scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left;white-space:nowrap;font-size:12px}th,td{padding:15px;border-bottom:1px solid var(--border)}th{background:var(--surface);color:var(--muted)}td strong,td small{display:block}td strong{margin-bottom:5px}td small{color:var(--muted);font-size:10px}
  .status{padding:5px 9px;border-radius:20px;background:var(--warn-bg);color:var(--warn-text);font-size:10px}.status.active{background:var(--ok-bg);color:var(--ok-text)}.state{padding:42px 20px;text-align:center;color:var(--muted);font-size:12px}.state strong{color:var(--text)}.state p{line-height:1.6}.error{color:var(--err-text)}
  @media(max-width:700px){.stats{grid-template-columns:1fr}.filters{flex-direction:column}}
</style>
