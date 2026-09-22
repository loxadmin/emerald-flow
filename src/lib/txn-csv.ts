export type TxnRow = { txn_id: string; amount_usd: number };

/**
 * Parses a transaction CSV. Accepts headers like:
 * transaction_id / txn_id / reference / id  and  amount / amount_usd / value
 * Falls back to first column = id, second column = amount when no header is recognised.
 */
export function parseTxnCsv(text: string): { rows: TxnRow[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { rows: [], errors: ["File is empty"] };

  const split = (line: string) =>
    line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));

  const header = split(lines[0]).map((h) => h.toLowerCase());
  const idKeys = ["transaction_id", "txn_id", "transactionid", "reference", "ref", "id"];
  const amtKeys = ["amount_usd", "amount", "value", "transaction_amount"];
  let idIdx = header.findIndex((h) => idKeys.includes(h));
  let amtIdx = header.findIndex((h) => amtKeys.includes(h));
  let start = 1;

  if (idIdx === -1 || amtIdx === -1) {
    idIdx = 0;
    amtIdx = 1;
    start = 0; // no recognised header, treat every line as data
  }

  const rows: TxnRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const cells = split(lines[i]);
    const id = cells[idIdx] || "";
    const raw = (cells[amtIdx] || "").replace(/[^0-9.\-]/g, "");
    const amount = Number(raw);
    if (!id) {
      errors.push(`Row ${i + 1}: missing transaction ID`);
      continue;
    }
    if (!raw || Number.isNaN(amount)) {
      errors.push(`Row ${i + 1}: invalid amount`);
      continue;
    }
    rows.push({ txn_id: id, amount_usd: Number(amount.toFixed(2)) });
  }
  if (rows.length === 0 && errors.length === 0) errors.push("No transaction rows found");
  return { rows, errors };
}

export const sumTxn = (rows: TxnRow[]) =>
  rows.reduce((s, r) => s + (Number(r.amount_usd) || 0), 0);
