import type { CertificateConfig } from "./config";
import type { CertificateLayout } from "./layout";
import { renderCertificatePdf } from "./pdf";
import { verifyUrlFor } from "$lib/server/services/event.service";

/** PDF contoh dengan data rekaan, untuk pratinjau template (tidak menyimpan apa pun). Layout menang atas config. */
export function renderPreview(config: CertificateConfig, layout: CertificateLayout | null = null) {
  const code = "0".repeat(32);
  const start = new Date("2026-12-05T09:00:00Z");
  return renderCertificatePdf({
    certificateNumber: "CERT-0-0-CONTOH",
    participantName: "Nama Peserta Contoh",
    eventTitle: "Judul Acara Contoh",
    eventStart: start,
    eventEnd: start,
    location: "Lokasi Acara",
    config,
    layout,
    organizerName: "Penyelenggara Contoh",
    issuedAt: new Date(),
    verificationCode: code,
    verifyUrl: verifyUrlFor(code),
  });
}
