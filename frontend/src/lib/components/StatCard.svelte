<script lang="ts">
  import Icon from '#lib/components/Icon.svelte';
  let { label, value, note, icon, tone = 'blue' }: { label: string; value: number | string; note: string; icon: string; tone?: 'blue' | 'green' | 'amber' | 'violet' } = $props();
</script>
<article class="stat-card">
  <div class={`stat-icon ${tone}`}><Icon name={icon} size={21}/></div>
  <div class="stat-info"><p>{label}</p><strong>{value}</strong><small>{note}</small></div>
</article>
<style>
  .stat-card{display:flex;align-items:flex-start;gap:15px;min-width:0;padding:20px;border:1px solid var(--border);border-radius:13px;background:linear-gradient(145deg,var(--surface),var(--surface-2))}
  .stat-icon{display:grid;place-items:center;width:44px;height:44px;flex-shrink:0;border:1px solid transparent;border-radius:12px}
  .stat-icon.blue{background:var(--accent-soft);border-color:var(--border-strong);color:var(--accent-text)}.stat-icon.green{background:var(--ok-bg);border-color:var(--ok-text);color:var(--ok-text)}.stat-icon.amber{background:var(--warn-bg);border-color:var(--warn-text);color:var(--warn-text)}.stat-icon.violet{background:var(--surface-3);border-color:var(--border-strong);color:var(--accent-text)}
  .stat-info{min-width:0}.stat-info p{margin:2px 0 9px;color:var(--muted);font-size:11px}.stat-info strong{display:block;font-size:28px;line-height:1.1;letter-spacing:-.8px;color:var(--text)}.stat-info small{display:block;margin-top:8px;color:var(--muted);font-size:10px;line-height:1.5}
</style>
