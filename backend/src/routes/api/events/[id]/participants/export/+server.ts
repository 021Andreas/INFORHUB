import { errorResponse, parseId, queryEnum, requireRole } from "$lib/server/http";
import { slugify, toCsv } from "$lib/server/export";
import { listParticipants } from "$lib/server/services/read.service";
import type { RequestHandler } from "./$types";

const fmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
const when = (d: Date | null | undefined) => (d ? fmt.format(d) : "");

// Ekspor CSV peserta (penyelenggara acara tsb / admin). ?status=registered (default) | cancelled | all
export const GET: RequestHandler = async ({ params, locals, url }) => {
  try {
    const actor = requireRole(locals, "penyelenggara", "admin");
    const status = queryEnum(url, "status", ["registered", "cancelled", "all"], "registered");
    const { event, participants } = await listParticipants(actor, parseId(params.id), status);

    const csv = toCsv(
      ["No", "Nama", "Email", "NIM", "Status Pendaftaran", "Waktu Daftar (WIB)", "Kehadiran", "Waktu Presensi (WIB)", "Nomor Sertifikat"],
      participants.map((p, i) => [
        i + 1,
        p.name,
        p.email,
        p.nim,
        p.status === "registered" ? "Terdaftar" : "Dibatalkan",
        when(p.registeredAt),
        p.attendanceStatus === "present" ? "Hadir" : "Belum hadir",
        when(p.checkedAt),
        p.certificateNumber,
      ]),
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="peserta-${slugify(event.title)}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
};