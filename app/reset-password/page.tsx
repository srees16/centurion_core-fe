"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";

import { AuthCard, FormError, FormNotice, PasswordChecklist } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { passwordOk, passwordRules } from "@/lib/password-policy";

/** Sets a new password from the emailed reset link (tracker MU2); every existing session ends. */
function ResetPassword() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/api/v1/auth/reset-password", { token, new_password: password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthCard title="Password changed">
        <FormNotice message="Sign in with your new password. Any other signed-in sessions have ended." />
        <Button asChild className="w-full">
          <Link href="/login">Sign in</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password">
      <FormError message={token ? error : "This link has no reset code: open the link from the email again"} />
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rp-password">New password</Label>
          <Input id="rp-password" type="password" autoComplete="new-password" autoFocus value={password}
                 onChange={(e) => setPassword(e.target.value)} />
          <PasswordChecklist rules={passwordRules(password)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rp-confirm">Confirm new password</Label>
          <Input id="rp-confirm" type="password" autoComplete="new-password" value={confirm}
                 onChange={(e) => setConfirm(e.target.value)} />
          {confirm && confirm !== password && <p className="text-xs text-destructive">The passwords do not match</p>}
        </div>
        <Button type="submit" className="w-full" disabled={!token || !passwordOk(password) || password !== confirm || busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
          Set new password
        </Button>
      </form>
      <p className="text-sm text-center text-muted-foreground">
        Link expired? <Link href="/forgot-password" className="text-primary hover:underline">Request a new one</Link>
      </p>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPassword />
    </Suspense>
  );
}
