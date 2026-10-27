<script lang="ts">
  // `lightBackground` dipertahankan agar pemanggil lama tetap valid; logo kini mengikuti tema.
  let { compact = false, href = '/', lightBackground = false }: { compact?: boolean; href?: string; lightBackground?: boolean } = $props();
</script>
<a class:compact href={href} class="brand" aria-label="INFORHUB beranda" data-light-bg={lightBackground}>
  {#if compact}
    <img src="/images/inforhub-mark.png" alt="INFORHUB" />
  {:else}
    <img class="logo-dark-bg" src="/images/inforhub-logo.png" alt="INFORHUB" />
    <img class="logo-light-bg" src="/images/inforhub-logo-light.png" alt="INFORHUB" />
  {/if}
</a>
<style>
  .brand { display:inline-flex; align-items:center; min-width:0}
  img { display:block; width:228px; max-width:100%; height:auto; object-fit:contain}
  .compact img { width:44px}
  :global(:root[data-theme='dark']) .logo-light-bg { display:none}
  :global(:root:not([data-theme='dark'])) .logo-dark-bg { display:none}
</style>
