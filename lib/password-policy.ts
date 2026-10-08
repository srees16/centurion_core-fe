/**
 * The password policy (tracker MU2), the same rules the API enforces in api/users.py
 * (password_problem): 12 to 64 characters, upper and lower case, a digit, a symbol, and
 * nothing guessable from the account or the site.  The API has the last word.
 */

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 64;
const COMMON = ["password", "passw0rd", "centurion", "qwerty", "123456", "letmein", "welcome", "admin", "iloveyou"];

export interface PasswordRule {
  label: string;
  ok: boolean;
}

/** Each rule with whether ``password`` meets it, for a live checklist under the field. */
export function passwordRules(password: string, email = "", name = ""): PasswordRule[] {
  const lower = password.toLowerCase();
  const personal = [email.split("@")[0], ...name.split(/\s+/)].map((p) => p.toLowerCase()).filter((p) => p.length >= 3);
  const bytes = new TextEncoder().encode(password).length;
  return [
    { label: `${PASSWORD_MIN} to ${PASSWORD_MAX} characters`, ok: password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX && bytes <= 72 },
    { label: "Upper and lower case letters", ok: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: "A digit", ok: /[0-9]/.test(password) },
    { label: "A symbol, such as ! or #", ok: /[^A-Za-z0-9]/.test(password) },
    {
      label: "No name, email or common word",
      ok: password.length > 0 && !personal.some((p) => lower.includes(p)) && !COMMON.some((w) => lower.includes(w)),
    },
  ];
}

export function passwordOk(password: string, email = "", name = ""): boolean {
  return passwordRules(password, email, name).every((r) => r.ok);
}
