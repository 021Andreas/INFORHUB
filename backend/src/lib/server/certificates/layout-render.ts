import QRCode from "qrcode";
import { PDFDocument, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import { AppError } from "$lib/server/errors";
import type { FontSet } from "./fonts";
import { PLACEHOLDER_RE, type CertificateLayout, type PlaceholderKey } from "./layout";

export type RenderContext = {
  values: Record<PlaceholderKey, string>;
  verifyUrl: string; // isi QR: dibuat server, bukan dari editor
  loadAsset: (assetId: number) => Promise<{ bytes: Uint8Array; mime: string }>;
};

const hex = (c: string) => {
  const n = parseInt(c.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

const fill = (text: string, values: Record<string, string>) =>
  text.replace(PLACEHOLDER_RE, (_, k: string) => values[k] ?? "");

/** Bungkus per kata; kata yang lebih panjang dari kotak dipotong per karakter. */
function wrapLines(paragraphs: string[], font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  const w = (t: string) => font.widthOfTextAtSize(t, size);
  for (const p of paragraphs) {
    const words = p.split(/ +/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let line = "";
    for (let word of words) {
      while (w(word) > maxWidth && word.length > 1) {
        // potong kata raksasa
        let cut = word.length - 1;
        while (cut > 1 && w(word.slice(0, cut)) > maxWidth) cut--;
        if (line) {
          out.push(line);
          line = "";
        }
        out.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const next = line ? `${line} ${word}` : word;
      if (line && w(next) > maxWidth) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

export async function drawLayout(pdf: PDFDocument, layout: CertificateLayout, ctx: RenderContext, fonts: FontSet) {
  const landscape = layout.canvas.orientation === "landscape";
  const [pw, ph] = landscape ? [841.89, 595.28] : [595.28, 841.89];
  const page = pdf.addPage([pw, ph]);
  const cw = layout.canvas.width;
  const ch = layout.canvas.height;
  // skala seragam + pemusatan: bentuk tidak terdistorsi bila rasio kanvas sedikit berbeda dari A4
  const s = Math.min(pw / cw, ph / ch);
  const ox = (pw - cw * s) / 2;
  const oy = (ph - ch * s) / 2;
  const X = (x: number) => ox + x * s;
  const Y = (y: number) => oy + (ch - y) * s; // y kanvas (atas->bawah) -> y PDF (bawah->atas)

  page.drawRectangle({ x: 0, y: 0, width: pw, height: ph, color: hex(layout.canvas.background) });

  const images = new Map<number, Promise<PDFImage>>();
  const getImage = (assetId: number) => {
    let p = images.get(assetId);
    if (!p) {
      p = ctx.loadAsset(assetId).then(({ bytes, mime }) => (mime === "image/png" ? pdf.embedPng(bytes) : pdf.embedJpg(bytes)));
      images.set(assetId, p);
    }
    return p;
  };

  for (const el of layout.elements) {
    switch (el.type) {
      case "text": {
        const font = await fonts.get(el.fontFamily, el.bold, el.italic);
        const raw = fonts.clean(font, fill(el.text, ctx.values));
        const boxW = el.width * s;
        let size = el.fontSize * s;
        let lines: string[];
        if (el.fit === "shrink") {
          const single = raw.replace(/\s*\n\s*/g, " ").trim();
          while (size > 4 && font.widthOfTextAtSize(single, size) > boxW) size -= 0.5;
          lines = [single];
        } else {
          lines = wrapLines(raw.split(/\r?\n/), font, size, boxW);
        }
        // Model kotak baris seperti CSS: kotak baris setinggi fontSize x lineHeight dimulai di y elemen,
        // isi teks (ascent+descent) berada di tengahnya (half-leading). Dengan begitu posisi di PDF
        // sama dengan yang terlihat di editor berbasis browser.
        const m = fonts.metrics(font);
        const lineH = size * el.lineHeight;
        const halfLeading = (lineH - (m.asc + m.desc) * size) / 2;
        const baseline0 = Y(el.y) - halfLeading - m.asc * size;
        lines.forEach((line, i) => {
          if (!line) return;
          const lw = font.widthOfTextAtSize(line, size);
          const x = X(el.x) + (el.align === "center" ? (boxW - lw) / 2 : el.align === "right" ? boxW - lw : 0);
          page.drawText(line, { x, y: baseline0 - i * lineH, size, font, color: hex(el.color) });
        });
        break;
      }
      case "rect":
      case "ellipse": {
        if (!el.fill && !el.stroke) break;
        const style = {
          ...(el.fill ? { color: hex(el.fill) } : {}),
          ...(el.stroke ? { borderColor: hex(el.stroke), borderWidth: el.strokeWidth * s } : {}),
        };
        if (el.type === "rect") {
          page.drawRectangle({ x: X(el.x), y: Y(el.y + el.height), width: el.width * s, height: el.height * s, ...style });
        } else {
          page.drawEllipse({
            x: X(el.x + el.width / 2),
            y: Y(el.y + el.height / 2),
            xScale: (el.width / 2) * s,
            yScale: (el.height / 2) * s,
            ...style,
          });
        }
        break;
      }
      case "line":
        page.drawLine({
          start: { x: X(el.x1), y: Y(el.y1) },
          end: { x: X(el.x2), y: Y(el.y2) },
          thickness: el.strokeWidth * s,
          color: hex(el.stroke),
        });
        break;
      case "image": {
        let img: PDFImage;
        try {
          img = await getImage(el.assetId);
        } catch (e) {
          if (e instanceof AppError) throw e;
          throw new AppError(500, `Gambar pada template tidak dapat dibaca (aset #${el.assetId})`, "ASSET_UNREADABLE");
        }
        const bw = el.width * s;
        const bh = el.height * s;
        const k = Math.min(bw / img.width, bh / img.height); // muat di dalam kotak, proporsi terjaga
        const w = img.width * k;
        const h = img.height * k;
        page.drawImage(img, { x: X(el.x) + (bw - w) / 2, y: Y(el.y + el.height) + (bh - h) / 2, width: w, height: h });
        break;
      }
      case "qr": {
        const png = await QRCode.toBuffer(ctx.verifyUrl, { type: "png", margin: 1, width: 360, errorCorrectionLevel: "M" });
        const img = await pdf.embedPng(png);
        page.drawImage(img, { x: X(el.x), y: Y(el.y + el.size), width: el.size * s, height: el.size * s });
        break;
      }
    }
  }
}
