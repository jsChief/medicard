/**
 * Minimal CSV helpers shared by the list pages.
 *
 * Escaping follows RFC 4180: a field is quoted when it contains a comma, a
 * quote, or a line break, and embedded quotes are doubled.
 */

export function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Builds a CSV document from a column list and matching rows. */
export function buildCsv(columns: readonly string[], rows: Array<Record<string, string>>): string {
  const header = columns.map(csvCell).join(",")
  const body = rows.map(row => columns.map(column => csvCell(row[column] ?? "")).join(","))
  return [header, ...body].join("\n")
}

/** Triggers a client-side download of `csv` as `filename`. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
