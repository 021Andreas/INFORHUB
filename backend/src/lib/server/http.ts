import { json } from "@sveltejs/kit";
import { z } from "zod";
import { AppError, type Actor } from "$lib/server/services/event.service";

type Role = Actor["role"];

/** Ubah error apa pun menjadi respons JSON yang rapi. */
export function errorResponse(e: unknown) {
  if (e instanceof AppError) return json({ error: e.message }, { status: e.status });
  if (e instanceof z.ZodError) {
    // Pesan ringkas yang langsung menunjuk field bermasalah; rincian lengkap ada di `details`
    const first = e.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      .join("; ");
    return json(
      { error: `Data tidak valid (${first})`, details: z.flattenError(e) },
      { status: 400 },
    );
  }
  console.error(e);
  return json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
}

/** Membungkus handler: hasil -> JSON, error -> errorResponse. */
export async function respond(run: () => Promise<unknown>, status = 200) {
  try {
    const data = await run();
    return json(data ?? { ok: true }, { status });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Untuk endpoint daftar: body berupa array polos, total baris di header X-Total-Count. */
export async function respondList(run: () => Promise<{ items: unknown[]; total: number }>) {
  try {
    const { items, total } = await run();
    return json(items, { headers: { "X-Total-Count": String(total) } });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError(400, "Body harus berupa JSON yang valid");
  }
}

export function requireUser(locals: App.Locals): Actor {
  if (!locals.user) throw new AppError(401, "Silakan login terlebih dahulu");
  return { id: locals.user.id, role: locals.user.role };
}

export function requireRole(locals: App.Locals, ...roles: Role[]): Actor {
  const actor = requireUser(locals);
  if (!roles.includes(actor.role)) throw new AppError(403, "Anda tidak punya akses");
  return actor;
}

export function parseId(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(400, "ID tidak valid");
  return n;
}

/** ?page=1&limit=20 */
export function parsePaging(url: URL, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, Math.floor(Number(url.searchParams.get("page"))) || 1);
  const raw = Math.floor(Number(url.searchParams.get("limit"))) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, raw));
  return { page, limit, offset: (page - 1) * limit };
}

/** Ambil query param bertipe enum; nilai tidak valid -> 400. */
export function queryEnum<T extends string>(
  url: URL,
  name: string,
  values: readonly [T, ...T[]],
  fallback: T,
): T {
  const v = url.searchParams.get(name);
  if (v === null || v === "") return fallback;
  const parsed = z.enum(values).safeParse(v);
  if (!parsed.success) throw new AppError(400, `Parameter ${name} harus salah satu dari: ${values.filter(Boolean).join(", ")}`);
  return parsed.data;
}

export { isDuplicateError } from "$lib/server/db-errors";