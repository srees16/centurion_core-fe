"use client";

import { useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Ellipsis,
  ExternalLink,
  FileCheck,
  KeyRound,
  Landmark,
  Link2,
  Loader2,
  Lock,
  LogIn,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/hooks/use-auth";
import {
  useAddKiteAccount,
  useDisconnectKiteAccount,
  useKiteAccountHoldings,
  useKiteAccounts,
  useRemoveKiteAccount,
  useUpdateKiteAccount,
} from "@/hooks/use-kite";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { KiteAccount, KiteAccountMode, KiteAccountsResponse, KiteDisconnect, NewKiteAccount } from "@/lib/types";

type Setup = KiteAccountsResponse["setup"];

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
    detail: "Trading stops now. Holdings stay; their GTT stop-losses stay at Zerodha until deleted in Kite.",
  },
  {
    value: "next_open",
    label: "Sell at the next open",
    detail: "Tonight's session places sell orders for every position Centurion opened.",
  },
  {
    value: "sessions",
    label: "Sell over N sessions",
    detail: "Each session sells about 1/N of each position; stop-losses stay on the rest.",
  },
];
const KITE_DEVELOPERS = "https://developers.kite.trade";
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

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

function Chip({ tone, icon: Icon, children }: {
  tone: "ok" | "wait" | "muted";
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  const tones = {
    ok: "bg-green-500/10 text-green-700 dark:text-green-400",
    wait: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>
      {Icon && <Icon className="h-3 w-3" />} {children}
    </span>
  );
}

/** A value to paste elsewhere (the redirect URL, the static IP), with a copy button that confirms. */
function CopyValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => window.prompt(`Copy the ${label.toLowerCase()}`, value),
    );
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background/60 px-2 py-1.5">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 break-all text-xs">{value}</code>
      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={copy} aria-label={`Copy ${label}`}>
        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

/** A yes/no question in the same dialog style as the rest of the panel (no browser pop-ups). */
interface Ask {
  title: string;
  description: string;
  confirm: string;
  destructive?: boolean;
  onConfirm: () => void;
}

function ConfirmDialog({ ask, onClose }: { ask: Ask | null; onClose: () => void }) {
  return (
    <Dialog open={ask !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{ask?.title}</DialogTitle>
          <DialogDescription>{ask?.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant={ask?.destructive ? "destructive" : "default"}
            onClick={() => {
              ask?.onConfirm();
              onClose();
            }}
          >
            {ask?.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The terms each holder accepts after their first Kite login (MU1). */
function TermsDialog({ setup }: { setup: Setup }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="text-xs font-medium text-primary hover:underline">View terms</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Terms each holder accepts</DialogTitle>
          <DialogDescription>Version {setup.terms.version}, shown after the first Kite login.</DialogDescription>
        </DialogHeader>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {setup.terms.items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}

/** What every account needs (MU1), at a glance; the setup details live in the add dialog. */
function Requirements({ setup }: { setup?: Setup }) {
  const registered = setup !== undefined && setup.registration_missing.length === 0;
  const items = [
    { icon: Landmark, text: "Zerodha account with funds" },
    { icon: KeyRound, text: "Own Kite Connect app" },
    { icon: LogIn, text: "Kite login each trading day" },
    { icon: FileCheck, text: "Terms accepted once" },
  ];
  return (
    <div className="rounded-lg border bg-secondary/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Every account needs</p>
        {setup && <TermsDialog setup={setup} />}
      </div>
      <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
        {items.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 shrink-0 text-primary" /> {text}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip tone="ok" icon={CheckCircle2}>Dry run open</Chip>
        {registered ? (
          <Chip tone="ok" icon={CheckCircle2}>Live open</Chip>
        ) : (
          <Chip tone="wait" icon={Lock}>Live needs Centurion&apos;s registration</Chip>
        )}
      </div>
    </div>
  );
}

/** Add an account (a signed-up user: connect their own) in a dialog: the app's setup values, then its details. */
function AddAccountDialog({ setup, isUser, open, onOpenChange }: {
  setup?: Setup;
  isUser: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const add = useAddKiteAccount();
  const [form, setForm] = useState<NewKiteAccount>(EMPTY);

  const changeOpen = (next: boolean) => {
    if (next) {
      setForm(isUser && user ? { ...EMPTY, name: user.name, email: user.username } : EMPTY);
      add.reset();
    }
    onOpenChange(next);
  };
  const field = (key: keyof NewKiteAccount) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
  });
  const ready = form.name && form.zerodha_user_id && form.api_key && form.api_secret;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    add.mutate(form, {
      onSuccess: (acct) => {
        onOpenChange(false);
        toast({
          title: isUser ? "Zerodha account connected" : `${acct.name} added`,
          description: isUser
            ? "Next: click Log in, then accept the terms on the page Zerodha returns you to."
            : "Next: send the holder the login link (menu ⋯ › Copy login link); they log in and accept the terms.",
          variant: "success",
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" /> {isUser ? "Connect Zerodha" : "Add account"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isUser ? "Connect your Zerodha account" : "Add a Zerodha account"}</DialogTitle>
          <DialogDescription>Takes about five minutes on developers.kite.trade.</DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <p className="text-sm font-medium">1. Create a Kite Connect app</p>
          <p className="text-xs text-muted-foreground">
            On{" "}
            <a href={KITE_DEVELOPERS} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              developers.kite.trade <ExternalLink className="inline h-3 w-3" />
            </a>
            , choose the <strong>Connect</strong> plan and paste:
          </p>
          {setup && <CopyValue label="Redirect URL" value={setup.redirect_url} />}
          {setup?.static_ip && <CopyValue label="IP whitelist" value={setup.static_ip} />}
        </section>

        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm font-medium">2. Enter the app&apos;s details</p>
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
              <Label htmlFor="acct-key">API key</Label>
              <Input id="acct-key" autoComplete="off" {...field("api_key")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="acct-secret">API secret</Label>
              <Input id="acct-secret" type="password" autoComplete="new-password" {...field("api_secret")} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="acct-email">Email for daily login links <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="acct-email" type="email" placeholder="name@example.com" {...field("email")} />
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-green-600" />
            Key and secret are stored encrypted. Centurion never asks for a password or TOTP.
          </p>
          {add.isError && <p className="text-sm text-destructive">{errorText(add.error)}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!ready || add.isPending}>
              {add.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUser ? "Connect" : "Add account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** FA3: Off on an account Centurion holds positions in asks, each time, what happens to them. */
function DisconnectDialog({ account, open, onOpenChange }: {
  account: KiteAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const disconnect = useDisconnectKiteAccount();
  const [how, setHow] = useState<KiteDisconnect>("keep");
  const [sessions, setSessions] = useState(5);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stop managing {account.name}&apos;s account?</DialogTitle>
          <DialogDescription>
            Centurion holds {account.positions} position(s) it opened there. Nothing else in the account is touched.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {DISCONNECT.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setHow(d.value)}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition-colors",
                how === d.value ? "border-primary bg-primary/5" : "hover:bg-secondary/40",
              )}
            >
              <p className="text-sm font-medium">{d.label}</p>
              <p className="text-xs text-muted-foreground">{d.detail}</p>
            </button>
          ))}
          {how === "sessions" && (
            <div className="flex items-center gap-2 pt-1 animate-in fade-in-0 slide-in-from-top-1">
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
        </div>
        {disconnect.isError && <p className="text-sm text-destructive">{errorText(disconnect.error)}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={disconnect.isPending}
            onClick={() =>
              disconnect.mutate(
                { id: account.id, how, sessions: how === "sessions" ? sessions : 0 },
                { onSuccess: () => onOpenChange(false) },
              )
            }
          >
            {disconnect.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Disconnect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Whether Centurion trades a connected account and the ladder rung it may use (FA2); Off may ask (FA3). */
function ManageControls({ account, rungs, isUser, onAsk }: {
  account: KiteAccount;
  rungs: number[];
  isUser: boolean;
  onAsk: (ask: Ask) => void;
}) {
  const update = useUpdateKiteAccount();
  const [disconnecting, setDisconnecting] = useState(false);
  const mode = account.mode ?? "off";
  const capital = account.capital ?? 0;
  const unwinding = account.unwind_sessions ?? 0;
  // U35: a dry run needs the holder's terms; live orders also Centurion's registration
  const lockNote = account.locks.dry_run
    ? isUser
      ? "Accept the terms after your next Kite login to start dry runs."
      : "Waiting for the holder to accept the terms after their Kite login."
    : account.locks.live
      ? "Live needs Centurion's registration."
      : "";

  const setMode = (next: KiteAccountMode) => {
    if (next === mode) return;
    if (next === "off" && (account.positions ?? 0) > 0) {
      setDisconnecting(true);
      return;
    }
    if (next === "live") {
      onAsk({
        title: "Go live?",
        description: `Centurion will place real orders in ${account.name}'s account with ${inr(capital)}.`,
        confirm: "Go live",
        onConfirm: () => update.mutate({ id: account.id, mode: next }),
      });
      return;
    }
    update.mutate({ id: account.id, mode: next });
  };
  const setCapital = (value: string) => {
    const next = Number(value);
    if (mode === "off") {
      update.mutate({ id: account.id, capital: next });
      return;
    }
    onAsk({
      title: "Change the capital?",
      description: `The ladder moves ${account.name}'s capital toward ${inr(next)} one rung at a time.`,
      confirm: "Change",
      onConfirm: () => update.mutate({ id: account.id, capital: next }),
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-secondary/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Mode</span>
          <div className="inline-flex rounded-md border bg-background p-0.5" role="radiogroup" aria-label="Mode">
            {MODES.map((m) => {
              const locked = m.value !== "off" && (!capital || Boolean(account.locks[m.value]));
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.value}
                  disabled={update.isPending || locked}
                  title={locked ? (!capital ? "Choose the capital first" : lockNote) : undefined}
                  onClick={() => setMode(m.value)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    mode === m.value ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-secondary",
                  )}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Capital</span>
          <Select value={capital ? String(capital) : ""} onValueChange={setCapital} disabled={update.isPending}>
            <SelectTrigger className="h-8 w-32 text-xs" aria-label={`Capital for ${account.name}`}>
              <SelectValue placeholder="Choose" />
            </SelectTrigger>
            <SelectContent>
              {rungs.map((r) => (
                <SelectItem key={r} value={String(r)}>
                  {inr(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {unwinding > 0 && (
          <Chip tone="wait" icon={Clock}>
            Selling out · {unwinding === 1 ? "at the next open" : `${unwinding} sessions left`}
          </Chip>
        )}
      </div>
      {lockNote && (
        <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <Lock className="h-3 w-3 shrink-0" /> {lockNote}
        </p>
      )}
      {update.isError && <p className="text-xs text-destructive">{errorText(update.error)}</p>}
      <DisconnectDialog account={account} open={disconnecting} onOpenChange={setDisconnecting} />
    </div>
  );
}

/** A connected account's holdings and available funds, read with its holder's login today. */
function AccountHoldings({ account }: { account: KiteAccount }) {
  const q = useKiteAccountHoldings(account.id);
  if (q.isLoading) return <Skeleton className="h-16 w-full" />;
  if (q.isError) return <p className="text-xs text-destructive">{errorText(q.error)}</p>;
  const rows = q.data?.holdings ?? [];
  const funds = q.data?.available_funds;
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <span>
          <span className="text-muted-foreground">Available funds </span>
          <span className="font-medium tabular-nums">{funds != null ? inr(Math.round(funds)) : "–"}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Holdings </span>
          <span className="font-medium tabular-nums">{rows.length}</span>
        </span>
      </div>
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="py-1 text-left font-normal">Symbol</th>
                <th className="py-1 text-right font-normal">Qty</th>
                <th className="py-1 text-right font-normal">Avg</th>
                <th className="py-1 text-right font-normal">LTP</th>
                <th className="py-1 text-right font-normal">P&amp;L</th>
                <th className="py-1 text-right font-normal">Centurion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.tradingsymbol} className="border-b border-border/40 last:border-0">
                  <td className="py-1">{h.tradingsymbol}</td>
                  <td className="py-1 text-right">{h.quantity + (h.t1_quantity ?? 0)}</td>
                  <td className="py-1 text-right">{inr(h.average_price)}</td>
                  <td className="py-1 text-right">{inr(h.last_price)}</td>
                  <td className={cn("py-1 text-right", h.pnl < 0 ? "text-destructive" : "text-green-600 dark:text-green-400")}>
                    {inr(Math.round(h.pnl))}
                  </td>
                  <td className="py-1 text-right">{h.centurion_qty || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AccountRow({ account: a, setup, isUser, onAsk }: {
  account: KiteAccount;
  setup?: Setup;
  isUser: boolean;
  onAsk: (ask: Ask) => void;
}) {
  const remove = useRemoveKiteAccount();
  const [showHoldings, setShowHoldings] = useState(false);
  const at = a.login_at ? new Date(a.login_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";
  const copyLink = () =>
    navigator.clipboard.writeText(a.login_url).then(
      () => toast({ title: "Login link copied", description: `Send it to ${a.name}.` }),
      () => window.prompt("Copy the login link", a.login_url),
    );

  return (
    <div className="space-y-3 rounded-lg border p-4 transition-colors hover:border-primary/30">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials(a.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <p className="truncate font-medium">{a.name}</p>
            <span className="font-mono text-xs text-muted-foreground">{a.zerodha_user_id}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {a.logged_in_today ? (
              <Chip tone="ok" icon={CheckCircle2}>Logged in {at}</Chip>
            ) : (
              <Chip tone="muted" icon={Clock}>Not logged in today</Chip>
            )}
            {a.consented ? (
              <Chip tone="ok" icon={FileCheck}>Terms accepted</Chip>
            ) : (
              <Chip tone="wait" icon={FileCheck}>Terms pending</Chip>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" variant={a.logged_in_today ? "outline" : "default"} onClick={() => openLogin(a.login_url)}>
            <LogIn className="mr-1 h-3.5 w-3.5" /> Log in
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`More for ${a.name}`}>
                <Ellipsis className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isUser && (
                <DropdownMenuItem onSelect={copyLink}>
                  <Link2 className="mr-2 h-3.5 w-3.5" /> Copy login link
                </DropdownMenuItem>
              )}
              {!isUser && <DropdownMenuSeparator />}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={remove.isPending}
                onSelect={() =>
                  onAsk({
                    title: `Remove ${a.name}?`,
                    description: "Only an account that has never traded can be removed; one that has is disconnected instead.",
                    confirm: "Remove",
                    destructive: true,
                    onConfirm: () =>
                      remove.mutate(a.id, {
                        onError: (err) => toast({ title: "Not removed", description: errorText(err), variant: "destructive" }),
                      }),
                  })
                }
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ManageControls account={a} rungs={setup?.rungs ?? []} isUser={isUser} onAsk={onAsk} />
      <button
        type="button"
        onClick={() => setShowHoldings((v) => !v)}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <Wallet className="h-3.5 w-3.5" /> {showHoldings ? "Hide holdings" : "Holdings & funds"}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", showHoldings && "rotate-180")} />
      </button>
      {showHoldings && (
        <div className="animate-in fade-in-0 slide-in-from-top-1 duration-200">
          <AccountHoldings account={a} />
        </div>
      )}
    </div>
  );
}

/**
 * Zerodha accounts Centurion connects (U33, MU1) other than yours, all on the same criteria; your own
 * account is the Fly Kite dashboard above, so it is not listed here.  Each holder uses their own Kite
 * Connect app; Centurion keeps its API key and secret, never a password or TOTP, the holder logs in on
 * Zerodha's page each day and accepts the terms there.  With nobody else's account connected the panel
 * is one line with Add account.  A signed-up user (MU2) sees only their own account and may connect one.
 */
export function KiteAccountsPanel() {
  const accountsQ = useKiteAccounts();
  const [adding, setAdding] = useState(false);
  const [ask, setAsk] = useState<Ask | null>(null);

  const role = useAuthStore((s) => s.user?.role);
  const isUser = role === "user";
  const setup = accountsQ.data?.setup;
  const others = (accountsQ.data?.accounts ?? []).filter((a) => a.id !== "primary");
  const canAdd = role === "admin" || (isUser && accountsQ.isSuccess && others.length === 0);
  const addButton = canAdd && (
    <AddAccountDialog setup={setup} isUser={isUser} open={adding} onOpenChange={setAdding} />
  );

  if (!isUser && others.length === 0) {
    return (
      <div className="content-panel mx-auto flex max-w-2xl items-center justify-between gap-3 px-6 py-3">
        <p className="flex min-w-0 items-center gap-2 text-sm">
          <Users className="h-4 w-4 shrink-0" /> Other Zerodha accounts:
          <span className="truncate text-muted-foreground">
            {accountsQ.isLoading ? "loading…" : accountsQ.isError ? errorText(accountsQ.error) : "none connected"}
          </span>
        </p>
        {addButton}
      </div>
    );
  }

  return (
    <div className="content-panel mx-auto max-w-2xl space-y-5 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Users className="h-4 w-4" /> {isUser ? "Your Zerodha account" : "Other Zerodha accounts"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isUser ? "Optional. Everything else in Centurion works without it." : "Accounts Centurion reads and manages besides yours."}
          </p>
        </div>
        {addButton}
      </div>

      <Requirements setup={setup} />

      {accountsQ.isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}
      {accountsQ.isError && <p className="text-sm text-destructive">{errorText(accountsQ.error)}</p>}

      {isUser && accountsQ.isSuccess && others.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
          <Link2 className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium">No Zerodha account connected</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Connect yours to see its holdings here and run Centurion&apos;s strategies on it as dry runs.
          </p>
        </div>
      )}

      {others.length > 0 && (
        <div className="space-y-3">
          {others.map((a) => (
            <AccountRow key={a.id} account={a} setup={setup} isUser={isUser} onAsk={setAsk} />
          ))}
        </div>
      )}

      {others.length > 0 && (
        <p className="text-xs text-muted-foreground">
          <strong>Dry run</strong> builds each evening&apos;s orders and sends none. <strong>Live</strong> sends them,
          after 5 clean dry runs. Capital moves up the ladder one rung at a time.
        </p>
      )}

      <ConfirmDialog ask={ask} onClose={() => setAsk(null)} />
    </div>
  );
}
