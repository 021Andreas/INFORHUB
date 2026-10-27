import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "$env/dynamic/private";
import { AppError } from "$lib/server/services/event.service";
import type { Kind, Storage } from "./index";

const dirs: Record<Kind, () => string> = {
  poster: () => path.resolve(env.UPLOAD_DIR ?? "storage/posters"),
  certificate: () => path.resolve(env.CERT_DIR ?? "storage/certificates"),
};

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

// Menolak path di luar folder penyimpanan (mis. ../../etc/passwd)
function safePath(kind: Kind, ref: string) {
  const base = dirs[kind]();
  const full = path.resolve(base, ref);
  if (!/^[A-Za-z0-9._-]+$/.test(ref) || !full.startsWith(base + path.sep))
    throw new AppError(404, "File tidak ditemukan");
  return full;
}

export const local: Storage = {
  async put(kind, name, bytes) {
    const full = safePath(kind, name);
    await mkdir(dirs[kind](), { recursive: true });
    await writeFile(full, bytes);
    return name;
  },
  async get(kind, ref) {
    const full = safePath(kind, ref);
    try {
      return {
        bytes: await readFile(full),
        mime: MIME[path.extname(ref).toLowerCase()] ?? "application/octet-stream",
      };
    } catch {
      throw new AppError(404, "File tidak ditemukan");
    }
  },
  async remove(kind, ref) {
    try {
      await unlink(safePath(kind, ref));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  },
};