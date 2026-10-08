"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { AuthCard, FormError, FormNotice } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";

/** Opens the emailed activation link (tracker MU2): activates the account, then offers sign-in. */
function Activate() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"working" | "done" | "failed">("working");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [resent, setResent] = useState<string | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return; // once, even in development's double effects
    sent.current = true;
    if (!token) {
      setError("This link has no activation code: open the link from the email again");
      setState("failed");
      return;
    }
    api
      .post<{ email: string }>("/api/v1/auth/activate", { token })
      .then(() => setState("done"))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Activation failed");
        setState("failed");
      });
  }, [token]);

  const resend = async () => {
    setError(null);
    try {
      const res = await api.post<{ message: string }>("/api/v1/auth/resend-activation", { email });
      setResent(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the email");
    }
  };

  if (state === "working") {
    return (
      <AuthCard title="Activating your account">
        <div className="flex justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </AuthCard>
    );
  }
  if (state === "done") {
    return (
      <AuthCard title="Your account is active">
        <FormNotice message="You can sign in now with your email and password." />
        <Button asChild className="w-full">
          <Link href="/login">Sign in</Link>
        </Button>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Activation failed">
      <FormError message={error} />
      {resent ? (
        <FormNotice message={resent} />
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Send a new activation link:</p>
          <Input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button className="w-full" variant="outline" disabled={!email} onClick={resend}>
            Resend activation email
          </Button>
        </div>
      )}
      <p className="text-sm text-center text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">Back to sign in</Link>
      </p>
    </AuthCard>
  );
}

export default function ActivatePage() {
  return (
    <Suspense>
      <Activate />
    </Suspense>
  );
}
