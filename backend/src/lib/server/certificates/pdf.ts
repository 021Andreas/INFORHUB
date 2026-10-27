import { randomUUID } from "node:crypto";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { CertificateData, CertificateStore } from "$lib/server/services/event.service";
import { storage } from "$lib/server/storage";

// Font bawaan PDF hanya mendukung karakter Latin; karakter lain diganti '?'
const safe = (s: string) => s.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "?");

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(d);

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = rgb(0.1, 0.1, 0.1),
) {
  const { width } = page.getSize();
  const maxWidth = width - 140;
  let s = size;
  const t = safe(text);
  while (s > 10 && font.widthOfTextAtSize(t, s) > maxWidth) s -= 1; // kecilkan jika terlalu panjang
  page.drawText(t, { x: (width - font.widthOfTextAtSize(t, s)) / 2, y, size: s, font, color });
}

/** Membuat PDF sertifikat (hanya membuat byte-nya; penyimpanan ada di certificateStore). */
export async function renderCertificatePdf(data: CertificateData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([841.89, 595.28]); // A4 landscape
  const { width, height } = page.getSize();

  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const accent = rgb(0.13, 0.27, 0.55);

  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: accent, borderWidth: 3 });
  page.drawRectangle({ x: 34, y: 34, width: width - 68, height: height - 68, borderColor: accent, borderWidth: 1 });

  drawCentered(page, "SERTIFIKAT", height - 125, serifBold, 46, accent);
  drawCentered(page, "Diberikan kepada", height - 175, serif, 16);
  drawCentered(page, data.participantName, height - 235, serifBold, 38);
  drawCentered(page, "atas partisipasinya dalam acara", height - 285, serif, 16);
  drawCentered(page, data.eventTitle, height - 330, serifBold, 26, accent);

  const sameDay = formatDate(data.eventStart) === formatDate(data.eventEnd);
  const when = sameDay
    ? formatDate(data.eventStart)
    : `${formatDate(data.eventStart)} - ${formatDate(data.eventEnd)}`;
  drawCentered(page, `${when}  |  ${data.location}`, height - 370, serif, 15);

  drawCentered(page, `Nomor: ${data.certificateNumber}`, 70, sans, 11, rgb(0.4, 0.4, 0.4));
  drawCentered(page, "InforHub", 52, sans, 11, rgb(0.4, 0.4, 0.4));

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