"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { AuthCard, FormError, FormNotice } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

/** The weekly newsletter's "stop" link (tracker NL1): asks first, so a mail scanner that opens the link stops
 *  nothing, then posts the signed ticket. */
function Unsubscribe() {
  const token = useSearchParams().get("token") ?? "";
  const [error, setError] = useState<string | null>(token ? null : "This link has no code: open it from the email again");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const stop = async () => {
    setError(null);
    setBusy(true);
    try {
      await api.post("/api/v1/auth/newsletter/unsubscribe", { token });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not stop the newsletter");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthCard title="Newsletter stopped">
        <FormNotice message="You will not receive the weekly newsletter any more. Turn it back on in Settings." />
        <p className="text-sm text-center text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Stop the weekly newsletter?" subtitle="Your account stays as it is">
      <FormError message={error} />
      <Button className="w-full" disabled={!token || busy} onClick={stop}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Stop the newsletter
      </Button>
      <p className="text-sm text-center text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">Back to sign in</Link>
      </p>
    </AuthCard>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <Unsubscribe />
    </Suspense>
  );
}
