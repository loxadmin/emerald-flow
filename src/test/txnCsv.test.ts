import { describe, expect, it } from "vitest";
import { parseTxnCsv } from "../lib/txn-csv";

describe("parseTxnCsv", () => {
  it("parses 2-column CSV with headers (e.g. Transaction ID, Amount (NGN))", () => {
    const csv = `Transaction ID,Amount (NGN)
txn1123,230
txn1023,4000
txn1003,300000`;

    const { rows, errors } = parseTxnCsv(csv);

    expect(errors).toHaveLength(0);
    expect(rows).toEqual([
      { user_ref: "txn1123", txn_id: "txn1123", amount_usd: 230 },
      { user_ref: "txn1023", txn_id: "txn1023", amount_usd: 4000 },
      { user_ref: "txn1003", txn_id: "txn1003", amount_usd: 300000 },
    ]);
  });

  it("parses 3-column CSV with headers (user_ref, txn_id, amount_usd)", () => {
    const csv = `user_ref,txn_id,amount_usd
usr_001,txn_101,50.25
usr_002,txn_102,100`;

    const { rows, errors } = parseTxnCsv(csv);

    expect(errors).toHaveLength(0);
    expect(rows).toEqual([
      { user_ref: "usr_001", txn_id: "txn_101", amount_usd: 50.25 },
      { user_ref: "usr_002", txn_id: "txn_102", amount_usd: 100 },
    ]);
  });

  it("parses CSV with currency formatting and commas", () => {
    const csv = `Reference,Volume
TXN-1,$1,250.00
TXN-2,NGN 300,000`;

    const { rows, errors } = parseTxnCsv(csv);

    expect(errors).toHaveLength(0);
    expect(rows).toEqual([
      { user_ref: "TXN-1", txn_id: "TXN-1", amount_usd: 1250 },
      { user_ref: "TXN-2", txn_id: "TXN-2", amount_usd: 300000 },
    ]);
  });

  it("parses 2-column CSV without headers", () => {
    const csv = `txn999,150
txn888,250`;

    const { rows, errors } = parseTxnCsv(csv);

    expect(errors).toHaveLength(0);
    expect(rows).toEqual([
      { user_ref: "txn999", txn_id: "txn999", amount_usd: 150 },
      { user_ref: "txn888", txn_id: "txn888", amount_usd: 250 },
    ]);
  });

  it("returns an error for empty CSV", () => {
    const { rows, errors } = parseTxnCsv("");

    expect(rows).toHaveLength(0);
    expect(errors).toContain("File is empty");
  });
});
