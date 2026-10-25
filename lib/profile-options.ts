/** The sign-up form's profile choices (tracker MU2), shared by the sign-up page and the admin's users page. */

export const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const EXPERIENCE = [
  { value: "new", label: "New to trading" },
  { value: "under_1_year", label: "Under 1 year" },
  { value: "1_to_5_years", label: "1 to 5 years" },
  { value: "over_5_years", label: "Over 5 years" },
];

/** The label of a stored choice ("Not given" for an empty one). */
export function optionLabel(options: { value: string; label: string }[], value: string | null | undefined): string {
  if (!value) return "Not given";
  return options.find((o) => o.value === value)?.label ?? value;
}
