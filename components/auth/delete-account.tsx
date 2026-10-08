"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";

const CONFIRM_WORD = "DELETE";

/** A signed-up user deletes their own account (tracker MU2): password and a typed word, then sign-out. */
export function DeleteAccountSection() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [word, setWord] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const changeOpen = (next: boolean) => {
    if (next) {
      setPassword("");
      setWord("");
      setError(null);
    }
    setOpen(next);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/api/v1/auth/delete-account", { password });
      setOpen(false);
      await logout();
      toast({ title: "Account deleted", description: "Your details have been erased. A confirmation is on its way." });
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="content-panel space-y-3 border border-destructive/30 p-6">
      <div className="flex items-center gap-2">
        <Trash2 className="h-5 w-5 text-destructive" />
        <h2 className="text-lg font-semibold">Delete account</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Erases your details and Centurion&apos;s records of any Zerodha account you connected. Your holdings stay in your
        Zerodha account. This cannot be undone.
      </p>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive">Delete my account</Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              Your details and Centurion&apos;s records of your Zerodha account are erased, and you are signed out.
              Stop-loss orders Centurion placed stay at Zerodha until you delete them in Kite.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="del-password">Password</Label>
              <Input id="del-password" type="password" autoComplete="current-password" value={password}
                     onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="del-word">Type {CONFIRM_WORD} to confirm</Label>
              <Input id="del-word" autoComplete="off" value={word} onChange={(e) => setWord(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={!password || word !== CONFIRM_WORD || busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
