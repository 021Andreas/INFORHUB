/** Error "duplicate entry" dari MySQL/MariaDB (unique index), termasuk yang dibungkus Drizzle. */
export function isDuplicateError(e: unknown): boolean {
  const x = e as { code?: string; errno?: number; cause?: { code?: string; errno?: number } };
  return (
    x?.code === "ER_DUP_ENTRY" ||
    x?.cause?.code === "ER_DUP_ENTRY" ||
    x?.errno === 1062 ||
    x?.cause?.errno === 1062
  );
}