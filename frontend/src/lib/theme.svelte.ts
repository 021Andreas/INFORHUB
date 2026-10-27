// Pilihan tema warna: putih (light) atau hitam (dark).
// Disimpan di localStorage; tanpa pilihan, mengikuti pengaturan perangkat.
// Atribut data-theme pada <html> sudah diatur lebih awal oleh skrip di app.html
// supaya tidak ada kedipan saat halaman dimuat.
export type Theme = 'light' | 'dark';

const KEY = 'inforhub-theme';

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

class ThemeState {
  value = $state<Theme>('light');

  init() {
    if (typeof document === 'undefined') return;
    const attr = document.documentElement.dataset.theme;
    const initial: Theme =
      attr === 'light' || attr === 'dark'
        ? attr
        : (stored() ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    this.value = initial;
    document.documentElement.dataset.theme = initial;
  }

  set(next: Theme) {
    this.value = next;
    if (typeof document !== 'undefined') document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // penyimpanan diblokir; pilihan tetap berlaku selama halaman terbuka
    }
  }
}

export const theme = new ThemeState();
