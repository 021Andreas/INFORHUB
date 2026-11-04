import { sql } from "drizzle-orm";
import { db } from "$lib/server/db";

type Row = Record<string, unknown>;
const rows = async (q: ReturnType<typeof sql>) => ((await db.execute(q)) as unknown as [Row[]])[0];
const num = (v: unknown) => Number(v ?? 0);

/**
 * F-20 laporan aktivitas platform. Acuan periode = waktu MULAI acara (acara yang jadwalnya jatuh
 * dalam rentang); pengguna baru dihitung dari tanggal pendaftaran akun. Zona waktu pengelompokan
 * bulan: UTC (sama dengan cara data disimpan).
 */
export async function getActivityReport(from: Date, to: Date) {
  const f = from;
  const t = to;

  // statistik per acara dihitung satu kali; ringkasan/kategori/bulan/teratas diturunkan darinya
  const perEvent = await rows(sql`
    select e.id, e.title, e.status,
           coalesce(c.name, 'Tanpa kategori') as category,
           date_format(e.start_at, '%Y-%m') as month,
           (select count(*) from registrations as r where r.event_id = e.id and r.status = 'registered') as registered,
           (select count(*) from registrations as r where r.event_id = e.id and r.status = 'cancelled') as cancelled,
           (select count(*) from attendance as a inner join registrations as r on r.id = a.registration_id
              where r.event_id = e.id and r.status = 'registered' and a.status = 'present') as attended
    from events as e
    left join event_categories as c on c.id = e.category_id
    where e.start_at >= ${f} and e.start_at <= ${t}`);

  const [certs] = await rows(sql`
    select count(*) as issued, coalesce(sum(c.status = 'revoked'), 0) as revoked
    from certificates as c
    inner join registrations as r on r.id = c.registration_id
    inner join events as e on e.id = r.event_id
    where e.start_at >= ${f} and e.start_at <= ${t}`);
  const [rating] = await rows(sql`
    select count(*) as n, avg(v.rating) as mean
    from event_reviews as v inner join events as e on e.id = v.event_id
    where e.start_at >= ${f} and e.start_at <= ${t}`);
  const [newUsers] = await rows(sql`select count(*) as n from users where created_at >= ${f} and created_at <= ${t}`);

  const byStatus: Record<string, number> = {};
  const cat = new Map<string, { category: string; events: number; registered: number; attended: number }>();
  const mon = new Map<string, { month: string; events: number; registered: number; attended: number }>();
  let registered = 0;
  let cancelled = 0;
  let attended = 0;

  for (const e of perEvent) {
    byStatus[String(e.status)] = (byStatus[String(e.status)] ?? 0) + 1;
    // pendaftar/kehadiran hanya berarti untuk acara yang sempat dibuka (published/completed)
    if (e.status !== "published" && e.status !== "completed") continue;
    const reg = num(e.registered);
    const att = num(e.attended);
    registered += reg;
    cancelled += num(e.cancelled);
    attended += att;
    const c = cat.get(String(e.category)) ?? { category: String(e.category), events: 0, registered: 0, attended: 0 };
    c.events++; c.registered += reg; c.attended += att;
    cat.set(c.category, c);
    const m = mon.get(String(e.month)) ?? { month: String(e.month), events: 0, registered: 0, attended: 0 };
    m.events++; m.registered += reg; m.attended += att;
    mon.set(m.month, m);
  }

  const rate = (a: number, r: number) => (r ? Math.round((a / r) * 1000) / 10 : 0);
  const withRate = <T extends { registered: number; attended: number }>(x: T) => ({
    ...x,
    attendanceRate: rate(x.attended, x.registered),
  });

  return {
    period: { from: f.toISOString(), to: t.toISOString() },
    summary: {
      eventsByStatus: byStatus,
      eventsTotal: perEvent.length,
      registrations: registered,
      cancellations: cancelled,
      attended,
      attendanceRate: rate(attended, registered),
      certificatesIssued: num(certs?.issued),
      certificatesRevoked: num(certs?.revoked),
      reviews: num(rating?.n),
      averageRating: rating?.mean == null ? null : Math.round(Number(rating.mean) * 100) / 100,
      newUsers: num(newUsers?.n),
    },
    byCategory: [...cat.values()].sort((a, b) => b.registered - a.registered).map(withRate),
    byMonth: [...mon.values()].sort((a, b) => a.month.localeCompare(b.month)).map(withRate),
    topEvents: perEvent
      .filter((e) => e.status === "published" || e.status === "completed")
      .map((e) => ({ id: num(e.id), title: String(e.title), category: String(e.category), registered: num(e.registered), attended: num(e.attended) }))
      .sort((a, b) => b.registered - a.registered || a.id - b.id)
      .slice(0, 10)
      .map(withRate),
  };
}