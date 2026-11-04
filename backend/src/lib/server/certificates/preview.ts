import type { CertificateConfig } from "./config";
import { renderCertificatePdf } from "./pdf";
import { verifyUrlFor } from "$lib/server/services/event.service";

/** PDF contoh dengan data rekaan, untuk pratinjau template (tidak menyimpan apa pun). */
export function renderPreview(config: CertificateConfig) {
  const code = "0".repeat(32);
  return renderCertificatePdf({
    certificateNumber: "CERT-0-0-CONTOH",
    participantName: "Nama Peserta Contoh",
    eventTitle: "Judul Acara Contoh",
    eventStart: new Date(),
    eventEnd: new Date(),
    location: "Lokasi Acara",
    config,
    verificationCode: code,
    verifyUrl: verifyUrlFor(code),
  });
}
