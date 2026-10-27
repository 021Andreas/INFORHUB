<script lang="ts">
  let { name, size = 20, stroke = 1.8 }: { name: string; size?: number; stroke?: number } = $props();
  const paths: Record<string, string[]> = {
    home: ['M3 10.5 12 3l9 7.5','M5.5 9.5V21h13V9.5'],
    calendar: ['M7 3v4','M17 3v4','M3.5 9h17','M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z'],
    ticket: ['M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6V5Z','M12 8v2','M12 14v2'],
    certificate: ['M5 3h14v14H5z','m9 17-1 4 4-2 4 2-1-4','M8 7h8','M8 11h5'],
    help: ['M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3','M12 17h.01','M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'],
    info: ['M12 16v-4','M12 8h.01','M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'],
    users: ['M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2','M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z','M20 8v6','M17 11h6'],
    qr: ['M3 3h7v7H3z','M14 3h7v7h-7z','M3 14h7v7H3z','M14 14h3v3h-3z','M19 14h2v2','M19 19h2v2','M14 19h3v2'],
    search: ['m20 20-4.5-4.5','M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z'],
    logout: ['M10 17l5-5-5-5','M15 12H3','M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6'],
    settings: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z','M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 3.1-.2-.1a1.7 1.7 0 0 0-1.8.1l-.2.1h-3.6l-.1-.2a1.7 1.7 0 0 0-1.5-1l-.2.1-3.1-1.8.1-.2a1.7 1.7 0 0 0-.1-1.8l-.1-.2v-3.6l.2-.1a1.7 1.7 0 0 0 1-1.5l-.1-.2 1.8-3.1.2.1a1.7 1.7 0 0 0 1.8-.1l.2-.1h3.6l.1.2a1.7 1.7 0 0 0 1.5 1l.2-.1 3.1 1.8-.1.2a1.7 1.7 0 0 0 .1 1.8l.1.2v3.6Z'],
    menu: ['M4 6h16','M4 12h16','M4 18h16'],
    user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2','M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z'],
    'chevron-down': ['m6 9 6 6 6-6'],
    'arrow-up-right': ['M7 17 17 7','M7 7h10v10'],
    clock: ['M12 8v4l3 2','M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'],
    'map-pin': ['M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z','M12 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'],
    event: ['M4 5h16v16H4z','M8 3v4','M16 3v4','M4 10h16'],
    chart: ['M4 19V5','M4 19h17','m7 15 4-5 3 2 5-7'],
    check: ['m5 12 4 4L19 6'],
    close: ['M18 6 6 18','M6 6l12 12'],
    plus: ['M12 5v14','M5 12h14'],
    bookmark: ['M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z'],
    share: ['M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7','m16 6-4-4-4 4','M12 2v13'],
    file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z','M14 2v6h6','M8 13h8','M8 17h8']
  };
</script>
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#each (paths[name] ?? paths.info) as d}
    <path d={d} />
  {/each}
</svg>
