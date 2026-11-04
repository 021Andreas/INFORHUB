/* Pembuat file ekspor (murni, tanpa database): CSV peserta dan kalender .ics */

/* ---------------- CSV ---------------- */
// Sel yang diawali = + - @ (atau tab/CR) bisa dijalankan sebagai rumus oleh Excel/Sheets
// ("CSV injection"), jadi diberi awalan ' agar dibaca sebagai teks biasa.
function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** UTF-8 dengan BOM supaya Excel membaca huruf non-ASCII dengan benar; baris dipisah CRLF. */
export function toCsv(header: string[], rows: unknown[][]): string {
  return "\uFEFF" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Nama file aman untuk Content-Disposition (huruf/angka/strip). */
export function slugify(s: string, fallback = "acara"): string {
  const slug = s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

/* ---------------- iCalendar (RFC 5545) ---------------- */
const icsEscape = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// Baris maksimal 75 oktet; lanjutan diawali spasi. Pemotongan tidak boleh memecah karakter multibyte.
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > limit) {
      out.push(cur);
      cur = "";
      bytes = 0;
      limit = 74; // baris lanjutan memuat 1 oktet spasi di depan
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function buildIcs(ev: {
  id: number;
  title: string;
  description: string | null;
  location: string;
  startAt: Date;
  endAt: Date;
  url?: string;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//InforHub//Acara Kampus//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:event-${ev.id}@inforhub`, // tetap sama tiap unduhan: kalender memperbarui, bukan menggandakan
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(ev.startAt)}`,
    `DTEND:${icsDate(ev.endAt)}`,
    `SUMMARY:${icsEscape(ev.title)}`,
    `LOCATION:${icsEscape(ev.location)}`,
  ];
  const desc = [ev.description?.trim(), ev.url].filter(Boolean).join("\n\n");
  if (desc) lines.push(`DESCRIPTION:${icsEscape(desc)}`);
  if (ev.url) lines.push(`URL:${ev.url}`);
  lines.push("STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
