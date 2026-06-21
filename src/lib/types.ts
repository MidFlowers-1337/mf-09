export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type AttendanceStatus = 'pending' | 'confirmed' | 'declined';
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

export const SUPPLIER_CATEGORY_LABELS: Record<SupplierCategory, string> = {
  venue: '酒店/场地',
  florist: '花艺',
  photography: '摄影摄像',
  makeup: '化妆造型',
  catering: '餐饮',
  mc: '司仪主持',
  music: '音乐/乐队',
  dress: '婚纱礼服',
  other: '其他'
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  completed: '已完成'
};

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  declined: '无法到场'
};

export const DEFAULT_GUEST_GROUPS = ['男方亲戚', '女方亲戚', '男方朋友', '女方朋友', '同事', '其他'];

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
