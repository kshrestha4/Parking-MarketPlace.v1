// Server-side validation for the auth forms. The browser checks too, but these
// run in the Server Actions so nothing relies on the client being honest.

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Enter your email address.";
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  return ok ? null : "Enter a valid email address.";
}

export function validatePassword(password: string): string | null {
  if (!password) return "Enter a password.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export function validateName(name: string): string | null {
  if (!name.trim()) return "Enter your name.";
  if (name.trim().length < 2) return "Name must be at least 2 characters.";
  return null;
}

export function isAppRole(value: string): value is "customer" | "owner" {
  return value === "customer" || value === "owner";
}
