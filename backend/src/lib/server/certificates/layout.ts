import { z } from "zod";
import { AppError } from "$lib/server/errors";

/*
 * Desain bebas dari editor visual. Koordinat memakai satuan kanvas editor dengan titik asal di
 * KIRI-ATAS (seperti layar); renderer yang mengubahnya ke koordinat PDF (kiri-bawah) dan menskalakan
 * kanvas ke halaman A4 (rasio kanvas harus mendekati A4).
 */
export const PLACEHOLDERS = [
  "participant_name",
  "event_title",
  "event_date",
  "event_location",
  "certificate_number",
  "issue_date",
  "organizer_name",
] as const;
export type PlaceholderKey = (typeof PLACEHOLDERS)[number];

export const PLACEHOLDER_RE = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Warna harus berformat #RRGGBB");
const coord = z.number().finite().min(-2000).max(8000);
const dim = z.number().finite().min(1).max(8000);
const id = z.string().max(40).optional();

const textEl = z.object({
  type: z.literal("text"),
  id,
  x: coord,
  y: coord,
  width: dim, // lebar kotak teks: dasar perataan dan pembungkusan baris
  text: z.string().max(500),
  fontSize: z.number().finite().min(4).max(200),
  fontFamily: z.enum(["sans", "serif"]).default("sans"),
  bold: z.boolean().default(false),
  italic: z.boolean().default(false),
  color: color.default("#111111"),
  align: z.enum(["left", "center", "right"]).default("left"),
  // wrap = bungkus ke beberapa baris; shrink = satu baris, font dikecilkan agar muat (cocok untuk nama)
  fit: z.enum(["wrap", "shrink"]).default("wrap"),
  lineHeight: z.number().finite().min(0.8).max(3).default(1.25),
});

const rectEl = z.object({
  type: z.literal("rect"),
  id,
  x: coord,
  y: coord,
  width: dim,
  height: dim,
  fill: color.nullable().default(null),
  stroke: color.nullable().default(null),
  strokeWidth: z.number().finite().min(0).max(50).default(1),
});

const ellipseEl = rectEl.extend({ type: z.literal("ellipse") });

const lineEl = z.object({
  type: z.literal("line"),
  id,
  x1: coord,
  y1: coord,
  x2: coord,
  y2: coord,
  stroke: color.default("#000000"),
  strokeWidth: z.number().finite().min(0.1).max(50).default(1),
});

const imageEl = z.object({
  type: z.literal("image"),
  id,
  assetId: z.number().int().positive(), // ID dari POST /api/certificate-assets
  x: coord,
  y: coord,
  width: dim,
  height: dim,
});

// Isi QR SELALU dibuat server (alamat verifikasi publik); editor hanya menentukan posisi dan ukuran.
const qrEl = z.object({ type: z.literal("qr"), id, x: coord, y: coord, size: dim });

export const elementSchema = z.discriminatedUnion("type", [textEl, rectEl, ellipseEl, lineEl, imageEl, qrEl]);

const A4_RATIO = { landscape: 841.89 / 595.28, portrait: 595.28 / 841.89 };

export const layoutSchema = z
  .object({
    version: z.literal(1).default(1),
    canvas: z.object({
      orientation: z.enum(["landscape", "portrait"]),
      width: z.number().finite().min(200).max(4000),
      height: z.number().finite().min(200).max(4000),
      background: color.default("#ffffff"),
    }),
    elements: z.array(elementSchema).max(60, "Maksimal 60 elemen"),
  })
  .superRefine((l, ctx) => {
    const ratio = l.canvas.width / l.canvas.height;
    const want = A4_RATIO[l.canvas.orientation];
    if (Math.abs(ratio / want - 1) > 0.03) {
      ctx.addIssue({
        code: "custom",
        path: ["canvas"],
        message: `Rasio kanvas harus mendekati A4 ${l.canvas.orientation} (lebar/tinggi ≈ ${want.toFixed(3)}), diterima ${ratio.toFixed(3)}`,
      });
    }
    let images = 0;
    let qrs = 0;
    l.elements.forEach((el, i) => {
      if (el.type === "image") images++;
      if (el.type === "qr") qrs++;
      if (el.type === "text") {
        for (const m of el.text.matchAll(PLACEHOLDER_RE)) {
          if (!(PLACEHOLDERS as readonly string[]).includes(m[1])) {
            ctx.addIssue({
              code: "custom",
              path: ["elements", i, "text"],
              message: `Placeholder tidak dikenal: {{${m[1]}}}. Yang tersedia: ${PLACEHOLDERS.join(", ")}`,
            });
          }
        }
      }
    });
    if (images > 12) ctx.addIssue({ code: "custom", path: ["elements"], message: "Maksimal 12 gambar" });
    if (qrs > 2) ctx.addIssue({ code: "custom", path: ["elements"], message: "Maksimal 2 QR" });
  });

export type CertificateLayout = z.infer<typeof layoutSchema>;

export const MAX_LAYOUT_BYTES = 100_000;

/** Bentuk tersimpan (tanpa spasi, urutan kunci tetap) + batas ukuran. Pencarian aset memakai bentuk ini. */
export function serializeLayout(layout: CertificateLayout): string {
  const json = JSON.stringify(layout);
  if (json.length > MAX_LAYOUT_BYTES) throw new AppError(413, "Desain terlalu besar (maksimal 100 KB)", "LAYOUT_TOO_LARGE");
  return json;
}

/** Membaca JSON dari database; null bila rusak/tidak sesuai skema versi sekarang. */
export function parseStoredLayout(raw: string | null): CertificateLayout | null {
  if (!raw) return null;
  try {
    const r = layoutSchema.safeParse(JSON.parse(raw));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export function extractAssetIds(layout: CertificateLayout): number[] {
  return [...new Set(layout.elements.flatMap((e) => (e.type === "image" ? [e.assetId] : [])))];
}

/**
 * Syarat sebelum diajukan/dipakai: harus bisa memverifikasi sertifikat (ada QR) dan dipersonalisasi
 * (memuat nama peserta). Draft boleh belum lengkap.
 */
export function assertSubmittable(layout: CertificateLayout) {
  if (!layout.elements.some((e) => e.type === "qr"))
    throw new AppError(400, "Desain harus memuat elemen QR untuk verifikasi sertifikat", "LAYOUT_INCOMPLETE");
  const hasName = layout.elements.some(
    (e) => e.type === "text" && [...e.text.matchAll(PLACEHOLDER_RE)].some((m) => m[1] === "participant_name"),
  );
  if (!hasName)
    throw new AppError(400, "Desain harus memuat placeholder {{participant_name}}", "LAYOUT_INCOMPLETE");
}
