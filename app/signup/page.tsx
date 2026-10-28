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
import { EXPERIENCE, GENDERS } from "@/lib/profile-options";
import {
  EMAIL_MAX, NAME_MAX, PLACE_MAX, cityProblem, countryProblem, emailProblem, emailSuggestion, firstNameProblem,
  lastNameProblem, phoneCheck, plain, stateProblem,
} from "@/lib/signup-validation";

/** The latest date of birth that is 18 today (the API checks the same). */
function adultBefore(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

type Field =
  | "first_name" | "last_name" | "email" | "password" | "date_of_birth" | "gender" | "phone"
  | "city" | "state" | "country" | "trading_experience";

/** Self-service sign-up (tracker MU2): the account starts pending until its emailed link is opened.
 *  Each field says what is wrong once it has been left (or the form submitted); the API checks the same. */
export default function SignupPage() {
  const [form, setForm] = useState<Record<Field, string>>({
    first_name: "", last_name: "", email: "", password: "", date_of_birth: "", gender: "", phone: "",
    city: "", state: "", country: "India", trading_experience: "",
  });
  const [confirm, setConfirm] = useState("");
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<Field | "confirm" | "consent", boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fullName = `${plain(form.first_name)} ${plain(form.last_name)}`.trim();
  const phone = phoneCheck(form.phone, form.country);
  const problems: Partial<Record<Field | "confirm" | "consent", string>> = {
    first_name: firstNameProblem(form.first_name),
    last_name: lastNameProblem(form.last_name),
    email: emailProblem(form.email),
    password: passwordOk(form.password, form.email, fullName) ? "" : "The password does not meet every rule below",
    confirm: confirm === form.password ? "" : "The passwords do not match",
    date_of_birth: form.date_of_birth ? "" : "Choose your date of birth",
    gender: form.gender ? "" : "Choose a gender option",
    phone: phone.problem,
    city: cityProblem(form.city),
    state: stateProblem(form.state),
    country: countryProblem(form.country),
    consent: consent ? "" : "Tick the box to agree, so we can create the account",
  };
  const valid = Object.values(problems).every((p) => !p);
  const suggestion = emailProblem(form.email) ? null : emailSuggestion(form.email);
  const rules = passwordRules(form.password, form.email, fullName);

  const shown = (key: Field | "confirm" | "consent") => (submitted || touched[key]) && problems[key];
  const field = (key: Field) => ({
    id: `su-${key}`,
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
    onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
    "aria-invalid": Boolean(shown(key)),
    "aria-describedby": shown(key) ? `su-${key}-error` : undefined,
  });
  const fieldError = (name: Field | "confirm" | "consent") =>
    shown(name) ? <p id={`su-${name}-error`} className="text-xs text-destructive">{problems[name]}</p> : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitted(true);
    if (!valid) {
      setError("Please correct the highlighted fields");
      return;
    }
    setBusy(true);
    try {
      const body = {
        ...form,
        first_name: plain(form.first_name), last_name: plain(form.last_name),
        full_name: fullName,                       // read by an API older than first and last names
        email: form.email.trim().toLowerCase(),
        city: plain(form.city), state: plain(form.state), country: plain(form.country),
        consent,
      };
      const res = await api.post<{ message: string }>("/api/v1/auth/signup", body);
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
        <FormNotice message={`${done} The link is active for 24 hours.`} />
        <p className="text-sm text-center text-muted-foreground">
          Activated already? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create your Centurion account" subtitle="Optional Zerodha Demat account connection" wide>
      <FormError message={error} />
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="su-first_name">First name</Label>
            <Input autoComplete="given-name" maxLength={NAME_MAX} {...field("first_name")} />
            {fieldError("first_name")}
          </div>
          <div className="space-y-1">
            <Label htmlFor="su-last_name">Last name (optional)</Label>
            <Input autoComplete="family-name" maxLength={NAME_MAX} {...field("last_name")} />
            {fieldError("last_name")}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="su-email">Email</Label>
            <Input type="email" autoComplete="email" inputMode="email" maxLength={EMAIL_MAX} {...field("email")} />
            {fieldError("email")}
            {suggestion && (
              <p className="text-xs text-muted-foreground">
                Did you mean{" "}
                <button type="button" className="text-primary hover:underline"
                        onClick={() => setForm({ ...form, email: suggestion })}>{suggestion}</button>?
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="su-password">Password</Label>
            <Input type="password" autoComplete="new-password" {...field("password")} />
            {fieldError("password")}
          </div>
          <div className="space-y-1">
            <Label htmlFor="su-confirm">Confirm password</Label>
            <Input id="su-confirm" type="password" autoComplete="new-password" value={confirm}
                   onChange={(e) => setConfirm(e.target.value)}
                   onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                   aria-invalid={Boolean(shown("confirm"))}
                   aria-describedby={shown("confirm") ? "su-confirm-error" : undefined} />
            {(confirm || submitted) && fieldError("confirm")}
          </div>
          <div className="sm:col-span-2">
            <PasswordChecklist rules={rules} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="su-date_of_birth">Date of birth</Label>
            <Input type="date" max={adultBefore()} autoComplete="bday" {...field("date_of_birth")} />
            {fieldError("date_of_birth")}
          </div>
          <div className="space-y-1">
            <Label>Gender</Label>
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
              <SelectTrigger aria-label="Gender" aria-invalid={Boolean(shown("gender"))}>
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError("gender")}
          </div>
          <div className="space-y-1">
            <Label htmlFor="su-phone">Mobile number (optional)</Label>
            <Input type="tel" autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" {...field("phone")} />
            {fieldError("phone")}
            {!phone.problem && phone.value && plain(form.phone) !== phone.value && (
              <p className="text-xs text-muted-foreground">Saved as {phone.value}</p>
            )}
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
            <Input autoComplete="address-level2" maxLength={PLACE_MAX} {...field("city")} />
            {fieldError("city")}
          </div>
          <div className="space-y-1">
            <Label htmlFor="su-state">State (optional)</Label>
            <Input autoComplete="address-level1" maxLength={PLACE_MAX} {...field("state")} />
            {fieldError("state")}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="su-country">Country</Label>
            <Input autoComplete="country-name" maxLength={PLACE_MAX} {...field("country")} />
            {fieldError("country")}
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="su-consent" className="flex items-start gap-2 text-sm">
            <Checkbox id="su-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
            <span>I agree that Centurion stores these details to run my account and to email me about it.</span>
          </label>
          {fieldError("consent")}
        </div>

        <Button type="submit" className="w-full" disabled={busy}>
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
