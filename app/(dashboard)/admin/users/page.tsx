"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";

import { MetricCard, MetricsGrid } from "@/components/common/metrics-cards";
import { Spinner } from "@/components/common/spinner";
import { Input } from "@/components/ui/input";
import { useAdminUsers } from "@/hooks/use-admin";
import { useAuthStore } from "@/hooks/use-auth";
import { EXPERIENCE, GENDERS, optionLabel } from "@/lib/profile-options";
import type { AdminUser } from "@/lib/types";

/** A timestamp as its IST day, DD-MM-YYYY. */
function istDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" }).replace(/\//g, "-");
}

function age(dob: string): string {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "—";
  const now = new Date();
  const years = now.getFullYear() - d.getFullYear()
    - (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate()) ? 1 : 0);
  return String(years);
}

function Breakdown({ title, counts, label }: {
  title: string;
  counts: Record<string, number>;
  label: (value: string) => string;
}) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <div className="content-panel p-4">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map(([value, n]) => (
            <li key={value} className="flex justify-between gap-4">
              <span className="text-muted-foreground">{label(value)}</span>
              <span className="font-mono">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The admin's view of everyone who signed up (tracker MU2): details and a few counts. */
export default function AdminUsersPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const q = useAdminUsers(isAdmin);
  const [search, setSearch] = useState("");

  const users = useMemo(() => {
    const all = q.data?.users ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all.filter((u: AdminUser) =>
      [u.full_name, u.email, u.phone, u.city, u.state, u.country].some((v) => (v ?? "").toLowerCase().includes(term)));
  }, [q.data, search]);

  if (!isAdmin) {
    return <p className="text-sm text-muted-foreground">Only an admin can see this page.</p>;
  }

  const s = q.data?.stats;
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Users
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Everyone who signed up to Centurion</p>
      </div>

      {q.isLoading && <Spinner />}
      {q.error && <p className="text-sm text-destructive">{(q.error as Error).message}</p>}

      {s && (
        <>
          <MetricsGrid>
            <MetricCard label="Signed up" value={String(s.total)} />
            <MetricCard label="Active" value={String(s.active)} />
            <MetricCard label="Awaiting activation" value={String(s.pending)} />
            <MetricCard label="New in the last 7 days" value={String(s.new_last_7_days)} />
            <MetricCard label="Zerodha connected" value={String(s.zerodha_connected)} />
          </MetricsGrid>

          <div className="grid gap-3 md:grid-cols-3">
            <Breakdown title="Trading experience" counts={s.by_experience} label={(v) => optionLabel(EXPERIENCE, v)} />
            <Breakdown title="Gender" counts={s.by_gender} label={(v) => optionLabel(GENDERS, v)} />
            <Breakdown title="Country" counts={s.by_country} label={(v) => v || "Not given"} />
          </div>

          <div className="content-panel p-4 space-y-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search name, email, mobile or place" value={search}
                     onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    {["Name", "Email", "Mobile", "Gender", "Age", "Trading experience", "City", "State", "Country",
                      "Status", "Signed up", "Last sign-in", "Zerodha"].map((h) => (
                      <th key={h} className="py-2 pr-3 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-1.5 pr-3 whitespace-nowrap font-medium">{u.full_name}</td>
                      <td className="py-1.5 pr-3">{u.email}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{u.phone || "—"}</td>
                      <td className="py-1.5 pr-3">{optionLabel(GENDERS, u.gender)}</td>
                      <td className="py-1.5 pr-3">{age(u.date_of_birth)}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{optionLabel(EXPERIENCE, u.trading_experience)}</td>
                      <td className="py-1.5 pr-3">{u.city}</td>
                      <td className="py-1.5 pr-3">{u.state || "—"}</td>
                      <td className="py-1.5 pr-3">{u.country}</td>
                      <td className="py-1.5 pr-3">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                          u.status === "active" ? "bg-green-500/15 text-green-600" : "bg-amber-500/15 text-amber-600"}`}>
                          {u.status === "active" ? "Active" : "Awaiting activation"}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{istDay(u.created_at)}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{istDay(u.last_login_at)}</td>
                      <td className="py-1.5 pr-3">{u.zerodha_connected ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={13} className="py-4 text-center text-muted-foreground">
                        {search ? "No user matches the search" : "No one has signed up yet"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
