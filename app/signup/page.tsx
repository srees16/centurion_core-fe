"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";

import { AuthCard, FormError, FormNotice, PasswordChecklist } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { passwordOk, passwordRules } from "@/lib/password-policy";

const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];
const EXPERIENCE = [
  { value: "new", label: "New to trading" },
  { value: "under_1_year", label: "Under 1 year" },
  { value: "1_to_5_years", label: "1 to 5 years" },
  { value: "over_5_years", label: "Over 5 years" },
];

/** The latest date of birth that is 18 today (the API checks the same). */
function adultBefore(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

/** Self-service sign-up (tracker MU2): the account starts pending until its emailed link is opened. */
export default function SignupPage() {
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", date_of_birth: "", gender: "", phone: "",
    city: "", state: "", country: "India", trading_experience: "",
  });
  const [confirm, setConfirm] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
  });
  const rules = passwordRules(form.password, form.email, form.full_name);
  const ready =
    form.full_name && form.email && form.date_of_birth && form.gender && form.city && form.country && consent &&
    passwordOk(form.password, form.email, form.full_name) && form.password === confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ message: string }>("/api/v1/auth/signup", { ...form, consent });
      setDone(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthCard title="Check your inbox" subtitle="One step left: activate your account">
        <FormNotice message={`${done} The link works for 24 hours.`} />
        <p className="text-sm text-center text-muted-foreground">
          Activated already? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create your Centurion account" subtitle="Connecting a Zerodha DMAT account is optional" wide>
      <FormError message={error} />
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="su-name">Full name</Label>
            <Input id="su-name" autoComplete="name" {...field("full_name")} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="su-email">Email</Label>
            <Input id="su-email" type="email" autoComplete="email" {...field("email")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="su-password">Password</Label>
            <Input id="su-password" type="password" autoComplete="new-password" {...field("password")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="su-confirm">Confirm password</Label>
            <Input id="su-confirm" type="password" autoComplete="new-password" value={confirm}
                   onChange={(e) => setConfirm(e.target.value)} />
            {confirm && confirm !== form.password && (
              <p className="text-xs text-destructive">The passwords do not match</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <PasswordChecklist rules={rules} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="su-dob">Date of birth</Label>
            <Input id="su-dob" type="date" max={adultBefore()} autoComplete="bday" {...field("date_of_birth")} />
          </div>
          <div className="space-y-1">
            <Label>Gender</Label>
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
              <SelectTrigger aria-label="Gender">
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="su-phone">Mobile number (optional)</Label>
            <Input id="su-phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" {...field("phone")} />
          </div>
          <div className="space-y-1">
            <Label>Trading experience (optional)</Label>
            <Select value={form.trading_experience} onValueChange={(v) => setForm({ ...form, trading_experience: v })}>
              <SelectTrigger aria-label="Trading experience">
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE.map((x) => (
                  <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="su-city">City</Label>
            <Input id="su-city" autoComplete="address-level2" {...field("city")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="su-state">State (optional)</Label>
            <Input id="su-state" autoComplete="address-level1" {...field("state")} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="su-country">Country</Label>
            <Input id="su-country" autoComplete="country-name" {...field("country")} />
          </div>
        </div>

        <label htmlFor="su-consent" className="flex items-start gap-2 text-sm">
          <Checkbox id="su-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
          <span>I agree that Centurion stores these details to run my account and to email me about it.</span>
        </label>

        <Button type="submit" className="w-full" disabled={!ready || busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
          Create account
        </Button>
      </form>
      <p className="text-sm text-center text-muted-foreground">
        Have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
      </p>
    </AuthCard>
  );
}
