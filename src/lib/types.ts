export type AppRole = "customer" | "owner" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
}
