"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/hooks/use-auth";
import { useTheme } from "next-themes";
import { useCarverConfig, useUpdateCarverConfig } from "@/hooks/use-config";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/common/spinner";
import {
  AlertCircle, Check, KeyRound, Moon, Palette, Sun, User,
  Settings2, Shield, TrendingUp, DollarSign,
} from "lucide-react";

function ConfigField({
  label, description, value, onChange, type = "number", min, max, step,
}: {
  label: string; description?: string; value: number | string;
  onChange: (v: number | string) => void; type?: string;
  min?: number; max?: number; step?: number;
}) {
  return (
    <div className="grid grid-cols-2 items-center gap-4">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Input
        type={type}
        className="h-8 text-sm"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
      />
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  // Carver config state
  const configQ = useCarverConfig();
  const updateMut = useUpdateCarverConfig();
  const [configDraft, setConfigDraft] = useState<Record<string, number | string>>({});
  const [configSaved, setConfigSaved] = useState(false);

  // Sync draft with fetched config
  useEffect(() => {
    if (configQ.data) {
      setConfigDraft({
        annual_vol_target: configQ.data.annual_vol_target,
        initial_capital: configQ.data.initial_capital,
        default_idm: configQ.data.default_idm,
        max_leverage: configQ.data.max_leverage,
        inertia_threshold: configQ.data.inertia_threshold,
        trade_horizon: configQ.data.trade_horizon,
        dd_warning: configQ.data.dd_warning,
        dd_critical: configQ.data.dd_critical,
        dd_halt: configQ.data.dd_halt,
        max_open_trades: configQ.data.max_open_trades,
        vix_caution_threshold: configQ.data.vix_caution_threshold,
        vix_panic_threshold: configQ.data.vix_panic_threshold,
      });
    }
  }, [configQ.data]);

  const updateDraft = (key: string, value: number | string) => {
    setConfigDraft((prev) => ({ ...prev, [key]: value }));
    setConfigSaved(false);
  };

  const handleSaveConfig = async () => {
    setConfigSaved(false);
    updateMut.mutate(configDraft as Record<string, never>, {
      onSuccess: () => setConfigSaved(true),
    });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(false);

    if (newPassword.length < 6) {
      setPwdError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match");
      return;
    }

    setPwdSubmitting(true);
    try {
      await api.post("/api/v1/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPwdSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPwdSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and application preferences
        </p>
      </div>

      {/* ── Profile Card ─────────────────────────────────── */}
      <section className="content-panel p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Profile</h2>
        </div>
        {user && (
          <div>
            <Label className="text-muted-foreground text-xs">Username</Label>
            <p className="text-sm font-medium mt-0.5">@{user.username}</p>
          </div>
        )}
      </section>

      {/* ── Appearance ────────────────────────────────────── */}
      <section className="content-panel p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Appearance</h2>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-sm flex-1">Theme</Label>
          <div className="flex gap-1 rounded-lg border p-1">
            <button
              onClick={() => setTheme("light")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                theme === "light"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-muted-foreground"
              }`}
            >
              <Sun className="h-4 w-4" /> Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                theme === "dark"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-muted-foreground"
              }`}
            >
              <Moon className="h-4 w-4" /> Dark
            </button>
            <button
              onClick={() => setTheme("system")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                theme === "system"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-muted-foreground"
              }`}
            >
              System
            </button>
          </div>
        </div>
      </section>

      {/* ── Change Password ───────────────────────────────── */}
      <section className="content-panel p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Change Password</h2>
        </div>

        {pwdSuccess && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-md p-3">
            <Check className="h-4 w-4 shrink-0" /> Password changed successfully
          </div>
        )}
        {pwdError && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
            <AlertCircle className="h-4 w-4 shrink-0" /> {pwdError}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button
            type="submit"
            disabled={pwdSubmitting || !currentPassword || !newPassword || !confirmPassword}
          >
            {pwdSubmitting ? "Changing…" : "Change Password"}
          </Button>
        </form>
      </section>

      {/* ── Carver Framework Config ───────────────────────── */}
      <section className="content-panel p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Carver Framework</h2>
          <span className="text-xs text-muted-foreground ml-auto">Session-only (not persisted to disk)</span>
        </div>

        {configQ.isLoading && <Spinner />}
        {configQ.data && (
          <div className="space-y-6">
            {/* Position Sizing */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Position Sizing</h3>
              </div>
              <div className="space-y-3">
                <ConfigField label="Annual Vol Target" description="Target portfolio volatility (0.05–1.5)" value={configDraft.annual_vol_target ?? ""} onChange={(v) => updateDraft("annual_vol_target", v)} min={0.05} max={1.5} step={0.05} />
                <ConfigField label="Max Leverage" description="Maximum allowed leverage (1×–10×)" value={configDraft.max_leverage ?? ""} onChange={(v) => updateDraft("max_leverage", v)} min={1} max={10} step={0.5} />
                <ConfigField label="IDM" description="Instrument Diversification Multiplier (1.0–5.0)" value={configDraft.default_idm ?? ""} onChange={(v) => updateDraft("default_idm", v)} min={1} max={5} step={0.1} />
                <ConfigField label="Inertia Threshold" description="Min position change to trigger rebalance (0–0.5)" value={configDraft.inertia_threshold ?? ""} onChange={(v) => updateDraft("inertia_threshold", v)} min={0} max={0.5} step={0.05} />
                <ConfigField label="Max Open Trades" description="Maximum concurrent positions (1–100)" value={configDraft.max_open_trades ?? ""} onChange={(v) => updateDraft("max_open_trades", v)} min={1} max={100} step={1} />
              </div>
            </div>

            {/* Capital */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Capital & Horizon</h3>
              </div>
              <div className="space-y-3">
                <ConfigField label="Initial Capital (₹)" description="Starting portfolio value" value={configDraft.initial_capital ?? ""} onChange={(v) => updateDraft("initial_capital", v)} min={10000} max={100000000} step={100000} />
                <ConfigField label="Trade Horizon" description='&quot;swing&quot; or &quot;positional&quot;' value={configDraft.trade_horizon ?? ""} onChange={(v) => updateDraft("trade_horizon", v)} type="text" />
              </div>
            </div>

            {/* Risk Management */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Risk Management</h3>
              </div>
              <div className="space-y-3">
                <ConfigField label="DD Warning" description="Drawdown % to begin scale-down (0.05–0.5)" value={configDraft.dd_warning ?? ""} onChange={(v) => updateDraft("dd_warning", v)} min={0.05} max={0.5} step={0.05} />
                <ConfigField label="DD Critical" description="Drawdown % for aggressive scale-down (0.10–0.6)" value={configDraft.dd_critical ?? ""} onChange={(v) => updateDraft("dd_critical", v)} min={0.1} max={0.6} step={0.05} />
                <ConfigField label="DD Halt" description="Drawdown % to halt all new trades (0.15–0.8)" value={configDraft.dd_halt ?? ""} onChange={(v) => updateDraft("dd_halt", v)} min={0.15} max={0.8} step={0.05} />
                <ConfigField label="VIX Caution" description="India VIX level to reduce position sizes" value={configDraft.vix_caution_threshold ?? ""} onChange={(v) => updateDraft("vix_caution_threshold", v)} min={10} max={50} step={1} />
                <ConfigField label="VIX Panic" description="India VIX level to suppress all BUY signals" value={configDraft.vix_panic_threshold ?? ""} onChange={(v) => updateDraft("vix_panic_threshold", v)} min={20} max={80} step={1} />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSaveConfig} disabled={updateMut.isPending}>
                {updateMut.isPending ? "Saving…" : "Apply Changes"}
              </Button>
              {configSaved && (
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <Check className="h-4 w-4" /> Applied
                </span>
              )}
              {updateMut.data?.errors && updateMut.data.errors.length > 0 && (
                <span className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" /> {updateMut.data.errors.join("; ")}
                </span>
              )}
            </div>

            {/* Read-only info */}
            {configQ.data && (
              <div className="rounded border p-3 text-xs text-muted-foreground space-y-1 mt-2">
                <p><strong>Carver Enabled:</strong> {configQ.data.carver_enabled ? "Yes" : "No"}</p>
                <p><strong>NSE Universe:</strong> {configQ.data.nse_universe_tier}</p>
                <p><strong>US Enabled:</strong> {configQ.data.us_enabled ? "Yes" : "No"} | Vol: {(configQ.data.us_vol_target * 100).toFixed(0)}% | Lev: {configQ.data.us_max_leverage}×</p>
                <p><strong>Vince Insurance:</strong> IND {(configQ.data.vince_insurance_pct_ind * 100).toFixed(0)}% | US {(configQ.data.vince_insurance_pct_us * 100).toFixed(0)}%</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
