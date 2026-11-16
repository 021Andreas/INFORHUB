import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { env } from "$env/dynamic/private";
import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont } from "pdf-lib";

/*
 * Font Unicode (DejaVu, lisensi bebas) agar nama dengan huruf Latin-diperluas, Yunani, atau Sirilik
 * tampil benar. Font standar PDF hanya mengenal Latin dasar.
 * Folder font bisa diganti lewat CERT_FONT_DIR (mis. bila node_modules tidak ikut ter-deploy).
 *
 * KETERBATASAN: pdf-lib tidak melakukan shaping/bidi. Skrip yang memerlukannya (Arab, Ibrani, India,
 * Thai, Jawa, dst.) akan salah tampil bila digambar apa adanya, jadi diganti "?" agar tidak ada
 * nama yang tercetak keliru. CJK tidak ada di font ini dan juga menjadi "?".
 */
export type FontFamily = "sans" | "serif";

const FILES: Record<FontFamily, Record<string, string>> = {
  sans: { r: "DejaVuSans.ttf", b: "DejaVuSans-Bold.ttf", i: "DejaVuSans-Oblique.ttf", bi: "DejaVuSans-BoldOblique.ttf" },
  serif: { r: "DejaVuSerif.ttf", b: "DejaVuSerif-Bold.ttf", i: "DejaVuSerif-Italic.ttf", bi: "DejaVuSerif-BoldItalic.ttf" },
};

const require = createRequire(import.meta.url);
function fontDir() {
  if (env.CERT_FONT_DIR) return path.resolve(env.CERT_FONT_DIR);
  return path.join(path.dirname(require.resolve("dejavu-fonts-ttf/package.json")), "ttf");
}

const bytesCache = new Map<string, Promise<Uint8Array>>();
const loadBytes = (file: string) => {
  let p = bytesCache.get(file);
  if (!p) {
    p = readFile(path.join(fontDir(), file));
    bytesCache.set(file, p);
    p.catch(() => bytesCache.delete(file)); // jangan menyimpan kegagalan
  }
  return p;
};

// Skrip yang butuh shaping/bidi atau penempatan tanda gabung: tidak aman digambar oleh pdf-lib
const COMPLEX = /[\u0590-\u08FF\u0900-\u0DFF\u0E00-\u0E7F\u1000-\u109F\u1780-\u17FF\uA980-\uA9DF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/gu;

type Metrics = { asc: number; desc: number }; // rasio terhadap ukuran font (em)

/** Satu set font per dokumen PDF (di-embed hanya bila dipakai, dan hanya karakter yang terpakai). */
export class FontSet {
  private fonts = new Map<string, Promise<PDFFont>>();
  private metricsOf = new WeakMap<PDFFont, Metrics>();
  constructor(private pdf: PDFDocument) {
    pdf.registerFontkit(fontkit);
  }

  get(family: FontFamily = "sans", bold = false, italic = false): Promise<PDFFont> {
    const key = `${family}:${bold ? "b" : ""}${italic ? "i" : ""}` || "r";
    const variant = bold && italic ? "bi" : bold ? "b" : italic ? "i" : "r";
    let p = this.fonts.get(key);
    if (!p) {
      p = loadBytes(FILES[family][variant]).then(async (b) => {
        const font = await this.pdf.embedFont(b, { subset: true });
        // Metrik ascent/descent SEBENARNYA dari berkas font. pdf-lib.heightAtSize(..., {descender:false})
        // bukan ascent (jauh lebih kecil), sehingga tidak dipakai untuk menempatkan baseline.
        const k = (fontkit as unknown as { create(b: Uint8Array): { ascent: number; descent: number; unitsPerEm: number } }).create(b);
        this.metricsOf.set(font, { asc: k.ascent / k.unitsPerEm, desc: -k.descent / k.unitsPerEm });
        return font;
      });
      this.fonts.set(key, p);
    }
    return p;
  }

  metrics(font: PDFFont): Metrics {
    return this.metricsOf.get(font) ?? { asc: 0.93, desc: 0.24 };
  }

  /** NFC, buang karakter kontrol, ganti yang tidak didukung dengan "?". Baris baru dipertahankan. */
  clean(font: PDFFont, text: string): string {
    const supported = new Set(font.getCharacterSet());
    return [...text.normalize("NFC").replace(CONTROL, "")]
      .map((ch) => {
        if (ch === "\n" || ch === " ") return ch;
        if (ch === "\t") return " ";
        const cp = ch.codePointAt(0)!;
        return !COMPLEX.test(ch) && supported.has(cp) ? ch : "?";
      })
      .join("");
  }
}
