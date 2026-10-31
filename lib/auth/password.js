const LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];
const COMMON = ["password", "qwerty", "123456", "letmein", "admin"];

/** Client-side guidance only. The enforced rules live in schemas/auth.schema.js. */
export function passwordStrength(password) {
  const value = typeof password === "string" ? password : "";
  if (value.length === 0) return { score: 0, label: LABELS[0] };

  let score = 0;
  if (value.length >= 10) score += 1;
  if (value.length >= 14) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  score = Math.min(score, 4);

  const lower = value.toLowerCase();
  if (COMMON.some((word) => lower.includes(word))) score = Math.min(score, 1);
  if (value.length < 10) score = Math.min(score, 1);

  return { score, label: LABELS[score] };
}
