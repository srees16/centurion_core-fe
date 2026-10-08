"use client";

import { useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Lock, Plus, Trash2, Users, Wallet, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAddKiteAccount,
  useDisconnectKiteAccount,
  useKiteAccountHoldings,
  useKiteAccounts,
  useRemoveKiteAccount,
  useUpdateKiteAccount,
} from "@/hooks/use-kite";
import type { KiteAccount, KiteAccountMode, KiteAccountsResponse, KiteDisconnect, NewKiteAccount } from "@/lib/types";

const EMPTY: NewKiteAccount = { name: "", zerodha_user_id: "", api_key: "", api_secret: "", email: "" };
const MODES: { value: KiteAccountMode; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "dry_run", label: "Dry run" },
  { value: "live", label: "Live" },
];
const DISCONNECT: { value: KiteDisconnect; label: string; detail: string }[] = [
  {
    value: "keep",
    label: "Keep the holdings",
    detail:
      "Centurion stops trading now. The holdings stay in the account, and their GTT stop-losses stay at Zerodha until you delete them in Kite.",
  },
  {
    value: "next_open",
    label: "Sell at the next open",
    detail: "Tonight's session places sell orders for every position Centurion opened; they fill at the next open.",
  },
  {
    value: "sessions",
    label: "Sell over N sessions",
    detail:
      "Each session sells about 1/N of every position Centurion opened (smaller orders, less market impact); its stop-losses stay on the rest.",
  },
];
const inr = (v: number) => `₹${v.toLocaleString("en-IN")}`;

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

/** Whether Centurion trades a connected account and the ladder rung it may use (FA2); Off asks what happens to its positions (FA3). */
function ManageControls({ account, rungs }: { account: KiteAccount; rungs: number[] }) {
  const update = useUpdateKiteAccount();
  const disconnect = useDisconnectKiteAccount();
  const [asking, setAsking] = useState(false);
  const [how, setHow] = useState<KiteDisconnect>("keep");
  const [sessions, setSessions] = useState(5);
  const mode = account.mode ?? "off";
  const capital = account.capital ?? 0;
  const unwinding = account.unwind_sessions ?? 0;
  const locked = Boolean(account.trading_lock);

  const setMode = (next: KiteAccountMode) => {
    if (next === mode) return;
    if (next === "off" && (account.positions ?? 0) > 0) {
      setAsking(true); // FA3: ask each time what happens to the positions Centurion opened
      return;
    }
    if (next === "live" && !window.confirm(`Let Centurion place real orders in ${account.name}'s account with ${inr(capital)}?`)) return;
    update.mutate({ id: account.id, mode: next });
  };
  const setCapital = (value: string) => {
    const next = Number(value);
    if (mode !== "off" && !window.confirm(`Ask the ladder to move ${account.name}'s capital to ${inr(next)}?`)) return;
    update.mutate({ id: account.id, capital: next });
  };

  return (
    <div className="flex w-full flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">Centurion manages</span>
      <div className="flex gap-1">
        {MODES.map((m) => (
          <Button
            key={m.value}
            type="button"
            size="sm"
            variant={mode === m.value ? "default" : "outline"}
            disabled={update.isPending || (m.value !== "off" && (!capital || locked))}
            onClick={() => setMode(m.value)}
          >
            {m.label}
          </Button>
        ))}
      </div>
      <Select value={capital ? String(capital) : ""} onValueChange={setCapital} disabled={update.isPending}>
        <SelectTrigger className="h-8 w-36 text-xs" aria-label={`Capital for ${account.name}`}>
          <SelectValue placeholder="Choose capital" />
        </SelectTrigger>
        <SelectContent>
          {rungs.map((r) => (
            <SelectItem key={r} value={String(r)}>
              {inr(r)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {unwinding > 0 && (
        <span className="text-amber-600 dark:text-amber-400">
          Selling out · {unwinding === 1 ? "all at the next open" : `${unwinding} sessions left`}
        </span>
      )}
      {locked && (
        <span className="inline-flex w-full items-start gap-1 text-amber-600 dark:text-amber-400">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" /> Trading locked: {account.trading_lock}
        </span>
      )}
      {update.isError && <span className="text-destructive">{errorText(update.error)}</span>}

      {asking && (
        <div className="w-full space-y-2 rounded-md border bg-secondary/30 p-3">
          <p>
            Centurion holds {account.positions} position(s) in {account.name}&apos;s account. What should happen to
            them? Nothing else in the account is touched.
          </p>
          <div className="flex flex-wrap gap-1">
            {DISCONNECT.map((d) => (
              <Button
                key={d.value}
                type="button"
                size="sm"
                variant={how === d.value ? "default" : "outline"}
                onClick={() => setHow(d.value)}
              >
                {d.label}
              </Button>
            ))}
          </div>
          {how === "sessions" && (
            <div className="flex items-center gap-2">
              <Label htmlFor={`unwind-${account.id}`}>Sessions</Label>
              <Input
                id={`unwind-${account.id}`}
                type="number"
                min={2}
                max={20}
                className="h-8 w-20"
                value={sessions}
                onChange={(e) => setSessions(Number(e.target.value))}
              />
            </div>
          )}
          <p className="text-muted-foreground">{DISCONNECT.find((d) => d.value === how)?.detail}</p>
          {disconnect.isError && <p className="text-destructive">{errorText(disconnect.error)}</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={disconnect.isPending}
              onClick={() =>
                disconnect.mutate(
                  { id: account.id, how, sessions: how === "sessions" ? sessions : 0 },
                  { onSuccess: () => setAsking(false) },
                )
              }
            >
              {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** What every account needs before Centurion trades it (MU1): the same for everyone, with the terms the holder accepts. */
function Prerequisites({ setup }: { setup?: KiteAccountsResponse["setup"] }) {
  const registered = setup !== undefined && setup.registration_missing.length === 0;
  return (
    <div className="space-y-1 rounded-md border bg-secondary/30 p-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">What every account needs</p>
      <ol className="list-decimal space-y-1 pl-4">
        <li>A Zerodha trading and demat account, holding the funds Centurion may use.</li>
        <li>
          The holder&apos;s own <strong>Kite Connect</strong> app on developers.kite.trade (the paid Connect plan; the
          free Personal plan has no live prices), with redirect URL{" "}
          <code className="rounded bg-secondary px-1 break-all">{setup?.redirect_url ?? "…"}</code> and IP whitelist{" "}
          <code className="rounded bg-secondary px-1">{setup?.static_ip ?? "the static IP on your own Kite app"}</code>.
          Its API key and secret are entered here.
        </li>
        <li>A Kite login on Zerodha&apos;s page each trading day, from the emailed link (it lapses at 6 am).</li>
        <li>
          After the first login, the holder ticks the terms and clicks <strong>I agree</strong>.
        </li>
        <li>
          Centurion&apos;s exchange empanelment and SEBI registration:{" "}
          {registered ? (
            <span className="text-green-600 dark:text-green-400">in place</span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">
              not in place yet, so connected accounts are read-only
            </span>
          )}
          .
        </li>
      </ol>
      <p>Centurion keeps the app&apos;s key and secret encrypted, never a password or TOTP.</p>
      {setup && (
        <details>
          <summary className="cursor-pointer">The terms (version {setup.terms.version})</summary>
          <ol className="list-decimal space-y-1 pl-4 pt-1">
            {setup.terms.items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

/** A connected account's holdings and available funds, read with its holder's login today (an admin only). */
function AccountHoldings({ account }: { account: KiteAccount }) {
  const q = useKiteAccountHoldings(account.id);
  if (q.isLoading) return <p className="w-full text-xs text-muted-foreground">Loading holdings…</p>;
  if (q.isError) return <p className="w-full text-xs text-destructive">{errorText(q.error)}</p>;
  const rows = q.data?.holdings ?? [];
  const funds = q.data?.available_funds;
  return (
    <div className="w-full space-y-1 text-xs">
      <p className="text-muted-foreground">
        Available funds {funds != null ? inr(Math.round(funds)) : "unknown"} · {rows.length} holding(s)
      </p>
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-left font-normal">Symbol</th>
                <th className="text-right font-normal">Qty</th>
                <th className="text-right font-normal">Avg</th>
                <th className="text-right font-normal">LTP</th>
                <th className="text-right font-normal">P&amp;L</th>
                <th className="text-right font-normal">Centurion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.tradingsymbol}>
                  <td>{h.tradingsymbol}</td>
                  <td className="text-right">{h.quantity + (h.t1_quantity ?? 0)}</td>
                  <td className="text-right">{inr(h.average_price)}</td>
                  <td className="text-right">{inr(h.last_price)}</td>
                  <td className={`text-right ${h.pnl < 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                    {inr(Math.round(h.pnl))}
                  </td>
                  <td className="text-right">{h.centurion_qty || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Zerodha accounts Centurion connects (U33, MU1): yours and any user's, all on the same criteria.
 * Each holder uses their own Kite Connect app; Centurion keeps its API key and secret, never a
 * password or TOTP, the holder logs in on Zerodha's page each day and accepts the terms there.
 */
export function KiteAccountsPanel() {
  const accountsQ = useKiteAccounts();
  const add = useAddKiteAccount();
  const remove = useRemoveKiteAccount();
  const [form, setForm] = useState<NewKiteAccount>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [holdingsOf, setHoldingsOf] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const setup = accountsQ.data?.setup;
  const hasOthers = (accountsQ.data?.accounts.length ?? 0) > 1;
  const copyLink = (a: KiteAccount) =>
    navigator.clipboard.writeText(a.login_url).then(
      () => setCopied(a.id),
      () => window.prompt("Copy the login link", a.login_url),
    );
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
          <Plus className="h-4 w-4 mr-1" /> Add account
        </Button>
      </div>

      <Prerequisites setup={setup} />

      {accountsQ.isLoading && <p className="text-sm text-muted-foreground">Loading accounts…</p>}
      {accountsQ.isError && <p className="text-sm text-destructive">{errorText(accountsQ.error)}</p>}

      {accountsQ.data && (
        <div className="divide-y rounded-md border">
          {accountsQ.data.accounts.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <div className="min-w-[10rem] flex-1">
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">
                  {a.id === "primary" ? "your account" : a.consented ? "terms accepted" : "terms not accepted yet"} ·{" "}
                  {a.zerodha_user_id || "user id from the server"}
                </p>
              </div>
              <LoginState account={a} />
              <Button size="sm" onClick={() => openLogin(a.login_url)}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Log in
              </Button>
              {a.id !== "primary" && (
                <Button size="sm" variant="outline" onClick={() => copyLink(a)} title="Send this to the holder">
                  <Copy className="h-3.5 w-3.5 mr-1" /> {copied === a.id ? "Copied" : "Copy link"}
                </Button>
              )}
              {a.id !== "primary" && (
                <Button
                  size="sm"
                  variant={holdingsOf === a.id ? "default" : "outline"}
                  onClick={() => setHoldingsOf(holdingsOf === a.id ? null : a.id)}
                >
                  <Wallet className="h-3.5 w-3.5 mr-1" /> Holdings
                </Button>
              )}
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
              {holdingsOf === a.id && <AccountHoldings account={a} />}
              {a.id !== "primary" && <ManageControls account={a} rungs={setup?.rungs ?? []} />}
            </div>
          ))}
        </div>
      )}
      {hasOthers && (
        <p className="text-xs text-muted-foreground">
          <strong>Dry run</strong> builds each evening&apos;s orders from the account and sends none.{" "}
          <strong>Live</strong> places them, only while your own book is live and after the account&apos;s own go-live
          checks (clean dry runs first). Capital is a ladder rung: the first session&apos;s size, then a request the
          ladder grants one rung at a time. <strong>Off</strong> on an account Centurion holds positions in asks whether
          to keep them or sell them.
        </p>
      )}
      {remove.isError && <p className="text-sm text-destructive">{errorText(remove.error)}</p>}

      {showForm && (
        <div className="space-y-4 rounded-lg border bg-secondary/30 p-4">
          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">How to connect an account</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>The holder creates their Kite Connect app as above and shares its API key and secret.</li>
              <li>Add the account below.</li>
              <li>
                Send them the login link (<strong>Copy link</strong> on their row): they log in on Zerodha&apos;s page
                and accept the terms.
              </li>
              <li>
                Once trading is unlocked, choose the capital (start at ₹6,00,000), then <strong>Dry run</strong>.
                Switch to <strong>Live</strong> only after 5 clean dry runs.
              </li>
            </ol>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="acct-name">Name</Label>
              <Input id="acct-name" placeholder="e.g. Priya" {...field("name")} />
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
