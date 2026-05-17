export type UserRole = 'employee' | 'manager' | 'admin';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  department: string | null;
  manager_id: string | null;
  created_at: string;
}
