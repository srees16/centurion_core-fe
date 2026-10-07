"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Plus, Trash2, Users, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddKiteAccount, useKiteAccounts, useRemoveKiteAccount } from "@/hooks/use-kite";
import type { KiteAccount, NewKiteAccount } from "@/lib/types";

const EMPTY: NewKiteAccount = { name: "", relation: "spouse", zerodha_user_id: "", api_key: "", api_secret: "", email: "" };

/** The API's error detail ({"detail": "..."}) or the raw message. */
function errorText(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  try {
    return JSON.parse(raw).detail ?? raw;
  } catch {
    return raw;
  }
}

/** Open Zerodha's login from a script so the callback page may close its tab after login; cut the opener first. */
function openLogin(url: string) {
  const w = window.open("", "_blank");
  if (!w) {
    window.location.href = url;
    return;
  }
  w.opener = null;
  w.location.href = url;
}

function LoginState({ account }: { account: KiteAccount }) {
  if (account.logged_in_today) {
    const at = account.login_at ? new Date(account.login_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";
    return (
      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-3.5 w-3.5" /> Logged in {at}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <XCircle className="h-3.5 w-3.5" /> Not today
    </span>
  );
}

/**
 * Zerodha accounts Centurion may connect (decision U33): yours and your family's.
 * Each family member uses their own Kite Connect app; Centurion keeps its API key and
 * secret, never a password or TOTP, and the holder logs in on Zerodha's page each day.
 */
export function KiteAccountsPanel() {
  const accountsQ = useKiteAccounts();
  const add = useAddKiteAccount();
  const remove = useRemoveKiteAccount();
  const [form, setForm] = useState<NewKiteAccount>(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const setup = accountsQ.data?.setup;
  const relations = setup?.relations ?? ["spouse", "child", "parent"];
  const field = (key: keyof NewKiteAccount) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
  });
  const ready = form.name && form.zerodha_user_id && form.api_key && form.api_secret;

  const submit = () =>
    add.mutate(form, {
      onSuccess: () => {
        setForm(EMPTY);
        setShowForm(false);
      },
    });

  return (
    <div className="content-panel p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" /> Zerodha accounts
        </h3>
        <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" /> Add family account
        </Button>
      </div>

      {accountsQ.isLoading && <p className="text-sm text-muted-foreground">Loading accounts…</p>}
      {accountsQ.isError && <p className="text-sm text-destructive">{errorText(accountsQ.error)}</p>}

      {accountsQ.data && (
        <div className="divide-y rounded-md border">
          {accountsQ.data.accounts.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <div className="min-w-[10rem] flex-1">
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">
                  {a.relation === "self" ? "your account" : a.relation} · {a.zerodha_user_id || "user id from the server"}
                </p>
              </div>
              <LoginState account={a} />
              <Button size="sm" onClick={() => openLogin(a.login_url)}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Log in
              </Button>
              {a.id !== "primary" && (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove ${a.name}`}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Remove ${a.name}? Only an account that has never traded can be removed.`)) {
                      remove.mutate(a.id);
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {remove.isError && <p className="text-sm text-destructive">{errorText(remove.error)}</p>}

      {showForm && (
        <div className="space-y-4 rounded-lg border bg-secondary/30 p-4">
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              Only a <strong>spouse, dependent child or dependent parent</strong> may share your registered static IP
              (SEBI). The account holder first creates their own Kite Connect app on developers.kite.trade with:
            </p>
            <p>
              Redirect URL: <code className="rounded bg-secondary px-1">{setup?.redirect_url ?? "…"}</code>
            </p>
            <p>
              IP whitelist:{" "}
              <code className="rounded bg-secondary px-1">{setup?.static_ip ?? "the static IP on your own Kite app"}</code>
            </p>
            <p>
              Centurion keeps the app&apos;s API key and secret (encrypted), never a password or TOTP. The holder logs in on
              Zerodha&apos;s page each trading day.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="acct-name">Name</Label>
              <Input id="acct-name" placeholder="e.g. Priya" {...field("name")} />
            </div>
            <div className="space-y-1">
              <Label>Relation</Label>
              <div className="flex gap-1">
                {relations.map((r) => (
                  <Button
                    key={r}
                    type="button"
                    size="sm"
                    variant={form.relation === r ? "default" : "outline"}
                    onClick={() => setForm({ ...form, relation: r })}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="acct-uid">Zerodha user ID</Label>
              <Input id="acct-uid" placeholder="AB1234" autoCapitalize="characters" {...field("zerodha_user_id")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="acct-email">Email for login links (optional)</Label>
              <Input id="acct-email" type="email" placeholder="name@example.com" {...field("email")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="acct-key">Kite Connect API key</Label>
              <Input id="acct-key" autoComplete="off" {...field("api_key")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="acct-secret">Kite Connect API secret</Label>
              <Input id="acct-secret" type="password" autoComplete="new-password" {...field("api_secret")} />
            </div>
          </div>

          {add.isError && <p className="text-sm text-destructive">{errorText(add.error)}</p>}
          <div className="flex gap-2">
            <Button onClick={submit} disabled={!ready || add.isPending}>
              {add.isPending ? "Adding…" : "Add account"}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
