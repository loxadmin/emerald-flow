export type TxnRow = { user_ref: string; txn_id: string; amount_usd: number };

/**
 * Split CSV line respecting quotes and basic comma delimiter.
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ""));
  return result;
}

/**
 * Parses a transaction CSV. Accepts 2-column or 3-column CSVs with or without headers.
 * Headers like:
 * - user / user_ref / user_id / customer / account
 * - transaction_id / txn_id / transaction id / reference / ref / id / tx_ref
 * - amount / amount_usd / amount (ngn) / value / volume / total / sum
 *
 * Falls back to 2-column (txn_id, amount) or 3-column (user_ref, txn_id, amount) index mapping.
 */
export function parseTxnCsv(text: string): { rows: TxnRow[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { rows: [], errors: ["File is empty"] };

  const firstLineCols = splitCsvLine(lines[0]).map((h) => h.toLowerCase());

  const exactUserKeys = ["user_ref", "user", "user_id", "userid", "customer", "customer_id", "account"];
  const exactIdKeys = ["txn_id", "transaction_id", "transactionid", "transaction id", "reference", "ref", "id", "tx_ref", "tx_id"];
  const exactAmtKeys = ["amount_usd", "amount", "amount (ngn)", "amount_ngn", "amount(ngn)", "value", "transaction_amount", "volume", "total", "sum"];

  // 1. First find exact matches
  let userIdx = firstLineCols.findIndex((h) => exactUserKeys.includes(h));
  let idIdx = firstLineCols.findIndex((h, idx) => idx !== userIdx && exactIdKeys.includes(h));
  let amtIdx = firstLineCols.findIndex((h, idx) => idx !== userIdx && idx !== idIdx && exactAmtKeys.includes(h));

  // 2. If missing, find partial matches
  if (userIdx === -1) {
    userIdx = firstLineCols.findIndex((h) => exactUserKeys.some((k) => h.includes(k)));
  }
  if (idIdx === -1) {
    idIdx = firstLineCols.findIndex((h, idx) => idx !== userIdx && exactIdKeys.some((k) => h.includes(k)));
  }
  if (amtIdx === -1) {
    amtIdx = firstLineCols.findIndex((h, idx) => idx !== userIdx && idx !== idIdx && exactAmtKeys.some((k) => h.includes(k)));
  }

  let hasHeader = idIdx !== -1 || amtIdx !== -1 || userIdx !== -1;
  let start = hasHeader ? 1 : 0;

  const rows: TxnRow[] = [];

  for (let i = start; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    if (cells.length < 2) continue;

    let user_ref = "N/A";
    let txn_id = "";
    let rawAmount = "";

    if (hasHeader) {
      if (userIdx !== -1 && cells[userIdx] !== undefined) user_ref = cells[userIdx];
      if (idIdx !== -1 && cells[idIdx] !== undefined) txn_id = cells[idIdx];
      if (amtIdx !== -1 && cells[amtIdx] !== undefined) {
        // If amtIdx is the last mapped header column and there are extra split cells (e.g. unquoted comma in amount), join them
        const maxHeaderIdx = Math.max(userIdx, idIdx, amtIdx);
        if (amtIdx === maxHeaderIdx && cells.length > maxHeaderIdx) {
          rawAmount = cells.slice(amtIdx).join("");
        } else {
          rawAmount = cells[amtIdx];
        }
      }
    }

    // Fallback index assignment if header mapping didn't find both id and amount
    if (!txn_id || !rawAmount) {
      if (cells.length >= 3) {
        user_ref = cells[0] || "N/A";
        txn_id = cells[1] || "";
        rawAmount = cells[2] || "";
      } else if (cells.length === 2) {
        txn_id = cells[0] || "";
        rawAmount = cells[1] || "";
        user_ref = cells[0] || "N/A";
      }
    }

    if (user_ref === "N/A" && txn_id) {
      user_ref = txn_id;
    }

    const cleanAmtStr = rawAmount.replace(/[^0-9.\-]/g, "");
    const amount = Number(cleanAmtStr);

    if (!txn_id) {
      errors.push(`Row ${i + 1}: missing transaction ID`);
      continue;
    }
    if (!rawAmount || Number.isNaN(amount)) {
      errors.push(`Row ${i + 1}: invalid amount (${rawAmount})`);
      continue;
    }

    rows.push({
      user_ref,
      txn_id,
      amount_usd: Number(amount.toFixed(2)),
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push("No transaction rows found");
  }

  return { rows, errors };
}

export const sumTxn = (rows: TxnRow[]) =>
  rows.reduce((s, r) => s + (Number(r.amount_usd) || 0), 0);
