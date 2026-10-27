<script lang="ts">
  import { theme } from '#lib/theme.svelte.js';
</script>

<div class="theme-toggle" role="group" aria-label="Pilihan warna tampilan">
  <button
    type="button"
    class:active={theme.value === 'light'}
    aria-pressed={theme.value === 'light'}
    title="Tampilan putih"
    onclick={() => theme.set('light')}
  >
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
    <span>Putih</span>
  </button>
  <button
    type="button"
    class:active={theme.value === 'dark'}
    aria-pressed={theme.value === 'dark'}
    title="Tampilan hitam"
    onclick={() => theme.set('dark')}
  >
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
    <span>Hitam</span>
  </button>
</div>

<style>
  .theme-toggle { display: inline-flex; padding: 3px; gap: 2px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface-2)}
  button { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 10px; border: 0; border-radius: 7px; background: transparent; color: var(--muted); font-size: 11px; font-weight: 650; cursor: pointer}
  button:hover { color: var(--text)}
  button.active { background: var(--accent); color: var(--text)}
  button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px}
  @media (max-width: 720px) { button { padding: 0 8px} button span { display: none} }
</style>
