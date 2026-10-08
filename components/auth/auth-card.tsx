"use client";

import { AlertCircle, CheckCircle2, Circle } from "lucide-react";

import type { PasswordRule } from "@/lib/password-policy";

/** The signed-out pages' frame (sign-up, activation, password reset), styled as the login page. */
export function AuthCard({ title, subtitle, wide, children }: {
  title: string;
  subtitle?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center app-background px-4 py-8">
      <div className={`w-full ${wide ? "max-w-xl" : "max-w-sm"} mx-auto`}>
        <div className="content-panel p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
      <AlertCircle className="h-4 w-4 shrink-0" /> {message}
    </div>
  );
}

export function FormNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400 bg-green-500/10 rounded-md p-3">
      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> {message}
    </div>
  );
}

/** The password policy as a live checklist. */
export function PasswordChecklist({ rules }: { rules: PasswordRule[] }) {
  return (
    <ul className="space-y-0.5 text-xs">
      {rules.map((r) => (
        <li key={r.label} className={`flex items-center gap-1.5 ${r.ok ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
          {r.ok ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />} {r.label}
        </li>
      ))}
    </ul>
  );
}
