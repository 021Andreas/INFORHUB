import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "$lib/server/db";
import {
  certificateAssets,
  certificateTemplateAudit,
  events,
  certificateTemplateSubmissions as submissions,
  notifications,
  users,
} from "$lib/server/db/schema";
import { AppError, type Actor } from "$lib/server/errors";
import {
  assertSubmittable,
  extractAssetIds,
  parseStoredLayout,
  serializeLayout,
  type CertificateLayout,
} from "$lib/server/certificates/layout";
import { assertAssetsOwned } from "./asset.service";
import { createLayoutTemplateVersion } from "./template.service";

export type SubmissionStatus = "draft" | "pending" | "approved" | "rejected";
const MAX_OPEN_PER_ORGANIZER = 30; // draft + pending + rejected

const rawLayout = (json: string): unknown => {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
};

/** Milik penyelenggara lain -> 404 (bukan 403) agar keberadaannya tidak bocor. */
function assertOwn(actor: Actor, row: { organizerId: number } | undefined): asserts row is { organizerId: number } {
  if (!row || row.organizerId !== actor.id) throw new AppError(404, "Pengajuan tidak ditemukan");
}

/* ========================= penyelenggara ========================= */

export async function createSubmission(
  actor: Actor,
  input: { name: string; layout: CertificateLayout; submit: boolean; eventId?: number },
) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(submissions)
    .where(and(eq(submissions.organizerId, actor.id), inArray(submissions.status, ["draft", "pending", "rejected"])));
  if (n >= MAX_OPEN_PER_ORGANIZER)
    throw new AppError(409, `Maksimal ${MAX_OPEN_PER_ORGANIZER} pengajuan aktif; hapus draft yang tidak terpakai`, "SUBMISSION_QUOTA");

  if (input.submit && !input.eventId)
    throw new AppError(400, "Pilih acara sebelum mengajukan template sertifikat", "EVENT_REQUIRED");
  if (input.eventId) {
    const [event] = await db.select().from(events).where(eq(events.id, input.eventId));
    if (!event || event.organizerId !== actor.id)
      throw new AppError(404, "Acara tidak ditemukan atau bukan milik Anda", "EVENT_NOT_FOUND");
    if (event.status === "completed")
      throw new AppError(409, "Acara sudah selesai; pengajuan template baru tidak dapat dilakukan", "EVENT_COMPLETED");
  }
  await assertAssetsOwned(actor.id, extractAssetIds(input.layout));
  if (input.submit) assertSubmittable(input.layout);
  const json = serializeLayout(input.layout);

  return db.transaction(async (tx) => {
    const [res] = await tx.insert(submissions).values({
      organizerId: actor.id,
      eventId: input.eventId ?? null,
      name: input.name,
      layoutJson: json,
      status: input.submit ? "pending" : "draft",
      submittedAt: input.submit ? new Date() : null,
    });
    if (input.submit)
      await tx.insert(certificateTemplateAudit).values({ submissionId: res.insertId, actorId: actor.id, action: "submit" });
    return { id: res.insertId, status: input.submit ? ("pending" as const) : ("draft" as const) };
  });
}

/** Hanya draft atau yang ditolak. Mengubah yang ditolak mengembalikannya ke draft (siap diajukan ulang). */
export async function updateSubmission(
  actor: Actor,
  id: number,
  patch: { name?: string; layout?: CertificateLayout },
) {
  if (patch.layout) await assertAssetsOwned(actor.id, extractAssetIds(patch.layout));
  const json = patch.layout ? serializeLayout(patch.layout) : undefined;

  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(submissions).where(eq(submissions.id, id)).for("update");
    assertOwn(actor, row);
    if (row.status === "pending") throw new AppError(409, "Pengajuan sedang ditinjau admin dan tidak bisa diubah", "SUBMISSION_LOCKED");
    if (row.status === "approved")
      throw new AppError(409, "Pengajuan yang sudah disetujui tidak bisa diubah; buat pengajuan baru", "SUBMISSION_LOCKED");

    const set: Partial<typeof submissions.$inferInsert> = { status: "draft" };
    if (patch.name !== undefined) set.name = patch.name;
    if (json !== undefined) set.layoutJson = json;
    await tx.update(submissions).set(set).where(eq(submissions.id, id));
    return { id, status: "draft" as const };
  });
}

export async function submitSubmission(actor: Actor, id: number) {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(submissions).where(eq(submissions.id, id)).for("update");
    assertOwn(actor, row);
    const r = row as typeof submissions.$inferSelect;
    if (r.status === "pending") throw new AppError(409, "Pengajuan sudah dikirim dan sedang ditinjau");
    if (r.status === "approved") throw new AppError(409, "Pengajuan sudah disetujui");
    if (r.status === "rejected")
      throw new AppError(409, "Pengajuan ditolak; ubah desainnya (PUT) dulu sebelum mengajukan ulang", "NEEDS_EDIT");

    const layout = parseStoredLayout(r.layoutJson);
    if (!layout) throw new AppError(409, "Desain tidak sesuai skema terbaru; simpan ulang desain", "LAYOUT_INVALID");
    assertSubmittable(layout);
    await assertAssetsOwned(actor.id, extractAssetIds(layout));

    await tx
      .update(submissions)
      .set({ status: "pending", submittedAt: new Date(), reviewedBy: null, reviewedAt: null, reviewNote: null })
      .where(eq(submissions.id, id));
    await tx.insert(certificateTemplateAudit).values({ submissionId: id, actorId: actor.id, action: "submit" });
    return { id, status: "pending" as const };
  });
}

export async function listOwnSubmissions(actor: Actor, status?: SubmissionStatus) {
  return db
    .select({
      id: submissions.id,
      name: submissions.name,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
      reviewedAt: submissions.reviewedAt,
      reviewNote: submissions.reviewNote,
      approvedTemplateId: submissions.approvedTemplateId,
      eventId: submissions.eventId,
      createdAt: submissions.createdAt,
      updatedAt: submissions.updatedAt,
    })
    .from(submissions)
    .where(and(eq(submissions.organizerId, actor.id), status ? eq(submissions.status, status) : undefined))
    .orderBy(desc(submissions.updatedAt), desc(submissions.id));
}

export async function getOwnSubmission(actor: Actor, id: number) {
  const [row] = await db.select().from(submissions).where(eq(submissions.id, id));
  assertOwn(actor, row);
  const { layoutJson, organizerId: _o, ...rest } = row as typeof submissions.$inferSelect;
  return { ...rest, layout: rawLayout(layoutJson) };
}

export async function deleteOwnSubmission(actor: Actor, id: number) {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(submissions).where(eq(submissions.id, id)).for("update");
    assertOwn(actor, row);
    const status = (row as typeof submissions.$inferSelect).status;
    if (status === "pending" || status === "approved")
      throw new AppError(409, "Pengajuan yang sedang ditinjau atau sudah disetujui tidak bisa dihapus");
    await tx.delete(certificateTemplateAudit).where(eq(certificateTemplateAudit.submissionId, id));
    await tx.delete(submissions).where(eq(submissions.id, id));
    return { ok: true };
  });
}

/** Desain tersimpan milik penyelenggara (untuk pratinjau PDF). */
export async function getOwnLayout(actor: Actor, id: number) {
  const [row] = await db.select().from(submissions).where(eq(submissions.id, id));
  assertOwn(actor, row);
  const layout = parseStoredLayout((row as typeof submissions.$inferSelect).layoutJson);
  if (!layout) throw new AppError(409, "Desain tidak sesuai skema terbaru; simpan ulang desain", "LAYOUT_INVALID");
  return layout;
}

/* ============================== admin ============================== */

export async function listAdminSubmissions(status: SubmissionStatus | "all", opts: { limit: number; offset: number }) {
  const where = status === "all" ? undefined : eq(submissions.status, status);
  const items = await db
    .select({
      id: submissions.id,
      name: submissions.name,
      status: submissions.status,
      organizerId: users.id,
      organizerName: users.name,
      organizerEmail: users.email,
      organizationName: users.organizationName,
      submittedAt: submissions.submittedAt,
      reviewedAt: submissions.reviewedAt,
      reviewNote: submissions.reviewNote,
      approvedTemplateId: submissions.approvedTemplateId,
      eventId: submissions.eventId,
      updatedAt: submissions.updatedAt,
    })
    .from(submissions)
    .innerJoin(users, eq(users.id, submissions.organizerId))
    .where(where)
    // antrean: yang paling lama menunggu dulu; selain itu terbaru dulu
    .orderBy(status === "pending" ? asc(submissions.submittedAt) : desc(submissions.updatedAt), desc(submissions.id))
    .limit(opts.limit)
    .offset(opts.offset);
  const [{ total }] = await db.select({ total: count() }).from(submissions).where(where);
  return { items, total };
}

export async function getAdminSubmission(id: number) {
  const [row] = await db
    .select({
      s: submissions,
      organizerName: users.name,
      organizerEmail: users.email,
      organizationName: users.organizationName,
      eventTitle: events.title,
    })
    .from(submissions)
    .innerJoin(users, eq(users.id, submissions.organizerId))
    .leftJoin(events, eq(events.id, submissions.eventId))
    .where(eq(submissions.id, id));
  if (!row) throw new AppError(404, "Pengajuan tidak ditemukan");

  const audit = await db
    .select({
      id: certificateTemplateAudit.id,
      action: certificateTemplateAudit.action,
      actorId: certificateTemplateAudit.actorId,
      actorName: users.name,
      note: certificateTemplateAudit.note,
      createdAt: certificateTemplateAudit.createdAt,
    })
    .from(certificateTemplateAudit)
    .innerJoin(users, eq(users.id, certificateTemplateAudit.actorId))
    .where(eq(certificateTemplateAudit.submissionId, id))
    .orderBy(asc(certificateTemplateAudit.id));

  const { layoutJson, ...rest } = row.s;
  return {
    ...rest,
    organizerName: row.organizerName,
    organizerEmail: row.organizerEmail,
    organizationName: row.organizationName,
    eventTitle: row.eventTitle,
    layout: rawLayout(layoutJson),
    audit,
  };
}

export async function getAdminLayout(id: number) {
  const [row] = await db.select().from(submissions).where(eq(submissions.id, id));
  if (!row) throw new AppError(404, "Pengajuan tidak ditemukan");
  const layout = parseStoredLayout(row.layoutJson);
  if (!layout) throw new AppError(409, "Desain tidak sesuai skema terbaru", "LAYOUT_INVALID");
  return layout;
}

/** Menyetujui = membuat versi baru di certificate_templates (milik penyelenggara). Satu transaksi. */
export async function approveSubmission(actor: Actor, id: number, note?: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(submissions).where(eq(submissions.id, id)).for("update");
    if (!row) throw new AppError(404, "Pengajuan tidak ditemukan");
    if (row.status !== "pending") throw new AppError(409, "Hanya pengajuan berstatus pending yang bisa diputuskan", "NOT_PENDING");

    // validasi ulang saat disetujui: skema bisa berubah, aset bisa terhapus sejak diajukan
    const layout = parseStoredLayout(row.layoutJson);
    if (!layout) throw new AppError(409, "Desain tidak lagi sesuai skema; minta penyelenggara memperbaruinya", "LAYOUT_INVALID");
    assertSubmittable(layout);
    const ids = extractAssetIds(layout);
    if (ids.length) {
      const rows = await tx
        .select({ id: certificateAssets.id, ownerId: certificateAssets.ownerId })
        .from(certificateAssets)
        .where(inArray(certificateAssets.id, ids));
      if (rows.length !== ids.length || rows.some((r) => r.ownerId !== row.organizerId))
        throw new AppError(409, "Ada gambar pada desain yang sudah tidak tersedia", "ASSET_MISSING");
    }

    const tpl = await createLayoutTemplateVersion(tx, {
      name: row.name,
      layout,
      ownerId: row.organizerId,
      createdBy: actor.id,
    });
    // Jika pengajuan dibuat untuk acara tertentu, hubungkan template yang disetujui
    // dan aktifkan penerbitan dalam transaksi yang sama.
    if (row.eventId) {
      const [event] = await tx.select().from(events).where(eq(events.id, row.eventId)).for("update");
      if (!event || event.organizerId !== row.organizerId)
        throw new AppError(409, "Acara tujuan pengajuan tidak ditemukan atau kepemilikannya berubah", "EVENT_NOT_FOUND");
      if (event.certificateTemplateId && event.certificateTemplateId !== tpl.id)
        throw new AppError(409, "Acara sudah memiliki template sertifikat. Lepaskan template lama terlebih dahulu.", "EVENT_TEMPLATE_EXISTS");
      await tx.update(events).set({ certificateTemplateId: tpl.id, certificateAvailable: true }).where(eq(events.id, row.eventId));
    }

    const cleanNote = note?.trim() || null;
    await tx
      .update(submissions)
      .set({ status: "approved", reviewedBy: actor.id, reviewedAt: new Date(), reviewNote: cleanNote, approvedTemplateId: tpl.id })
      .where(eq(submissions.id, id));
    await tx.insert(certificateTemplateAudit).values({ submissionId: id, actorId: actor.id, action: "approve", note: cleanNote });
    await tx.insert(notifications).values({
      userId: row.organizerId,
      type: "template_approved",
      eventId: row.eventId ?? null,
      message: `Template "${row.name}" disetujui (versi ${tpl.version})${row.eventId ? " dan otomatis diaktifkan untuk acara terkait" : " dan siap dipilih untuk acara Anda"}.`.slice(0, 500),
    });
    return { ok: true, status: "approved" as const, templateId: tpl.id, version: tpl.version };
  });
}


/** Hubungkan pengajuan yang sudah disetujui ke acara. Berguna untuk pengajuan lama
 * yang dibuat sebelum event_id disimpan. Satu acara hanya boleh memakai satu template. */
export async function activateApprovedSubmission(actor: Actor, submissionId: number, eventId: number) {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(submissions).where(eq(submissions.id, submissionId)).for("update");
    assertOwn(actor, row);
    if (row.status !== "approved" || !row.approvedTemplateId)
      throw new AppError(409, "Template belum disetujui admin", "TEMPLATE_NOT_APPROVED");

    const [event] = await tx.select().from(events).where(eq(events.id, eventId)).for("update");
    if (!event || event.organizerId !== actor.id)
      throw new AppError(404, "Acara tidak ditemukan atau bukan milik Anda", "EVENT_NOT_FOUND");
    if (event.status === "completed")
      throw new AppError(409, "Acara sudah selesai dan pengaturan sertifikat terkunci", "EVENT_COMPLETED");
    if (event.certificateTemplateId && event.certificateTemplateId !== row.approvedTemplateId)
      throw new AppError(409, "Acara sudah menggunakan template sertifikat lain", "EVENT_TEMPLATE_EXISTS");

    await tx.update(events).set({
      certificateTemplateId: row.approvedTemplateId,
      certificateAvailable: true,
    }).where(eq(events.id, eventId));
    await tx.update(submissions).set({ eventId }).where(eq(submissions.id, submissionId));
    return { ok: true, eventId, templateId: row.approvedTemplateId, certificateAvailable: true };
  });
}

export async function rejectSubmission(actor: Actor, id: number, note: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(submissions).where(eq(submissions.id, id)).for("update");
    if (!row) throw new AppError(404, "Pengajuan tidak ditemukan");
    if (row.status !== "pending") throw new AppError(409, "Hanya pengajuan berstatus pending yang bisa diputuskan", "NOT_PENDING");

    await tx
      .update(submissions)
      .set({ status: "rejected", reviewedBy: actor.id, reviewedAt: new Date(), reviewNote: note })
      .where(eq(submissions.id, id));
    await tx.insert(certificateTemplateAudit).values({ submissionId: id, actorId: actor.id, action: "reject", note });
    await tx.insert(notifications).values({
      userId: row.organizerId,
      type: "template_rejected",
      message: `Template "${row.name}" ditolak: ${note}`.slice(0, 500),
    });
    return { ok: true, status: "rejected" as const };
  });
}
