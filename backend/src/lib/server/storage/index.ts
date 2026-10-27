import { env } from "$env/dynamic/private";
import { drive } from "./drive";
import { local } from "./local";

export type Kind = "poster" | "certificate";

/**
 * Penyimpanan file. `put` mengembalikan referensi (nama file untuk driver lokal,
 * ID file untuk Google Drive) yang disimpan di database / dipakai membentuk URL.
 */
export interface Storage {
  put(kind: Kind, name: string, bytes: Uint8Array, mime: string): Promise<string>;
  get(kind: Kind, ref: string): Promise<{ bytes: Uint8Array; mime: string }>;
  remove(kind: Kind, ref: string): Promise<void>;
}

// STORAGE_DRIVER=local (default, untuk development) atau drive (Google Drive)
function pick(): Storage {
  const name = env.STORAGE_DRIVER ?? "local";
  if (name === "drive") return drive;
  if (name === "local") return local;
  throw new Error(`STORAGE_DRIVER tidak dikenal: "${name}" (gunakan "local" atau "drive")`);
}

export const storage: Storage = {
  put: (...a) => pick().put(...a),
  get: (...a) => pick().get(...a),
  remove: (...a) => pick().remove(...a),
};