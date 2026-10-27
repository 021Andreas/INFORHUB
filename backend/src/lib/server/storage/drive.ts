import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { env } from "$env/dynamic/private";
import { importPKCS8, SignJWT } from "jose";
import { AppError } from "$lib/server/services/event.service";
import type { Kind, Storage } from "./index";

/*
 * Penyimpanan Google Drive lewat REST API (tanpa paket googleapis).
 *
 * Dua cara otorisasi (dipilih otomatis dari .env):
 *  1) OAuth refresh token  -> GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 *     Cocok untuk akun Gmail biasa: file dimiliki akun itu dan memakai kuotanya.
 *  2) Service account      -> GOOGLE_APPLICATION_CREDENTIALS (path file JSON) atau
 *     GOOGLE_SERVICE_ACCOUNT_JSON. HANYA berfungsi bila folder berada di Shared Drive
 *     (Google Workspace): service account tidak punya kuota di Drive pribadi.
 *
 * Folder tujuan: GOOGLE_DRIVE_FOLDER_ID. File tidak dibuat publik; poster disajikan
 * lewat backend (proxy) sehingga tidak bergantung pada link publik Drive.
 */

const SCOPE = "https://www.googleapis.com/auth/drive";
const tokenUrl = () => env.GOOGLE_TOKEN_URL ?? "https://oauth2.googleapis.com/token";
const apiBase = () => (env.GOOGLE_API_BASE ?? "https://www.googleapis.com").replace(/\/$/, "");
const ID_PATTERN = /^[A-Za-z0-9_-]{10,128}$/;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function safeText(res: Response) {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "";
  }
}

/* ---------------- token akses ---------------- */
type ServiceAccount = { client_email: string; private_key: string };
let serviceAccount: ServiceAccount | null = null;

async function loadServiceAccount(): Promise<ServiceAccount> {
  if (serviceAccount) return serviceAccount;
  let raw = env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw && env.GOOGLE_APPLICATION_CREDENTIALS) {
    raw = await readFile(env.GOOGLE_APPLICATION_CREDENTIALS, "utf8");
  }
  if (!raw) {
    throw new Error(
      "Kredensial Google Drive belum diatur: isi GOOGLE_REFRESH_TOKEN (+CLIENT_ID/SECRET) " +
        "atau GOOGLE_APPLICATION_CREDENTIALS (service account)",
    );
  }
  const json = JSON.parse(raw);
  if (!json.client_email || !json.private_key)
    throw new Error("File service account tidak memuat client_email / private_key");
  serviceAccount = {
    client_email: String(json.client_email),
    private_key: String(json.private_key).replace(/\\n/g, "\n"),
  };
  return serviceAccount;
}

async function requestToken(): Promise<{ access_token: string; expires_in: number }> {
  const body = new URLSearchParams();
  if (env.GOOGLE_REFRESH_TOKEN) {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET)
      throw new Error("GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET wajib diisi bersama GOOGLE_REFRESH_TOKEN");
    body.set("grant_type", "refresh_token");
    body.set("client_id", env.GOOGLE_CLIENT_ID);
    body.set("client_secret", env.GOOGLE_CLIENT_SECRET);
    body.set("refresh_token", env.GOOGLE_REFRESH_TOKEN);
  } else {
    const sa = await loadServiceAccount();
    const key = await importPKCS8(sa.private_key, "RS256");
    const assertion = await new SignJWT({ scope: SCOPE })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(sa.client_email)
      .setSubject(sa.client_email)
      .setAudience(tokenUrl())
      .setIssuedAt()
      .setExpirationTime("55m")
      .sign(key);
    body.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
    body.set("assertion", assertion);
  }

  let res: Response;
  try {
    res = await fetch(tokenUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    console.error("Google token: jaringan gagal", e);
    throw new AppError(502, "Google tidak dapat dihubungi");
  }
  if (!res.ok) {
    console.error("Google token ditolak", res.status, await safeText(res));
    throw new AppError(502, "Gagal autentikasi ke Google Drive");
  }
  return res.json();
}

let cached: { token: string; expiresAt: number } | null = null;
let pending: Promise<string> | null = null;

function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return Promise.resolve(cached.token);
  pending ??= requestToken()
    .then((t) => {
      cached = { token: t.access_token, expiresAt: Date.now() + t.expires_in * 1000 };
      return t.access_token;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

/* ---------------- panggilan API: 401 -> perbarui token; 429/5xx -> coba ulang ---------------- */
async function driveFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let refreshed = false;
  for (let attempt = 0; ; attempt++) {
    const token = await accessToken();
    let res: Response;
    try {
      res = await fetch(`${apiBase()}${path}`, {
        ...init,
        headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(20000),
      });
    } catch (e) {
      if (attempt < 2) {
        await sleep(300 * (attempt + 1));
        continue;
      }
      console.error("Google Drive: jaringan gagal", e);
      throw new AppError(502, "Google Drive tidak dapat dihubungi");
    }
    if (res.status === 401 && !refreshed) {
      cached = null; // token kedaluwarsa/dicabut: minta yang baru sekali
      refreshed = true;
      continue;
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      await sleep(300 * (attempt + 1));
      continue;
    }
    return res;
  }
}

const notFound = (kind: Kind) =>
  new AppError(404, kind === "poster" ? "Poster tidak ditemukan" : "File sertifikat tidak ditemukan");

export const drive: Storage = {
  async put(_kind, name, bytes, mime) {
    const folder = env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folder) throw new Error("GOOGLE_DRIVE_FOLDER_ID belum diatur");

    const boundary = `inforhub-${randomUUID()}`;
    const meta = JSON.stringify({ name, parents: [folder] });
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
          `--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,
      ),
      Buffer.from(bytes),
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const res = await driveFetch("/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id", {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body: body as BodyInit,
    });
    if (!res.ok) {
      console.error("Google Drive: upload gagal", res.status, await safeText(res));
      throw new AppError(502, "Gagal menyimpan file ke Google Drive");
    }
    const { id } = (await res.json()) as { id?: string };
    if (!id) throw new AppError(502, "Gagal menyimpan file ke Google Drive");
    return id;
  },

  async get(kind, ref) {
    if (!ID_PATTERN.test(ref)) throw notFound(kind);
    const res = await driveFetch(`/drive/v3/files/${encodeURIComponent(ref)}?alt=media&supportsAllDrives=true`);
    if (res.status === 404) throw notFound(kind);
    if (!res.ok) {
      console.error("Google Drive: unduh gagal", res.status, await safeText(res));
      throw new AppError(502, "Gagal membaca file dari Google Drive");
    }
    const mime = (res.headers.get("content-type") ?? "application/octet-stream").split(";")[0].trim();
    return { bytes: new Uint8Array(await res.arrayBuffer()), mime };
  },

  async remove(kind, ref) {
    if (!ID_PATTERN.test(ref)) throw notFound(kind);
    const res = await driveFetch(`/drive/v3/files/${encodeURIComponent(ref)}?supportsAllDrives=true`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 404) {
      console.error("Google Drive: hapus gagal", res.status, await safeText(res));
      throw new AppError(502, "Gagal menghapus file dari Google Drive");
    }
  },
};