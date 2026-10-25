import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";

export const metadata = { title: "Privacy policy · Centurion" };

/** The public privacy policy (tracker MU2): Google publishes the account emails' OAuth app only with one. */
export default function PrivacyPage() {
  return (
    <AuthCard title="Privacy policy" subtitle="Last updated 25 October 2026" wide>
      <div className="space-y-5 text-sm text-muted-foreground">
        <section className="space-y-2">
          <h2 className="font-semibold text-foreground">What Centurion stores</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Your account: your email, your password as a one-way hash only, and the profile details you enter at
              sign-up (name, date of birth, gender, mobile, city, state, country, trading experience), which are stored
              encrypted.
            </li>
            <li>
              If you connect a Zerodha account: your Kite Connect app&apos;s API key and secret and each day&apos;s access
              token, stored encrypted, and the records of the orders Centurion builds for that account. Centurion never
              asks for or stores your Zerodha password or TOTP: you log in on Zerodha&apos;s own page.
            </li>
            <li>A sign-in cookie that keeps you signed in.</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="font-semibold text-foreground">How it is used</h2>
          <p>
            Only to run your account and the features you use, and to send your account emails: activation, password
            reset and, if you connect Zerodha, the daily Kite login reminder. Your data is not sold, shared for
            marketing or used for advertising.
          </p>
          <p>
            The emails go out through Google&apos;s Gmail API with permission to send email only; Centurion cannot read
            any mailbox.
          </p>
          <p>Centurion&apos;s operator can see your account details, never your password, to run the service.</p>
        </section>
        <section className="space-y-2">
          <h2 className="font-semibold text-foreground">Where it is kept</h2>
          <p>
            Neon (database), Hugging Face (server), Vercel (this website), Google (email), Sentry (error reports, which
            may include technical details of a failed request) and, only if you connect it, Zerodha.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-semibold text-foreground">Deleting your data</h2>
          <p>
            Settings → Delete account asks for your consent and your password, then erases your account, your profile
            and Centurion&apos;s records of any Zerodha account you connected from every Centurion database, and
            confirms by email. Backups never contain them. The database host&apos;s automatic recovery history keeps
            deleted data for up to a day before it is gone. Emails already sent to you stay in your mailbox.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-semibold text-foreground">Questions</h2>
          <p>Reply to any email you have received from Centurion.</p>
        </section>
      </div>
      <p className="text-sm text-center">
        <Link href="/login" className="text-primary hover:underline">Back to sign in</Link>
      </p>
    </AuthCard>
  );
}
