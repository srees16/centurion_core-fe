"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api-client";

/** A signed-up user turns the weekly newsletter on or off (tracker NL1): every Saturday, the paper portfolio's week
 *  in figures, sent to the email they signed up with. */
export function NewsletterSection() {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ subscribed: boolean }>("/api/v1/auth/newsletter")
      .then((res) => setSubscribed(res.subscribed))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not read your choice"));
  }, []);

  const change = async (next: boolean) => {
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ subscribed: boolean }>("/api/v1/auth/newsletter", { subscribed: next });
      setSubscribed(res.subscribed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your choice");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="content-panel p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Weekly newsletter</h2>
      </div>
      <div className="flex items-center gap-3">
        <Label htmlFor="newsletter-switch" className="flex-1 text-sm font-normal text-muted-foreground">
          Every Saturday, the paper portfolio&apos;s week in figures, sent to the email you signed up with.
        </Label>
        <Switch id="newsletter-switch" checked={subscribed === true} disabled={subscribed === null || busy}
                onCheckedChange={change} aria-label="Weekly newsletter" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
