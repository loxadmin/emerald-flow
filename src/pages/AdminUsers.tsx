import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { functionError } from "@/lib/errors";
import { Users, RefreshCw, ShieldCheck, Ban, Trash2, ShieldOff, Crown } from "lucide-react";

type Row = {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  is_blocked: boolean | null;
  created_at: string;
  roles: string[];
};

export default function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "admins">("all");
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const call = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-users", { body: payload });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await call({ action: "list" });
      setRows((data.users as Row[]) || []);
      setDenied(null);
    } catch (e) {
      const msg = await functionError(e);
      setDenied(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (payload: Record<string, unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await call(payload);
      toast.success(okMsg);
      await load();
    } catch (e) {
      toast.error(await functionError(e));
    } finally {
      setBusy(false);
    }
  };

  const visible = rows.filter((r) => {
    const isAdmin = r.roles.includes("admin") || r.roles.includes("super_admin");
    if (filter === "admins" && !isAdmin) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (r.email || "").toLowerCase().includes(q) ||
      (r.full_name || "").toLowerCase().includes(q) ||
      (r.company_name || "").toLowerCase().includes(q)
    );
  });

  const adminCount = rows.filter((r) => r.roles.includes("admin") || r.roles.includes("super_admin")).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Users &amp; admins
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Super admin only. Create admins, revoke access, ban or delete accounts.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>

        {denied ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            {denied}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:max-w-md">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Total users</p>
                <p className="text-2xl font-semibold">{rows.length}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Admins</p>
                <p className="text-2xl font-semibold">{adminCount}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-medium">Add an admin</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="admin@company.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="sm:max-w-sm"
                />
                <Button
                  disabled={busy || !newEmail.trim()}
                  onClick={() =>
                    act({ action: "create_admin", email: newEmail.trim() }, "Admin added").then(() =>
                      setNewEmail(""),
                    )
                  }
                >
                  <ShieldCheck className="mr-2 h-4 w-4" /> Make admin
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Existing accounts are promoted instantly. New emails get an account plus a password
                setup link.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="Search by email, name or company"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="sm:max-w-sm"
              />
              <div className="flex gap-2">
                <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
                  All users
                </Button>
                <Button variant={filter === "admins" ? "default" : "outline"} size="sm" onClick={() => setFilter("admins")}>
                  Admins only
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {loading ? (
                <div className="p-6 text-sm text-muted-foreground">Loading…</div>
              ) : visible.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No users found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Joined</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((r) => {
                        const isSuper = r.roles.includes("super_admin");
                        const isAdmin = isSuper || r.roles.includes("admin");
                        return (
                          <tr key={r.id} className="border-t border-border/60">
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground">{r.email || "unknown"}</p>
                              <p className="text-xs text-muted-foreground">
                                {r.full_name || r.company_name || "-"}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-xs font-medium ${
                                  isSuper
                                    ? "bg-primary/10 text-primary"
                                    : isAdmin
                                      ? "bg-foreground/[0.06] text-foreground"
                                      : "text-muted-foreground"
                                }`}
                              >
                                {isSuper ? "Super admin" : isAdmin ? "Admin" : "Advertiser"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {r.is_blocked ? (
                                <span className="text-xs font-medium text-destructive">Banned</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Active</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                              {new Date(r.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap justify-end gap-2">
                                {!isAdmin && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => act({ action: "create_admin", email: r.email }, "Promoted to admin")}
                                  >
                                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Make admin
                                  </Button>
                                )}
                                {isAdmin && !isSuper && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={busy}
                                      onClick={() => act({ action: "grant_super", user_id: r.id }, "Super admin granted")}
                                    >
                                      <Crown className="mr-1.5 h-3.5 w-3.5" /> Super
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={busy}
                                      onClick={() => act({ action: "revoke_admin", user_id: r.id }, "Admin access revoked")}
                                    >
                                      <ShieldOff className="mr-1.5 h-3.5 w-3.5" /> Revoke
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() =>
                                    act(
                                      { action: r.is_blocked ? "unban" : "ban", user_id: r.id },
                                      r.is_blocked ? "Account unbanned" : "Account banned",
                                    )
                                  }
                                >
                                  <Ban className="mr-1.5 h-3.5 w-3.5" /> {r.is_blocked ? "Unban" : "Ban"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={busy}
                                  onClick={() => {
                                    if (!confirm(`Delete ${r.email}? This cannot be undone.`)) return;
                                    act({ action: "delete", user_id: r.id }, "Account deleted");
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
