/**
 * The sign-up form's field rules (tracker MU2), the same checks the API makes in api/users.py
 * (text_problem, email_problem, clean_phone).  Each returns "" when the value is fine, else the
 * reason to show under the field.  The API has the last word.
 */

export const NAME_MAX = 40;
export const PLACE_MAX = 60;
export const EMAIL_MAX = 254;
const INDIA = ["india", "bharat", "in"];

// Letters and combining marks in any script (Devanagari vowel signs are marks), with these between them.
const NAME_CHARS = /^[\p{L}\p{M} \-.'’]*$/u;
const PLACE_CHARS = /^[\p{L}\p{M} \-.'’,()&]*$/u;
const LETTER = /^\p{L}$/u;

/** Trimmed, inner spaces collapsed, in Unicode NFC: the form the API stores. */
export function plain(value: string): string {
  return value.split(/\s+/).filter(Boolean).join(" ").normalize("NFC");
}

function textProblem(value: string, label: string, max: number, chars: RegExp, allowed: string): string {
  const points = [...plain(value)];                     // code points, as the API counts them
  if (points.length > max) return `${label}: up to ${max} characters`;
  if (!points.length || !LETTER.test(points[0])) return `${label}: start with a letter`;
  if (!chars.test(points.join(""))) return `${label}: letters only, with ${allowed}`;
  return "";
}

const NAME_ALLOWED = "spaces, hyphens, apostrophes or full stops";
const PLACE_ALLOWED = "spaces and . , - ' ( ) &";

export const firstNameProblem = (v: string) =>
  plain(v) ? textProblem(v, "First name", NAME_MAX, NAME_CHARS, NAME_ALLOWED) : "Enter your first name";
/** The last name is optional: some people have one name. */
export const lastNameProblem = (v: string) =>
  plain(v) ? textProblem(v, "Last name", NAME_MAX, NAME_CHARS, NAME_ALLOWED) : "";
export const cityProblem = (v: string) =>
  plain(v) ? textProblem(v, "City", PLACE_MAX, PLACE_CHARS, PLACE_ALLOWED) : "Enter your city";
export const stateProblem = (v: string) =>
  plain(v) ? textProblem(v, "State", PLACE_MAX, PLACE_CHARS, PLACE_ALLOWED) : "";
export const countryProblem = (v: string) =>
  plain(v).length >= 2 ? textProblem(v, "Country", PLACE_MAX, PLACE_CHARS, PLACE_ALLOWED) : "Enter your country";

// An email's local part (RFC 5322 dot-atom) and each label of its domain; the top-level domain is 2+ letters.
const EMAIL_LOCAL = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const EMAIL_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function emailProblem(raw: string): string {
  const email = raw.trim().toLowerCase();
  if (!email) return "Enter your email address";
  const parts = email.split("@");
  if (email.length > EMAIL_MAX || parts.length !== 2) return "Enter a valid email address";
  const [local, domain] = parts;
  const labels = domain.split(".");
  const ok =
    local.length >= 1 && local.length <= 64 && EMAIL_LOCAL.test(local) && labels.length >= 2 &&
    labels.every((l) => EMAIL_LABEL.test(l)) && /^[a-z]{2,63}$/.test(labels[labels.length - 1]);
  return ok ? "" : "Enter a valid email address";
}

const COMMON_DOMAINS = [
  "gmail.com", "yahoo.com", "yahoo.co.in", "outlook.com", "hotmail.com", "live.com", "icloud.com",
  "rediffmail.com", "protonmail.com",
];

function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

/** "Did you mean …?" for a likely typo of a common mail domain (gmial.com -> gmail.com), else null.
 *  Only a hint: the address as typed is still accepted. */
export function emailSuggestion(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  const domain = at > 0 ? email.slice(at + 1) : "";
  if (domain.length < 4 || COMMON_DOMAINS.includes(domain)) return null;
  let best: string | null = null;
  let bestDistance = 3;
  for (const d of COMMON_DOMAINS) {
    const distance = editDistance(domain, d);
    if (distance < bestDistance) [best, bestDistance] = [d, distance];
  }
  return best ? `${email.slice(0, at)}@${best}` : null;
}

/** The mobile number as the API stores it (+ country code and digits) or why it cannot be.  In India the
 *  +91 may be left out, and a leading 0 is dropped: 098765 43210 is +919876543210.  Optional: "" is fine. */
export function phoneCheck(raw: string, country: string): { value: string; problem: string } {
  const s = raw.replace(/[\s\-().]/g, "");
  if (!s) return { value: "", problem: "" };
  let digits: string;
  if (s.startsWith("+")) digits = s.slice(1);
  else if (INDIA.includes(country.trim().toLowerCase())) digits = "91" + (s.length === 11 && s.startsWith("0") ? s.slice(1) : s);
  else return { value: "", problem: "Mobile number: start with + and your country code" };
  if (!/^\d+$/.test(digits)) return { value: "", problem: "Mobile number: digits only, after an optional +" };
  if (digits.startsWith("91")) {
    if (!/^91[6-9]\d{9}$/.test(digits)) return { value: "", problem: "Indian mobile number: 10 digits starting with 6, 7, 8 or 9" };
  } else if (digits.length < 8 || digits.length > 15) {
    return { value: "", problem: "Mobile number: + country code and number, 8 to 15 digits" };
  }
  return { value: "+" + digits, problem: "" };
}
