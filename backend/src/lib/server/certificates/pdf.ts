import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { db } from "$lib/server/db";
import { certificateAssets } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { AppError } from "$lib/server/errors";
import type { CertificateData, CertificateStore } from "$lib/server/services/event.service";
import { storage } from "$lib/server/storage";
import { FontSet } from "./fonts";
import { drawLayout, type RenderContext } from "./layout-render";
import type { PlaceholderKey } from "./layout";

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(d);

const hex = (c: string) => {
  const n = parseInt(c.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  fonts: FontSet,
  color = rgb(0.1, 0.1, 0.1),
  centerX?: number,
  maxWidth?: number,
) {
  const { width } = page.getSize();
  const cx = centerX ?? width / 2;
  const limit = maxWidth ?? width - 140;
  let s = size;
  const t = fonts.clean(font, text).replace(/\n/g, " ");
  while (s > 8 && font.widthOfTextAtSize(t, s) > limit) s -= 1; // kecilkan jika terlalu panjang
  page.drawText(t, { x: cx - font.widthOfTextAtSize(t, s) / 2, y, size: s, font, color });
}

/** Aset gambar (logo, tanda tangan) dibaca dari database + storage. Kepemilikan sudah diperiksa saat desain disimpan/disetujui. */
async function loadAsset(assetId: number) {
  const [a] = await db.select().from(certificateAssets).where(eq(certificateAssets.id, assetId));
  if (!a) throw new AppError(500, `Aset gambar #${assetId} pada template sudah tidak ada`, "ASSET_MISSING");
  const { bytes } = await storage.get("asset", a.storageRef);
  return { bytes, mime: a.mime };
}

function placeholderValues(data: CertificateData): Record<PlaceholderKey, string> {
  const sameDay = formatDate(data.eventStart) === formatDate(data.eventEnd);
  return {
    participant_name: data.participantName,
    event_title: data.eventTitle,
    event_date: sameDay ? formatDate(data.eventStart) : `${formatDate(data.eventStart)} - ${formatDate(data.eventEnd)}`,
    event_location: data.location,
    certificate_number: data.certificateNumber,
    issue_date: formatDate(data.issuedAt),
    organizer_name: data.organizerName,
  };
}

/** Membuat PDF sertifikat dari data + template (hanya byte-nya; penyimpanan ada di certificateStore). */
export async function renderCertificatePdf(data: CertificateData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fonts = new FontSet(pdf);

  // Desain bebas dari editor visual
  if (data.layout) {
    const ctx: RenderContext = { values: placeholderValues(data), verifyUrl: data.verifyUrl, loadAsset };
    await drawLayout(pdf, data.layout, ctx, fonts);
    return pdf.save();
  }

  // Template tetap (CertificateConfig)
  const cfg = data.config;
  const landscape = cfg.orientation === "landscape";
  const page = pdf.addPage(landscape ? [841.89, 595.28] : [595.28, 841.89]);
  const { width, height } = page.getSize();

  const serifBold = await fonts.get("serif", true);
  const serif = await fonts.get("serif");
  const sans = await fonts.get("sans");
  const accent = hex(cfg.accentColor);
  const grey = rgb(0.4, 0.4, 0.4);

  if (cfg.border) {
    page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: accent, borderWidth: 3 });
    page.drawRectangle({ x: 34, y: 34, width: width - 68, height: height - 68, borderColor: accent, borderWidth: 1 });
  }

  // posisi vertikal dihitung dari tinggi halaman supaya lanskap & potret sama-sama rapi
  const top = (f: number) => height * f;
  drawCentered(page, cfg.title, top(0.79), serifBold, landscape ? 46 : 40, fonts, accent);
  drawCentered(page, cfg.introText, top(0.715), serif, 16, fonts);
  drawCentered(page, data.participantName, top(0.635), serifBold, landscape ? 38 : 34, fonts);
  drawCentered(page, cfg.bodyText, top(0.57), serif, 16, fonts);
  drawCentered(page, data.eventTitle, top(0.5), serifBold, landscape ? 26 : 24, fonts, accent);

  const when = placeholderValues(data).event_date;
  drawCentered(page, `${when}  |  ${data.location}`, top(0.45), serif, 15, fonts);

  if (cfg.footerText) drawCentered(page, cfg.footerText, top(0.37), serif, 13, fonts, grey);

  // ---- QR verifikasi (kiri bawah) ----
  const qrSize = 92;
  if (cfg.showQr) {
    const png = await QRCode.toBuffer(data.verifyUrl, { type: "png", margin: 1, width: 360, errorCorrectionLevel: "M" });
    const img = await pdf.embedPng(png);
    page.drawImage(img, { x: 56, y: 62, width: qrSize, height: qrSize });
    page.drawText("Pindai untuk verifikasi", { x: 56, y: 50, size: 8, font: sans, color: grey });
  }

  // ---- penanda tangan (kanan bawah) ----
  if (cfg.signatory) {
    const cx = width - 56 - 100;
    page.drawLine({ start: { x: cx - 100, y: 100 }, end: { x: cx + 100, y: 100 }, thickness: 0.8, color: grey });
    drawCentered(page, cfg.signatory.name, 84, serifBold, 13, fonts, rgb(0.1, 0.1, 0.1), cx, 200);
    if (cfg.signatory.title) drawCentered(page, cfg.signatory.title, 69, serif, 11, fonts, grey, cx, 200);
  }

  // ---- nomor dan penerbit (tengah bawah) ----
  drawCentered(page, `Nomor: ${data.certificateNumber}`, 70, sans, 10, fonts, grey, width / 2, width - 360);
  drawCentered(page, cfg.organizationName, 54, sans, 10, fonts, grey, width / 2, width - 360);

  return pdf.save();
}

/**
 * Penyimpanan sertifikat: lokal atau Google Drive sesuai STORAGE_DRIVER.
 * Nama file diberi akhiran acak: bila dua permintaan serentak menerbitkan sertifikat yang sama,
 * pembersihan file milik yang kalah tidak boleh menghapus file milik yang menang.
 */
export const certificateStore: CertificateStore = {
  save: async (data) =>
    storage.put(
      "certificate",
      `${data.certificateNumber}-${randomUUID().slice(0, 8)}.pdf`,
      await renderCertificatePdf(data),
      "application/pdf",
    ),
  remove: (ref) => storage.remove("certificate", ref),
};
