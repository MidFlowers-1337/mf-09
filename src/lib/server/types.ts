export interface Wedding {
  id: number;
  groom_name: string;
  bride_name: string;
  wedding_date: string;
  venue: string | null;
  budget_total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeddingWithStats extends Wedding {
  total_spent: number;
  budget_remaining: number;
  is_over_budget: boolean;
  total_tasks: number;
  completed_tasks: number;
  total_guests: number;
  confirmed_guests: number;
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export interface Task {
  id: number;
  wedding_id: number;
  title: string;
  description: string | null;
  assignee: string | null;
  due_date: string | null;
  status: TaskStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TaskWithDependencies extends Task {
  dependencies: number[];
  dependents: number[];
  can_start: boolean;
  blocked_by: { id: number; title: string; status: TaskStatus }[];
}

export type AttendanceStatus = 'pending' | 'confirmed' | 'declined';

export interface GuestGroup {
  id: number;
  wedding_id: number;
  name: string;
  sort_order: number;
}

export interface GuestGroupWithStats extends GuestGroup {
  guest_count: number;
  confirmed_count: number;
}

export interface Table {
  id: number;
  wedding_id: number;
  table_number: number;
  name: string | null;
  capacity: number;
}

export interface TableWithStats extends Table {
  guest_count: number;
  is_full: boolean;
  is_over: boolean;
}

export interface Guest {
  id: number;
  wedding_id: number;
  name: string;
  phone: string | null;
  group_id: number | null;
  table_id: number | null;
  attendance_status: AttendanceStatus;
  plus_one: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuestDetail extends Guest {
  group_name: string | null;
  table_number: number | null;
}

export type SupplierCategory =
  | 'venue'
  | 'florist'
  | 'photography'
  | 'makeup'
  | 'catering'
  | 'mc'
  | 'music'
  | 'dress'
  | 'other';

export interface Supplier {
  id: number;
  wedding_id: number;
  category: SupplierCategory;
  name: string;
  contact_person: string | null;
  phone: string | null;
  contract_amount: number;
  paid_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  wedding_id: number;
  supplier_id: number | null;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  created_at: string;
}

export interface BudgetSummary {
  budget_total: number;
  total_spent: number;
  budget_remaining: number;
  is_over_budget: boolean;
  overage_amount: number;
  by_category: { category: string; total: number }[];
  expenses: Expense[];
}

export interface TaskDependency {
  task_id: number;
  depends_on_id: number;
}
