<script lang="ts">
  import Icon from '#lib/components/Icon.svelte';
  let { icon = 'calendar', title, description }: { icon?: string; title: string; description: string } = $props();
</script>
<div class="empty-state">
  <span class="empty-icon"><Icon name={icon} size={24}/></span>
  <strong>{title}</strong>
  <p>{description}</p>
</div>
<style>
  .empty-state{display:flex;min-height:165px;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:25px;text-align:center}
  .empty-icon{display:grid;place-items:center;width:48px;height:48px;border:1px solid var(--border-strong);border-radius:14px;background:var(--surface-3);color:var(--accent-text)}
  strong{color:var(--text);font-size:12px}p{max-width:310px;margin:0;color:var(--muted);font-size:11px;line-height:1.7}
</style>
