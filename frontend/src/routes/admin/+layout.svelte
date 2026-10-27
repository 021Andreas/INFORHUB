<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { api } from '#lib/api.js';
  import Brand from '#lib/components/Brand.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import ThemeToggle from '#lib/components/ThemeToggle.svelte';
  let { children } = $props();
  let sidebarOpen = $state(false);
  let profileOpen = $state(false);
  let user = $state<{name:string;role:string;email?:string}|null>(null);
  const navGroups = [
    {label:'MENU UTAMA',items:[
      {label:'Dashboard',href:'/admin',icon:'home'},
      {label:'Kelola Acara',href:'/admin/acara',icon:'calendar'},
      {label:'Peserta',href:'/admin/peserta',icon:'users'},
      {label:'Absensi QR',href:'/admin/absensi',icon:'qr'},
      {label:'Sertifikat',href:'/admin/sertifikat',icon:'certificate'}]},
    {label:'PENGELOLAAN',items:[{label:'Pengguna',href:'/admin/pengguna',icon:'users'}]}
  ];
  let currentTitle = $derived(navGroups.flatMap(g=>g.items).find(i=>i.href===page.url.pathname)?.label ?? 'Dashboard');
  function isActive(href:string){return href==='/admin'?page.url.pathname==='/admin':page.url.pathname===href||page.url.pathname.startsWith(href+'/');}
  onMount(async()=>{try{const res=await api<{user:{name:string;role:string;email?:string}}>('/api/auth/me');if(!['admin','penyelenggara'].includes(res.user.role)){await goto('/');return;}user=res.user;}catch{await goto('/login');}});
  async function logout(){try{await api('/api/auth/logout',{method:'POST'});}catch{}await goto('/login');}
</script>
<svelte:head><title>{currentTitle} | INFORHUB Admin</title><meta name="description" content="Panel pengelolaan acara INFORHUB"/></svelte:head>
<div class="admin-shell">
  {#if sidebarOpen}<button class="overlay" aria-label="Tutup navigasi" onclick={()=>sidebarOpen=false}></button>{/if}
  <aside class:mobile-open={sidebarOpen} class="sidebar">
    <div class="brand-row"><Brand href="/admin"/></div>
    <nav class="nav-content">{#each navGroups as group}<div class="nav-group"><p class="group-label">{group.label}</p>{#each group.items as item}{#if item.href !== '/admin/pengguna' || user?.role === 'admin'}<a href={item.href} class:active={isActive(item.href)} class="nav-item" onclick={()=>sidebarOpen=false}><Icon name={item.icon} size={19}/><span>{item.label}</span></a>{/if}{/each}</div>{/each}
      <div class="nav-group"><p class="group-label">LAINNYA</p><a href="/" class="nav-item"><Icon name="home" size={19}/><span>Lihat situs</span></a><button class="nav-item nav-button" onclick={logout}><Icon name="logout" size={19}/><span>Keluar</span></button></div>
    </nav>
    <div class="sidebar-footer"><div class="footer-mark"><Brand compact href="/admin"/></div><div><strong>INFORHUB Admin</strong><p>Kelola acara dan peserta dengan mudah.</p></div></div>
  </aside>
  <div class="main-area">
    <header class="topbar"><button class="menu-toggle" aria-label="Buka navigasi" onclick={()=>sidebarOpen=!sidebarOpen}><Icon name="menu" size={22}/></button><div class="mobile-title">{currentTitle}</div>
      <div class="search-box"><Icon name="search" size={18}/><input type="search" placeholder="Cari acara atau peserta..." aria-label="Cari acara atau peserta" /></div>
      <div class="topbar-right"><ThemeToggle /><div class="profile-wrap"><button class="profile" aria-expanded={profileOpen} onclick={()=>profileOpen=!profileOpen}><span class="avatar">{(user?.name??'A').slice(0,1).toUpperCase()}</span><span class="profile-copy"><strong>{user?.name??'Memuat akun...'}</strong><small>{user?.role==='admin'?'Administrator':user?.role==='penyelenggara'?'Penyelenggara':''}</small></span><Icon name="chevron-down" size={16}/></button>
        {#if profileOpen}<div class="profile-menu"><div class="menu-user"><strong>{user?.name??'Pengguna'}</strong><small>{user?.email??''}</small></div><a href="/">Lihat situs publik</a><button onclick={logout}>Keluar dari akun</button></div>{/if}</div></div>
    </header>
    <main class="page-content">{@render children()}</main>
  </div>
</div>
<style>
:global(*){box-sizing:border-box}:global(body){margin:0;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}:global(a){color:inherit;text-decoration:none}:global(button),:global(input){font:inherit}.admin-shell{min-height:100vh;background:var(--bg)}.sidebar{position:fixed;inset:0 auto 0 0;z-index:30;width:252px;display:flex;flex-direction:column;background:var(--surface-2);border-right:1px solid var(--border)}.brand-row{height:82px;display:flex;align-items:center;padding:0 18px;border-bottom:1px solid var(--border)}.brand-row :global(img){width:214px}.nav-content{flex:1;overflow:auto;padding:22px 13px 14px}.nav-group{margin-bottom:25px}.group-label{margin:0 12px 11px;color:var(--muted);font-size:10px;font-weight:800;letter-spacing:1.2px}.nav-item{position:relative;display:flex;align-items:center;gap:13px;min-height:47px;margin:4px 0;padding:0 13px;border:1px solid transparent;border-radius:9px;background:transparent;color:var(--text-2);font-size:12px;text-align:left;cursor:pointer;width:100%}.nav-item :global(svg){color:var(--muted);flex-shrink:0}.nav-item:hover{background:var(--surface);color:var(--text)}.nav-item.active{background:var(--accent-soft);border-color:var(--border-strong);color:var(--accent-text)}.nav-item.active :global(svg){color:var(--accent-text)}.nav-item.active:before{position:absolute;left:-14px;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;background:var(--accent);content:''}.sidebar-footer{display:flex;align-items:flex-start;gap:12px;margin:12px;padding:15px 12px;border:1px solid var(--border);border-radius:11px;background:var(--surface)}.footer-mark :global(img){width:38px}.sidebar-footer strong{font-size:11px}.sidebar-footer p{margin:6px 0 0;color:var(--muted);font-size:10px;line-height:1.6}.main-area{min-height:100vh;margin-left:252px}.topbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:20px;height:82px;padding:0 30px;border-bottom:1px solid var(--border);background:var(--bg)}.search-box{display:flex;align-items:center;gap:12px;width:min(100%,690px);height:46px;padding:0 15px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);color:var(--muted)}.search-box input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--text);font-size:12px}.topbar-right{display:flex;align-items:center;gap:12px;margin-left:auto}.profile-wrap{position:relative}.profile{display:flex;align-items:center;gap:11px;padding:5px 7px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--text);text-align:left;cursor:pointer}.profile:hover,.profile[aria-expanded=true]{border-color:var(--border);background:var(--surface)}.profile :global(svg){color:var(--muted);transition:transform .18s ease}.profile[aria-expanded=true] :global(svg){transform:rotate(180deg)}.avatar{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:var(--accent);color:white;font-size:17px}.profile-copy{display:grid;gap:5px;min-width:120px}.profile-copy strong{font-size:12px}.profile-copy small{color:var(--muted);font-size:10px;text-transform:capitalize}.profile-menu{position:absolute;top:calc(100% + 12px);right:0;z-index:70;width:220px;padding:8px;border:1px solid var(--border-strong);border-radius:11px;background:var(--surface);box-shadow:0 18px 40px #0006}.menu-user{display:grid;gap:5px;padding:11px;border-bottom:1px solid var(--border)}.menu-user strong{font-size:12px}.menu-user small{color:var(--muted);font-size:10px;overflow-wrap:anywhere}.profile-menu a,.profile-menu button{display:block;width:100%;padding:11px;border:0;border-radius:7px;background:transparent;color:var(--text-2);text-align:left;font-size:11px;cursor:pointer}.profile-menu a:hover,.profile-menu button:hover{background:var(--surface-3)}.page-content{max-width:1700px;margin:0 auto;padding:30px 32px 45px}.menu-toggle,.mobile-title,.overlay{display:none}
@media(max-width:1000px){.sidebar{width:225px}.main-area{margin-left:225px}.page-content{padding:24px 20px}.topbar{padding:0 20px}.profile-copy{display:none}.brand-row :global(img){width:185px}}
@media(max-width:720px){.sidebar{transform:translateX(-105%);transition:transform .2s ease;width:270px;box-shadow:15px 0 40px #0005}.sidebar.mobile-open{transform:translateX(0)}.overlay{display:block;position:fixed;inset:0;z-index:25;border:0;background:#0009}.main-area{margin-left:0}.topbar{height:70px;padding:0 14px;gap:12px}.menu-toggle{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface);color:var(--text)}.mobile-title{display:block;font-size:13px;font-weight:700}.search-box{display:none}.topbar-right{margin-left:auto}.profile-copy{display:grid;min-width:0}.profile-copy strong{max-width:105px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.avatar{width:35px;height:35px}.page-content{padding:21px 14px 35px}.brand-row{height:75px}}
</style>
