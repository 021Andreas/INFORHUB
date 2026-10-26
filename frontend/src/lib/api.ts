import { env } from '$env/dynamic/public';

// Alamat backend. Atur di frontend/.env: PUBLIC_API_URL=http://localhost:3000
const BASE = env.PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Options = { method?: string; body?: unknown };

export async function api<T = unknown>(path: string, options: Options = {}): Promise<T> {
  const hasBody = options.body !== undefined;

  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include', // wajib supaya cookie session ikut terkirim
    headers: hasBody || options.method ? { 'Content-Type': 'application/json' } : undefined,
    body: hasBody ? JSON.stringify(options.body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Terjadi kesalahan');
  return data as T;
}
