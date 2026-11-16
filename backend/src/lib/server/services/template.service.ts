import { desc, eq, isNull, max, or } from "drizzle-orm";
import { db } from "$lib/server/db";
import { isDuplicateError } from "$lib/server/db-errors";
import { AppError, type Actor } from "$lib/server/errors";
import { certificateTemplates, users } from "$lib/server/db/schema";
import {
  DEFAULT_CERTIFICATE_CONFIG,
  parseStoredConfig,
  type CertificateConfig,
} from "$lib/server/certificates/config";
import { parseStoredLayout, serializeLayout, type CertificateLayout } from "$lib/server/certificates/layout";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Template untuk sebuah acara: pilihan acara -> template default -> bawaan kode. */
export async function resolveTemplate(
  templateId?: number | null,
): Promise<{ id: number | null; config: CertificateConfig; layout: CertificateLayout | null }> {
  // Hanya baris di certificate_templates yang bisa terpilih; pengajuan (certificate_template_submissions)
  // yang belum disetujui tidak pernah ada di tabel ini.
  if (templateId) {
    const [t] = await db.select().from(certificateTemplates).where(eq(certificateTemplates.id, templateId));
    if (t) return { id: t.id, config: parseStoredConfig(t.config), layout: parseStoredLayout(t.layout) };
  }
  const [d] = await db.select().from(certificateTemplates).where(eq(certificateTemplates.isDefault, true)).limit(1);
  if (d) return { id: d.id, config: parseStoredConfig(d.config), layout: parseStoredLayout(d.layout) };
  return { id: null, config: DEFAULT_CERTIFICATE_CONFIG, layout: null };
}

/**
 * Admin melihat semua. Penyelenggara melihat template umum + miliknya sendiri
 * (template hasil pengajuan orang lain tidak terlihat).
 */
export async function listTemplates(viewer: Actor) {
  const visible =
    viewer.role === "admin" ? undefined : or(isNull(certificateTemplates.ownerId), eq(certificateTemplates.ownerId, viewer.id));
  const rows = await db
    .select({
      id: certificateTemplates.id,
      name: certificateTemplates.name,
      version: certificateTemplates.version,
      isDefault: certificateTemplates.isDefault,
      ownerId: certificateTemplates.ownerId,
      ownerName: users.name,
      hasLayout: certificateTemplates.layout,
      createdAt: certificateTemplates.createdAt,
    })
    .from(certificateTemplates)
    .leftJoin(users, eq(users.id, certificateTemplates.ownerId))
    .where(visible)
    .orderBy(certificateTemplates.name, desc(certificateTemplates.version));
  return rows.map(({ hasLayout, ...r }) => ({ ...r, kind: hasLayout ? ("layout" as const) : ("fixed" as const) }));
}

export async function getTemplate(id: number) {
  const [t] = await db.select().from(certificateTemplates).where(eq(certificateTemplates.id, id));
  if (!t) throw new AppError(404, "Template tidak ditemukan");
  const layout = parseStoredLayout(t.layout);
  return {
    id: t.id,
    name: t.name,
    version: t.version,
    isDefault: t.isDefault,
    ownerId: t.ownerId,
    createdBy: t.createdBy,
    createdAt: t.createdAt,
    kind: layout ? ("layout" as const) : ("fixed" as const),
    config: parseStoredConfig(t.config),
    layout,
  };
}

async function nextVersion(tx: Tx, name: string) {
  const [{ v }] = await tx
    .select({ v: max(certificateTemplates.version) })
    .from(certificateTemplates)
    .where(eq(certificateTemplates.name, name))
    .for("update");
  return (v ?? 0) + 1;
}

/** Versi baru template TETAP (config) buatan admin = baris baru; versi lama tidak diubah. */
export async function createTemplateVersion(
  actor: Actor,
  input: { name: string; config: CertificateConfig; makeDefault: boolean },
) {
  try {
    return await db.transaction(async (tx) => {
      const version = await nextVersion(tx, input.name);
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

/**
 * Versi baru template DESAIN BEBAS. Dipakai admin (ownerId null = umum) dan proses persetujuan
 * pengajuan (ownerId = penyelenggara). `tx` dari pemanggil agar ikut transaksinya.
 */
export async function createLayoutTemplateVersion(
  tx: Tx,
  input: { name: string; layout: CertificateLayout; ownerId: number | null; createdBy: number; makeDefault?: boolean },
) {
  const version = await nextVersion(tx, input.name);
  const [res] = await tx.insert(certificateTemplates).values({
    name: input.name,
    version,
    config: JSON.stringify(DEFAULT_CERTIFICATE_CONFIG), // tidak dipakai bila layout ada
    layout: serializeLayout(input.layout),
    ownerId: input.ownerId,
    isDefault: false,
    createdBy: input.createdBy,
  });
  if (input.makeDefault && input.ownerId === null) {
    await tx.update(certificateTemplates).set({ isDefault: false });
    await tx.update(certificateTemplates).set({ isDefault: true }).where(eq(certificateTemplates.id, res.insertId));
  }
  return { id: res.insertId, name: input.name, version, isDefault: !!input.makeDefault && input.ownerId === null };
}

export async function setDefaultTemplate(id: number) {
  return db.transaction(async (tx) => {
    const [t] = await tx
      .select({ id: certificateTemplates.id, ownerId: certificateTemplates.ownerId })
      .from(certificateTemplates)
      .where(eq(certificateTemplates.id, id));
    if (!t) throw new AppError(404, "Template tidak ditemukan");
    if (t.ownerId !== null)
      throw new AppError(400, "Template milik penyelenggara tidak bisa dijadikan default untuk semua acara", "TEMPLATE_OWNED");
    await tx.update(certificateTemplates).set({ isDefault: false });
    await tx.update(certificateTemplates).set({ isDefault: true }).where(eq(certificateTemplates.id, id));
    return { ok: true, defaultTemplateId: id };
  });
}

/** Penyelenggara hanya boleh memilih template umum atau miliknya sendiri (admin: semua). */
export async function assertTemplateUsable(actor: Actor, templateId: number) {
  const [t] = await db
    .select({ id: certificateTemplates.id, ownerId: certificateTemplates.ownerId })
    .from(certificateTemplates)
    .where(eq(certificateTemplates.id, templateId));
  if (!t) throw new AppError(400, "Template sertifikat tidak ditemukan");
  if (t.ownerId !== null && actor.role !== "admin" && t.ownerId !== actor.id)
    throw new AppError(403, "Template ini tidak tersedia untuk Anda", "TEMPLATE_NOT_ALLOWED");
}

