// Query baca (GET): detail acara, riwayat, peserta, rekap, notifikasi, admin.
import { and, asc, count, desc, eq, like, or } from "drizzle-orm";
import { db } from "$lib/server/db";
import {
  attendance,
  certificates,
  eventCategories,
  events,
  notifications,
  registrations,
  users,
} from "$lib/server/db/schema";
import { AppError, type Actor } from "./event.service";
import { presentCount, registeredCount } from "./sql-helpers";

type EventStatus = (typeof events.$inferSelect)["status"];
type Role = (typeof users.$inferSelect)["role"];
type UserStatus = (typeof users.$inferSelect)["status"];

/* ---------------- kategori ---------------- */
export const listCategories = () =>
  db.select().from(eventCategories).orderBy(eventCategories.name);

/* ---------------- detail acara ---------------- */
// Acara draft/pending/rejected hanya terlihat oleh pemilik dan admin.
export async function getEventDetail(viewer: Actor | null, eventId: number) {
  const [row] = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      posterUrl: events.posterUrl,
      categoryId: events.categoryId,
      category: eventCategories.name,
      organizerId: events.organizerId,
      organizer: users.name,
      startAt: events.startAt,
      endAt: events.endAt,
      deadline: events.registrationDeadline,
      location: events.location,
      quota: events.quota,
      certificateAvailable: events.certificateAvailable,
      status: events.status,
      rejectionReason: events.rejectionReason,
      publishedAt: events.publishedAt,
      registered: registeredCount(),
    })
    .from(events)
    .leftJoin(eventCategories, eq(eventCategories.id, events.categoryId))
    .innerJoin(users, eq(users.id, events.organizerId))
    .where(eq(events.id, eventId));

  const isStaff = !!viewer && (viewer.role === "admin" || viewer.id === row?.organizerId);
  const publicStatus = row?.status === "published" || row?.status === "completed";
  if (!row || (!isStaff && !publicStatus)) throw new AppError(404, "Acara tidak ditemukan");

  let myRegistration: { status: "registered" | "cancelled"; ticketCode: string | null } | null = null;
  if (viewer) {
    const [reg] = await db
      .select({ status: registrations.status, ticketCode: registrations.ticketCode })
      .from(registrations)
      .where(and(eq(registrations.eventId, eventId), eq(registrations.userId, viewer.id)));
    if (reg) {
      myRegistration = {
        status: reg.status,
        ticketCode: reg.status === "registered" ? reg.ticketCode : null,
      };
    }
  }

  const remaining = Math.max(row.quota - row.registered, 0);
  const now = new Date();
  return {
    ...row,
    rejectionReason: isStaff ? row.rejectionReason : null,
    remaining,
    // true jika saat ini orang bisa mendaftar (published, belum lewat batas, masih ada kuota)
    registrationOpen:
      row.status === "published" &&
      row.endAt > now &&
      (!row.deadline || row.deadline >= now) &&
      remaining > 0,
    myRegistration,
  };
}

/* ---------------- riwayat pendaftaran milik user ---------------- */
export async function listMyRegistrations(userId: number) {
  const rows = await db
    .select({
      id: registrations.id,
      eventId: events.id,
      title: events.title,
      posterUrl: events.posterUrl,
      startAt: events.startAt,
      endAt: events.endAt,
      location: events.location,
      eventStatus: events.status,
      registrationStatus: registrations.status,
      ticketCode: registrations.ticketCode,
      registeredAt: registrations.registeredAt,
      cancelledAt: registrations.cancelledAt,
      certificateAvailable: events.certificateAvailable,
      attendanceStatus: attendance.status,
      checkedAt: attendance.checkedAt,
      certificateId: certificates.id,
      certificateNumber: certificates.certificateNumber,
    })
    .from(registrations)
    .innerJoin(events, eq(events.id, registrations.eventId))
    .leftJoin(attendance, eq(attendance.registrationId, registrations.id))
    .leftJoin(certificates, eq(certificates.registrationId, registrations.id))
    .where(eq(registrations.userId, userId))
    .orderBy(desc(registrations.registeredAt), desc(registrations.id));

  return rows.map((r) => ({
    ...r,
    ticketCode: r.registrationStatus === "registered" ? r.ticketCode : null,
    attendanceStatus: r.attendanceStatus ?? "absent",
  }));
}

/* ---------------- sertifikat milik user ---------------- */
export async function listMyCertificates(userId: number) {
  return db
    .select({
      id: certificates.id,
      certificateNumber: certificates.certificateNumber,
      issuedAt: certificates.issuedAt,
      eventId: events.id,
      eventTitle: events.title,
      eventStartAt: events.startAt,
    })
    .from(certificates)
    .innerJoin(registrations, eq(registrations.id, certificates.registrationId))
    .innerJoin(events, eq(events.id, registrations.eventId))
    .where(eq(registrations.userId, userId))
    .orderBy(desc(certificates.issuedAt), desc(certificates.id));
}

/* ---------------- peserta & rekap kehadiran (penyelenggara/admin) ---------------- */
async function assertEventStaff(actor: Actor, eventId: number) {
  const [event] = await db
    .select({ id: events.id, title: events.title, quota: events.quota, organizerId: events.organizerId })
    .from(events)
    .where(eq(events.id, eventId));
  if (!event) throw new AppError(404, "Acara tidak ditemukan");
  if (actor.role !== "admin" && event.organizerId !== actor.id)
    throw new AppError(403, "Anda bukan penyelenggara acara ini");
  return event;
}

export async function listParticipants(
  actor: Actor,
  eventId: number,
  status: "registered" | "cancelled" | "all",
) {
  const event = await assertEventStaff(actor, eventId);
  const rows = await db
    .select({
      registrationId: registrations.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      status: registrations.status,
      registeredAt: registrations.registeredAt,
      cancelledAt: registrations.cancelledAt,
      attendanceStatus: attendance.status,
      checkedAt: attendance.checkedAt,
      certificateId: certificates.id,
    })
    .from(registrations)
    .innerJoin(users, eq(users.id, registrations.userId))
    .leftJoin(attendance, eq(attendance.registrationId, registrations.id))
    .leftJoin(certificates, eq(certificates.registrationId, registrations.id))
    .where(
      and(eq(registrations.eventId, eventId), status === "all" ? undefined : eq(registrations.status, status)),
    )
    .orderBy(registrations.registeredAt);

  return {
    event: { id: event.id, title: event.title, quota: event.quota },
    total: rows.length,
    participants: rows.map((r) => ({ ...r, attendanceStatus: r.attendanceStatus ?? "absent" })),
  };
}

export async function getAttendanceRecap(actor: Actor, eventId: number) {
  const event = await assertEventStaff(actor, eventId);
  const rows = await db
    .select({
      registrationId: registrations.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      attendanceStatus: attendance.status,
      method: attendance.method,
      checkedAt: attendance.checkedAt,
    })
    .from(registrations)
    .innerJoin(users, eq(users.id, registrations.userId))
    .leftJoin(attendance, eq(attendance.registrationId, registrations.id))
    .where(and(eq(registrations.eventId, eventId), eq(registrations.status, "registered")))
    .orderBy(users.name);

  const participants = rows.map((r) => ({ ...r, attendanceStatus: r.attendanceStatus ?? "absent" }));
  const present = participants.filter((p) => p.attendanceStatus === "present").length;
  const totalRegistered = participants.length;
  return {
    event: { id: event.id, title: event.title },
    summary: {
      totalRegistered,
      present,
      absent: totalRegistered - present,
      attendanceRate: totalRegistered ? Math.round((present / totalRegistered) * 1000) / 10 : 0,
    },
    participants,
  };
}

/* ---------------- notifikasi ---------------- */
export async function listNotifications(
  userId: number,
  opts: { unreadOnly: boolean; limit: number; offset: number },
) {
  const where = and(eq(notifications.userId, userId), opts.unreadOnly ? eq(notifications.isRead, false) : undefined);
  const items = await db
    .select()
    .from(notifications)
    .where(where)
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(opts.limit)
    .offset(opts.offset);
  const [{ total }] = await db.select({ total: count() }).from(notifications).where(where);
  const [{ unread }] = await db
    .select({ unread: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return { items, total, unreadCount: unread, limit: opts.limit, offset: opts.offset };
}

export async function markNotificationRead(userId: number, id: number) {
  const [n] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  if (!n) throw new AppError(404, "Notifikasi tidak ditemukan");
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number) {
  const [res] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return { updated: res.affectedRows };
}

/* ---------------- admin / penyelenggara ---------------- */
// Admin melihat semua; penyelenggara hanya miliknya sendiri.
const ownerScope = (actor: Actor) =>
  actor.role === "admin" ? undefined : eq(events.organizerId, actor.id);

export async function listAdminEvents(
  actor: Actor,
  status: EventStatus | "all",
  opts: { limit: number; offset: number },
) {
  const where = and(status === "all" ? undefined : eq(events.status, status), ownerScope(actor));
  const items = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      posterUrl: events.posterUrl,
      categoryId: events.categoryId,
      category: eventCategories.name,
      organizerId: events.organizerId,
      organizer: users.name,
      startAt: events.startAt,
      endAt: events.endAt,
      deadline: events.registrationDeadline,
      location: events.location,
      quota: events.quota,
      certificateAvailable: events.certificateAvailable,
      status: events.status,
      rejectionReason: events.rejectionReason,
      createdAt: events.createdAt,
      registered: registeredCount(),
      present: presentCount(),
    })
    .from(events)
    .leftJoin(eventCategories, eq(eventCategories.id, events.categoryId))
    .innerJoin(users, eq(users.id, events.organizerId))
    .where(where)
    // antrean persetujuan: terlama dulu; selain itu terbaru dulu
    .orderBy(status === "pending" ? asc(events.createdAt) : desc(events.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
  const [{ total }] = await db.select({ total: count() }).from(events).where(where);
  return { items, total };
}

export async function listAdminParticipants(
  actor: Actor,
  opts: { eventId?: number; status: "registered" | "cancelled" | "all"; limit: number; offset: number },
) {
  const where = and(
    ownerScope(actor),
    opts.eventId ? eq(registrations.eventId, opts.eventId) : undefined,
    opts.status === "all" ? undefined : eq(registrations.status, opts.status),
  );
  const items = await db
    .select({
      id: registrations.id,
      name: users.name,
      email: users.email,
      eventId: events.id,
      eventTitle: events.title,
      registrationCode: registrations.ticketCode,
      status: registrations.status,
      registeredAt: registrations.registeredAt,
    })
    .from(registrations)
    .innerJoin(users, eq(users.id, registrations.userId))
    .innerJoin(events, eq(events.id, registrations.eventId))
    .where(where)
    .orderBy(desc(registrations.registeredAt), desc(registrations.id))
    .limit(opts.limit)
    .offset(opts.offset);
  const [{ total }] = await db
    .select({ total: count() })
    .from(registrations)
    .innerJoin(events, eq(events.id, registrations.eventId))
    .where(where);
  return { items, total };
}

// Baris = peserta yang HADIR pada acara bersertifikat; sudah terbit atau belum.
export async function listAdminCertificates(
  actor: Actor,
  opts: { eventId?: number; limit: number; offset: number },
) {
  const where = and(
    ownerScope(actor),
    eq(events.certificateAvailable, true),
    eq(registrations.status, "registered"),
    eq(attendance.status, "present"),
    opts.eventId ? eq(events.id, opts.eventId) : undefined,
  );
  const items = await db
    .select({
      id: registrations.id,
      participant: users.name,
      email: users.email,
      event: events.title,
      eventId: events.id,
      eventStatus: events.status,
      certificateId: certificates.id,
      certificateNumber: certificates.certificateNumber,
      issuedAt: certificates.issuedAt,
    })
    .from(registrations)
    .innerJoin(users, eq(users.id, registrations.userId))
    .innerJoin(events, eq(events.id, registrations.eventId))
    .innerJoin(attendance, eq(attendance.registrationId, registrations.id))
    .leftJoin(certificates, eq(certificates.registrationId, registrations.id))
    .where(where)
    .orderBy(desc(events.startAt), users.name)
    .limit(opts.limit)
    .offset(opts.offset);
  const [{ total }] = await db
    .select({ total: count() })
    .from(registrations)
    .innerJoin(events, eq(events.id, registrations.eventId))
    .innerJoin(attendance, eq(attendance.registrationId, registrations.id))
    .where(where);
  return { items, total };
}

export async function getAdminStats() {
  const one = async (q: Promise<{ n: number }[]>) => (await q)[0].n;
  const [totalEvents, publishedEvents, pendingEvents, totalRegistrations, totalPresent, totalUsers] =
    await Promise.all([
      one(db.select({ n: count() }).from(events)),
      one(db.select({ n: count() }).from(events).where(eq(events.status, "published"))),
      one(db.select({ n: count() }).from(events).where(eq(events.status, "pending"))),
      one(db.select({ n: count() }).from(registrations).where(eq(registrations.status, "registered"))),
      one(
        db
          .select({ n: count() })
          .from(attendance)
          .innerJoin(registrations, eq(registrations.id, attendance.registrationId))
          .where(and(eq(attendance.status, "present"), eq(registrations.status, "registered"))),
      ),
      one(db.select({ n: count() }).from(users)),
    ]);
  return { totalEvents, publishedEvents, pendingEvents, totalRegistrations, totalPresent, totalUsers };
}

const userColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  status: users.status,
  createdAt: users.createdAt,
};

export async function listUsers(opts: {
  q?: string;
  role?: Role;
  status?: UserStatus;
  limit: number;
  offset: number;
}) {
  const where = and(
    opts.q ? or(like(users.name, `%${opts.q}%`), like(users.email, `%${opts.q}%`)) : undefined,
    opts.role ? eq(users.role, opts.role) : undefined,
    opts.status ? eq(users.status, opts.status) : undefined,
  );
  const items = await db
    .select(userColumns) // passwordHash dan field token verifikasi sengaja tidak dipilih
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(opts.limit)
    .offset(opts.offset);
  const [{ total }] = await db.select({ total: count() }).from(users).where(where);
  return { items, total };
}

export async function updateUser(
  actor: Actor,
  targetId: number,
  patch: { role?: Role; status?: UserStatus },
) {
  if (targetId === actor.id)
    throw new AppError(400, "Anda tidak bisa mengubah role atau status akun sendiri");
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetId));
  if (!target) throw new AppError(404, "Pengguna tidak ditemukan");

  await db.update(users).set(patch).where(eq(users.id, targetId));
  const [updated] = await db.select(userColumns).from(users).where(eq(users.id, targetId));
  return { user: updated };
}