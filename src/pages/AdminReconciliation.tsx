import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import MotionWrapper from "@/components/MotionWrapper";
import { friendlyError } from "@/lib/errors";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";

interface WalletRow {
  wallet_id: string;
  advertiser_id: string;
  email: string | null;
  balance: number;
  ledger_balance: number;
  drift: number;
  credits: number;
  debits: number;
  txn_count: number;
}

interface DailyRow {
  day: string;
  credits: number;
  debits: number;
  net: number;
  txn_count: number;
}

interface EscrowRow {
  kind: string;
  entity_id: string;
  name: string | null;
  status: string | null;
  advertiser_email: string | null;
  escrowed: number;
  consumed: number;
  refunded: number;
  remaining: number;
  drift: number;
}

interface TestResult {
  name: string;
  passed: boolean | null;
  note?: string;
}

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function AdminReconciliation() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [escrow, setEscrow] = useState<EscrowRow[]>([]);
  const [from, setFrom] = useState(iso(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(iso(new Date()));
  const [tests, setTests] = useState<TestResult[]>([]);
  const [testRanAt, setTestRanAt] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [w, d, e] = await Promise.all([
      supabase.rpc("reconcile_wallets"),
      supabase.rpc("reconcile_daily", { _from: from, _to: to }),
      supabase.rpc("reconcile_escrow"),
    ]);
    if (w.error || d.error || e.error) {
      toast({ title: friendlyError(w.error || d.error || e.error), variant: "destructive" });
    }
    setWallets((w.data as WalletRow[]) || []);
    setDaily((d.data as DailyRow[]) || []);
    setEscrow((e.data as EscrowRow[]) || []);
    setLoading(false);
  }, [from, to, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const runTests = async () => {
    setTesting(true);
    const { data, error } = await supabase.rpc("run_financial_selftest");
    if (error) {
      toast({ title: friendlyError(error), variant: "destructive" });
    } else {
      const payload = data as unknown as { ran_at: string; results: TestResult[] };
      setTests(payload?.results || []);
      setTestRanAt(payload?.ran_at || null);
    }
    setTesting(false);
  };

  const driftWallets = wallets.filter((w) => Math.abs(Number(w.drift)) > 0.01);
  const escrowIssues = escrow.filter((e) => e.kind === "campaign" || e.kind === "package");
  const totalBalance = wallets.reduce((s, w) => s + Number(w.balance), 0);
  const totalLedger = wallets.reduce((s, w) => s + Number(w.ledger_balance), 0);

  return (
    <AdminLayout>
      <MotionWrapper>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Reconciliation</h1>
              <p className="text-sm text-muted-foreground">
                Wallet and escrow balances audited against the transaction ledger.
              </p>
            </div>
            <Button onClick={load} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <GlassCard>
              <GlassCardContent className="p-4">
                <p className="text-xs text-muted-foreground">Wallet balances</p>
                <p className="text-xl font-semibold">{money(totalBalance)}</p>
              </GlassCardContent>
            </GlassCard>
            <GlassCard>
              <GlassCardContent className="p-4">
                <p className="text-xs text-muted-foreground">Ledger total</p>
                <p className="text-xl font-semibold">{money(totalLedger)}</p>
              </GlassCardContent>
            </GlassCard>
            <GlassCard>
              <GlassCardContent className="p-4">
                <p className="text-xs text-muted-foreground">Accounts out of balance</p>
                <p className={`text-xl font-semibold ${driftWallets.length ? "text-destructive" : ""}`}>
                  {driftWallets.length}
                </p>
              </GlassCardContent>
            </GlassCard>
          </div>

          <Tabs defaultValue="wallets">
            <TabsList>
              <TabsTrigger value="wallets">Wallets</TabsTrigger>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="escrow">Escrow</TabsTrigger>
              <TabsTrigger value="tests">Invariant tests</TabsTrigger>
            </TabsList>

            <TabsContent value="wallets" className="mt-4">
              <GlassCard>
                <GlassCardHeader>
                  <GlassCardTitle>Wallet vs ledger</GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-4">Advertiser</th>
                        <th className="py-2 pr-4">Balance</th>
                        <th className="py-2 pr-4">Ledger</th>
                        <th className="py-2 pr-4">Credits</th>
                        <th className="py-2 pr-4">Debits</th>
                        <th className="py-2 pr-4">Txns</th>
                        <th className="py-2">Drift</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wallets.map((w) => {
                        const bad = Math.abs(Number(w.drift)) > 0.01;
                        return (
                          <tr key={w.wallet_id} className="border-t border-border/60">
                            <td className="py-2 pr-4">{w.email || w.advertiser_id.slice(0, 8)}</td>
                            <td className="py-2 pr-4">{money(w.balance)}</td>
                            <td className="py-2 pr-4">{money(w.ledger_balance)}</td>
                            <td className="py-2 pr-4">{money(w.credits)}</td>
                            <td className="py-2 pr-4">{money(w.debits)}</td>
                            <td className="py-2 pr-4">{w.txn_count}</td>
                            <td className="py-2">
                              {bad ? (
                                <Badge variant="destructive">{money(w.drift)}</Badge>
                              ) : (
                                <Badge variant="secondary">balanced</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {!wallets.length && !loading && (
                        <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No wallets yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </GlassCardContent>
              </GlassCard>
            </TabsContent>

            <TabsContent value="daily" className="mt-4">
              <GlassCard>
                <GlassCardHeader>
                  <GlassCardTitle>Daily money movement</GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <Label htmlFor="from" className="text-xs">From</Label>
                      <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="to" className="text-xs">To</Label>
                      <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-muted-foreground">
                        <tr>
                          <th className="py-2 pr-4">Day</th>
                          <th className="py-2 pr-4">Credits</th>
                          <th className="py-2 pr-4">Debits</th>
                          <th className="py-2 pr-4">Net</th>
                          <th className="py-2">Txns</th>
                        </tr>
                      </thead>
                      <tbody>
                        {daily.map((d) => (
                          <tr key={d.day} className="border-t border-border/60">
                            <td className="py-2 pr-4">{String(d.day).slice(0, 10)}</td>
                            <td className="py-2 pr-4 text-emerald-600">{money(d.credits)}</td>
                            <td className="py-2 pr-4">{money(d.debits)}</td>
                            <td className="py-2 pr-4">{money(d.net)}</td>
                            <td className="py-2">{d.txn_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCardContent>
              </GlassCard>
            </TabsContent>

            <TabsContent value="escrow" className="mt-4">
              <GlassCard>
                <GlassCardHeader>
                  <GlassCardTitle>Campaign and package escrow</GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent className="space-y-3 overflow-x-auto">
                  {escrowIssues.length > 0 && (
                    <p className="flex items-center gap-2 text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4" /> {escrowIssues.length} record(s) out of balance
                    </p>
                  )}
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-4">Type</th>
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Advertiser</th>
                        <th className="py-2 pr-4">Escrowed</th>
                        <th className="py-2 pr-4">Consumed</th>
                        <th className="py-2 pr-4">Refunded</th>
                        <th className="py-2 pr-4">Remaining</th>
                        <th className="py-2">State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {escrow.map((e) => {
                        const bad = e.kind === "campaign" || e.kind === "package";
                        return (
                          <tr key={`${e.kind}-${e.entity_id}`} className="border-t border-border/60">
                            <td className="py-2 pr-4 capitalize">{e.kind.replace("_ok", "")}</td>
                            <td className="py-2 pr-4">{e.name || "—".replace("—", "-")}</td>
                            <td className="py-2 pr-4">{e.advertiser_email || "-"}</td>
                            <td className="py-2 pr-4">{money(e.escrowed)}</td>
                            <td className="py-2 pr-4">{money(e.consumed)}</td>
                            <td className="py-2 pr-4">{money(e.refunded)}</td>
                            <td className="py-2 pr-4">{money(e.remaining)}</td>
                            <td className="py-2">
                              {bad ? <Badge variant="destructive">drift {money(e.drift)}</Badge> : <Badge variant="secondary">ok</Badge>}
                            </td>
                          </tr>
                        );
                      })}
                      {!escrow.length && !loading && (
                        <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Nothing to reconcile.</td></tr>
                      )}
                    </tbody>
                  </table>
                </GlassCardContent>
              </GlassCard>
            </TabsContent>

            <TabsContent value="tests" className="mt-4">
              <GlassCard>
                <GlassCardHeader>
                  <GlassCardTitle>Overdraw and duplicate protection</GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Simulates overdraw attempts, escrow overspend and duplicate payment webhooks against the live
                    database. All attempts are rolled back, nothing is charged.
                  </p>
                  <Button onClick={runTests} disabled={testing}>
                    <ShieldCheck className="h-4 w-4 mr-2" /> {testing ? "Running..." : "Run simulations"}
                  </Button>
                  {testRanAt && (
                    <p className="text-xs text-muted-foreground">Last run {new Date(testRanAt).toLocaleString()}</p>
                  )}
                  <ul className="space-y-2">
                    {tests.map((t) => (
                      <li key={t.name} className="flex items-center gap-2 text-sm">
                        {t.passed === true ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : t.passed === false ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{t.name}</span>
                        {t.note && <span className="text-xs text-muted-foreground">({t.note})</span>}
                      </li>
                    ))}
                  </ul>
                </GlassCardContent>
              </GlassCard>
            </TabsContent>
          </Tabs>
        </div>
      </MotionWrapper>
    </AdminLayout>
  );
}
