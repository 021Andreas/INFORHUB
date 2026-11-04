import { eq } from "drizzle-orm";
import { db } from "$lib/server/db";
import { isDuplicateError } from "$lib/server/db-errors";
import { AppError, type Actor } from "$lib/server/errors";
import { notifications, users } from "$lib/server/db/schema";

const profileColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  status: users.status,
  nim: users.nim,
  organizationName: users.organizationName,
  verificationStatus: users.verificationStatus,
  verificationNote: users.verificationNote,
  verifiedAt: users.verifiedAt,
  createdAt: users.createdAt,
};

export async function getProfile(userId: number) {
  const [u] = await db.select(profileColumns).from(users).where(eq(users.id, userId));
  if (!u) throw new AppError(404, "Pengguna tidak ditemukan");
  return u;
}

/** F-02: mahasiswa mengisi NIM (unik); penyelenggara mengisi nama organisasi/unit. */
export async function updateProfile(
  userId: number,
  patch: { name?: string; nim?: string | null; organizationName?: string | null },
) {
  const [u] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (!u) throw new AppError(404, "Pengguna tidak ditemukan");

  if (patch.nim !== undefined && u.role !== "mahasiswa")
    throw new AppError(400, "NIM hanya untuk akun mahasiswa");
  if (patch.organizationName !== undefined && u.role === "mahasiswa")
    throw new AppError(400, "Nama organisasi diisi lewat pengajuan penyelenggara", "USE_APPLICATION");

  const set: Partial<typeof users.$inferInsert> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.nim !== undefined) set.nim = patch.nim;
  if (patch.organizationName !== undefined) set.organizationName = patch.organizationName;
  if (Object.keys(set).length === 0) throw new AppError(400, "Tidak ada perubahan yang dikirim");

  try {
    await db.update(users).set(set).where(eq(users.id, userId));
  } catch (e) {
    if (isDuplicateError(e)) throw new AppError(409, "NIM sudah terdaftar pada akun lain", "NIM_TAKEN");
    throw e;
  }
  return getProfile(userId);
}

/** Mahasiswa mengajukan diri menjadi penyelenggara; menunggu keputusan admin. */
export async function applyOrganizer(userId: number, organizationName: string) {
  const [u] = await db
    .select({ role: users.role, verificationStatus: users.verificationStatus })
    .from(users)
    .where(eq(users.id, userId));
  if (!u) throw new AppError(404, "Pengguna tidak ditemukan");
  if (u.role === "admin") throw new AppError(400, "Akun admin tidak perlu mengajukan");
  if (u.role === "penyelenggara") throw new AppError(409, "Anda sudah menjadi penyelenggara");
  if (u.verificationStatus === "pending") throw new AppError(409, "Pengajuan Anda sedang ditinjau");

  await db
    .update(users)
    .set({ verificationStatus: "pending", organizationName, verificationNote: null })
    .where(eq(users.id, userId));
  return getProfile(userId);
}

/** Admin menyetujui/menolak pengajuan. Menyetujui = role menjadi penyelenggara + terverifikasi. */
export async function reviewOrganizer(
  actor: Actor,
  targetId: number,
  decision: "approve" | "reject",
  note?: string,
) {
  return db.transaction(async (tx) => {
    const [t] = await tx
      .select({ id: users.id, verificationStatus: users.verificationStatus })
      .from(users)
      .where(eq(users.id, targetId))
      .for("update");
    if (!t) throw new AppError(404, "Pengguna tidak ditemukan");
    if (t.verificationStatus !== "pending") throw new AppError(409, "Tidak ada pengajuan yang menunggu");

    if (decision === "approve") {
      await tx
        .update(users)
        .set({
          role: "penyelenggara",
          verificationStatus: "verified",
          verifiedAt: new Date(),
          verifiedBy: actor.id,
          verificationNote: null,
        })
        .where(eq(users.id, targetId));
      await tx.insert(notifications).values({
        userId: targetId,
        type: "organizer_verified",
        message: "Pengajuan penyelenggara Anda disetujui. Anda sekarang dapat membuat acara.",
      });
    } else {
      if (!note?.trim()) throw new AppError(400, "Alasan penolakan wajib diisi");
      await tx
        .update(users)
        .set({ verificationStatus: "rejected", verificationNote: note.trim(), verifiedAt: new Date(), verifiedBy: actor.id })
        .where(eq(users.id, targetId));
      await tx.insert(notifications).values({
        userId: targetId,
        type: "organizer_rejected",
        message: `Pengajuan penyelenggara Anda ditolak: ${note.trim()}`,
      });
    }
    return { ok: true, decision };
  });
}