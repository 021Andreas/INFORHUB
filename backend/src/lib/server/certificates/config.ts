import { z } from "zod";

/**
 * Pengaturan elemen sertifikat (F-23). Disimpan sebagai JSON di certificate_templates.config.
 * Semua field punya nilai bawaan, jadi template lama tetap terbaca bila field baru ditambahkan.
 */
export const certificateConfigSchema = z.object({
  orientation: z.enum(["landscape", "portrait"]).default("landscape"),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Warna harus berformat #RRGGBB")
    .default("#214a8c"),
  border: z.boolean().default(true),
  title: z.string().trim().min(1).max(60).default("SERTIFIKAT"),
  introText: z.string().trim().max(120).default("Diberikan kepada"),
  bodyText: z.string().trim().max(160).default("atas partisipasinya dalam acara"),
  footerText: z.string().trim().max(160).optional(),
  organizationName: z.string().trim().max(80).default("InforHub"),
  signatory: z
    .object({
      name: z.string().trim().min(1).max(80),
      title: z.string().trim().max(80).optional(),
    })
    .optional(),
  showQr: z.boolean().default(true),
});

export type CertificateConfig = z.infer<typeof certificateConfigSchema>;

/** Template bawaan kode: dipakai bila belum ada template default di database. */
export const DEFAULT_CERTIFICATE_CONFIG: CertificateConfig = certificateConfigSchema.parse({});

/** Membaca JSON dari database dengan aman; rusak -> kembali ke bawaan. */
export function parseStoredConfig(raw: string): CertificateConfig {
  try {
    return certificateConfigSchema.parse(JSON.parse(raw));
  } catch {
    return DEFAULT_CERTIFICATE_CONFIG;
  }
}