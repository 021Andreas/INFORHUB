import { desc, eq, max } from "drizzle-orm";
import { db } from "$lib/server/db";
import { isDuplicateError } from "$lib/server/db-errors";
import { AppError, type Actor } from "$lib/server/errors";
import { certificateTemplates } from "$lib/server/db/schema";
import {
  DEFAULT_CERTIFICATE_CONFIG,
  parseStoredConfig,
  type CertificateConfig,
} from "$lib/server/certificates/config";

/** Template untuk sebuah acara: pilihan acara -> template default -> bawaan kode. */
export async function resolveTemplate(
  templateId?: number | null,
): Promise<{ id: number | null; config: CertificateConfig }> {
  if (templateId) {
    const [t] = await db.select().from(certificateTemplates).where(eq(certificateTemplates.id, templateId));
    if (t) return { id: t.id, config: parseStoredConfig(t.config) };
  }
  const [d] = await db.select().from(certificateTemplates).where(eq(certificateTemplates.isDefault, true)).limit(1);
  if (d) return { id: d.id, config: parseStoredConfig(d.config) };
  return { id: null, config: DEFAULT_CERTIFICATE_CONFIG };
}

export async function listTemplates() {
  return db
    .select({
      id: certificateTemplates.id,
      name: certificateTemplates.name,
      version: certificateTemplates.version,
      isDefault: certificateTemplates.isDefault,
      createdAt: certificateTemplates.createdAt,
    })
    .from(certificateTemplates)
    .orderBy(certificateTemplates.name, desc(certificateTemplates.version));
}

export async function getTemplate(id: number) {
  const [t] = await db.select().from(certificateTemplates).where(eq(certificateTemplates.id, id));
  if (!t) throw new AppError(404, "Template tidak ditemukan");
  return { ...t, config: parseStoredConfig(t.config) };
}

/** Versi baru = baris baru (versi lama tidak diubah, sehingga sertifikat lama tetap merujuk template aslinya). */
export async function createTemplateVersion(
  actor: Actor,
  input: { name: string; config: CertificateConfig; makeDefault: boolean },
) {
  try {
    return await db.transaction(async (tx) => {
      const [{ v }] = await tx
        .select({ v: max(certificateTemplates.version) })
        .from(certificateTemplates)
        .where(eq(certificateTemplates.name, input.name))
        .for("update");
      const version = (v ?? 0) + 1;
      const [res] = await tx.insert(certificateTemplates).values({
        name: input.name,
        version,
        config: JSON.stringify(input.config),
        isDefault: false,
        createdBy: actor.id,
      });
      if (input.makeDefault) {
        await tx.update(certificateTemplates).set({ isDefault: false });
        await tx.update(certificateTemplates).set({ isDefault: true }).where(eq(certificateTemplates.id, res.insertId));
      }
      return { id: res.insertId, name: input.name, version, isDefault: input.makeDefault };
    });
  } catch (e) {
    if (isDuplicateError(e)) throw new AppError(409, "Versi template bentrok, coba lagi");
    throw e;
  }
}

export async function setDefaultTemplate(id: number) {
  return db.transaction(async (tx) => {
    const [t] = await tx.select({ id: certificateTemplates.id }).from(certificateTemplates).where(eq(certificateTemplates.id, id));
    if (!t) throw new AppError(404, "Template tidak ditemukan");
    await tx.update(certificateTemplates).set({ isDefault: false });
    await tx.update(certificateTemplates).set({ isDefault: true }).where(eq(certificateTemplates.id, id));
    return { ok: true, defaultTemplateId: id };
  });
}