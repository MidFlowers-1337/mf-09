import { getDb } from './db';
import type {
  Wedding,
  WeddingWithStats,
  Task,
  TaskWithDependencies,
  TaskStatus,
  Guest,
  GuestDetail,
  GuestGroup,
  GuestGroupWithStats,
  Table,
  TableWithStats,
  Supplier,
  SupplierCategory,
  Expense,
  BudgetSummary
} from './types';

type Db = Awaited<ReturnType<typeof getDb>>;

// ============ Wedding ============

export async function createWedding(data: {
  groom_name: string;
  bride_name: string;
  wedding_date: string;
  venue?: string | null;
  budget_total: number;
  notes?: string | null;
}): Promise<number> {
  const db = await getDb();
  const stmt = db.prepare(`
    INSERT INTO weddings (groom_name, bride_name, wedding_date, venue, budget_total, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run([
    data.groom_name,
    data.bride_name,
    data.wedding_date,
    data.venue ?? null,
    data.budget_total,
    data.notes ?? null
  ]);
  return Number(result.lastInsertRowid);
}

export async function updateWedding(
  id: number,
  data: {
    groom_name?: string;
    bride_name?: string;
    wedding_date?: string;
    venue?: string | null;
    budget_total?: number;
    notes?: string | null;
  }
): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return;
  fields.push("updated_at = datetime('now')");
  values.push(id);
  const stmt = db.prepare(`UPDATE weddings SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(values);
}

export async function deleteWedding(id: number): Promise<void> {
  const db = await getDb();
  db.prepare('DELETE FROM weddings WHERE id = ?').run([id]);
}

export async function getWedding(id: number): Promise<Wedding | null> {
  const db = await getDb();
  return db.prepare('SELECT * FROM weddings WHERE id = ?').get([id]) as Wedding | null;
}

export async function getWeddingWithStats(id: number): Promise<WeddingWithStats | null> {
  const wedding = await getWedding(id);
  if (!wedding) return null;
  const db = await getDb();

  const stats = db
    .prepare(
      `
    SELECT
      COALESCE(SUM(e.amount), 0) as total_spent,
      (SELECT COUNT(*) FROM tasks t WHERE t.wedding_id = w.id) as total_tasks,
      (SELECT COUNT(*) FROM tasks t WHERE t.wedding_id = w.id AND t.status = 'completed') as completed_tasks,
      (SELECT COUNT(*) + COALESCE(SUM(g.plus_one), 0) FROM guests g WHERE g.wedding_id = w.id) as total_guests,
      (SELECT COUNT(*) + COALESCE(SUM(g.plus_one), 0) FROM guests g WHERE g.wedding_id = w.id AND g.attendance_status = 'confirmed') as confirmed_guests
    FROM weddings w
    LEFT JOIN expenses e ON e.wedding_id = w.id
    WHERE w.id = ?
    GROUP BY w.id
  `
    )
    .get([id]) as {
    total_spent: number;
    total_tasks: number;
    completed_tasks: number;
    total_guests: number;
    confirmed_guests: number;
  } | null;

  const total_spent = stats?.total_spent ?? 0;
  return {
    ...wedding,
    total_spent,
    budget_remaining: wedding.budget_total - total_spent,
    is_over_budget: total_spent > wedding.budget_total,
    total_tasks: stats?.total_tasks ?? 0,
    completed_tasks: stats?.completed_tasks ?? 0,
    total_guests: stats?.total_guests ?? 0,
    confirmed_guests: stats?.confirmed_guests ?? 0
  };
}

export async function listWeddings(): Promise<WeddingWithStats[]> {
  const db = await getDb();
  const rows = db
    .prepare(
      `
    SELECT
      w.*,
      COALESCE(e_stats.total_spent, 0) as total_spent,
      (w.budget_total - COALESCE(e_stats.total_spent, 0)) as budget_remaining,
      (COALESCE(e_stats.total_spent, 0) > w.budget_total) as is_over_budget,
      COALESCE(t_stats.total_tasks, 0) as total_tasks,
      COALESCE(t_stats.completed_tasks, 0) as completed_tasks,
      COALESCE(g_stats.total_guests, 0) as total_guests,
      COALESCE(g_stats.confirmed_guests, 0) as confirmed_guests
    FROM weddings w
    LEFT JOIN (
      SELECT wedding_id, SUM(amount) as total_spent FROM expenses GROUP BY wedding_id
    ) e_stats ON e_stats.wedding_id = w.id
    LEFT JOIN (
      SELECT wedding_id, COUNT(*) as total_tasks,
             SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
      FROM tasks GROUP BY wedding_id
    ) t_stats ON t_stats.wedding_id = w.id
    LEFT JOIN (
      SELECT wedding_id,
             COUNT(*) + COALESCE(SUM(plus_one), 0) as total_guests,
             SUM(CASE WHEN attendance_status = 'confirmed' THEN 1 + plus_one ELSE 0 END) as confirmed_guests
      FROM guests GROUP BY wedding_id
    ) g_stats ON g_stats.wedding_id = w.id
    ORDER BY w.wedding_date ASC
  `
    )
    .all([]) as WeddingWithStats[];
  return rows.map((r) => ({ ...r, is_over_budget: !!r.is_over_budget }));
}

// ============ Tasks ============

export async function createTask(data: {
  wedding_id: number;
  title: string;
  description?: string | null;
  assignee?: string | null;
  due_date?: string | null;
  sort_order?: number;
}): Promise<number> {
  const db = await getDb();
  const maxOrder =
    ((await db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) as max_ord FROM tasks WHERE wedding_id = ?')
      .get([data.wedding_id])) as { max_ord: number }).max_ord + 1;
  const stmt = db.prepare(`
    INSERT INTO tasks (wedding_id, title, description, assignee, due_date, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run([
    data.wedding_id,
    data.title,
    data.description ?? null,
    data.assignee ?? null,
    data.due_date ?? null,
    data.sort_order ?? maxOrder
  ]);
  return Number(result.lastInsertRowid);
}

export async function updateTask(
  id: number,
  data: {
    title?: string;
    description?: string | null;
    assignee?: string | null;
    due_date?: string | null;
    status?: TaskStatus;
    sort_order?: number;
  }
): Promise<void> {
  if (data.status && data.status !== 'todo') {
    const canStart = await canTaskStart(id);
    if (!canStart) {
      throw new Error('无法开始此任务：前置任务尚未完成');
    }
  }
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return;
  fields.push("updated_at = datetime('now')");
  values.push(id);
  const stmt = db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(values);
}

export async function deleteTask(id: number): Promise<void> {
  const db = await getDb();
  db.prepare('DELETE FROM tasks WHERE id = ?').run([id]);
}

export async function getTask(id: number): Promise<Task | null> {
  const db = await getDb();
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get([id]) as Task | null;
}

export async function listTasks(weddingId: number): Promise<Task[]> {
  const db = await getDb();
  return db
    .prepare('SELECT * FROM tasks WHERE wedding_id = ? ORDER BY sort_order ASC, id ASC')
    .all([weddingId]) as Task[];
}

// ============ Task Dependencies ============

export async function canTaskStart(taskId: number): Promise<boolean> {
  const blockers = await getTaskBlockers(taskId);
  return blockers.length === 0;
}

export async function getTaskBlockers(taskId: number): Promise<{ id: number; title: string; status: TaskStatus }[]> {
  const db = await getDb();
  return db
    .prepare(
      `
    SELECT t.id, t.title, t.status
    FROM task_dependencies td
    JOIN tasks t ON t.id = td.depends_on_id
    WHERE td.task_id = ? AND t.status != 'completed'
    ORDER BY t.id
  `
    )
    .all([taskId]) as { id: number; title: string; status: TaskStatus }[];
}

export async function detectCyclicDependency(taskId: number, dependsOnId: number): Promise<boolean> {
  const db = await getDb();
  const visited = new Set<number>();
  const stack = [dependsOnId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const deps = db
      .prepare('SELECT depends_on_id FROM task_dependencies WHERE task_id = ?')
      .all([current]) as { depends_on_id: number }[];
    for (const d of deps) {
      stack.push(d.depends_on_id);
    }
  }
  return false;
}

export async function addTaskDependency(taskId: number, dependsOnId: number): Promise<void> {
  if (taskId === dependsOnId) {
    throw new Error('任务不能依赖自身');
  }
  const db = await getDb();
  const task = await getTask(taskId);
  const dep = await getTask(dependsOnId);
  if (!task || !dep) throw new Error('任务不存在');
  if (task.wedding_id !== dep.wedding_id) {
    throw new Error('只能在同一场婚礼的任务间设置依赖');
  }
  if (await detectCyclicDependency(taskId, dependsOnId)) {
    throw new Error('设置此依赖会形成循环，任务将永远无法开始');
  }
  const existing = db
    .prepare('SELECT 1 FROM task_dependencies WHERE task_id = ? AND depends_on_id = ?')
    .get([taskId, dependsOnId]);
  if (existing) return;
  db.prepare(
    'INSERT INTO task_dependencies (task_id, depends_on_id) VALUES (?, ?)'
  ).run([taskId, dependsOnId]);
}

export async function removeTaskDependency(taskId: number, dependsOnId: number): Promise<void> {
  const db = await getDb();
  db.prepare(
    'DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_id = ?'
  ).run([taskId, dependsOnId]);
}

export async function getTaskDependencies(taskId: number): Promise<number[]> {
  const db = await getDb();
  return (db
    .prepare('SELECT depends_on_id FROM task_dependencies WHERE task_id = ?')
    .all([taskId]) as { depends_on_id: number }[]).map((r) => r.depends_on_id);
}

export async function getTaskDependents(taskId: number): Promise<number[]> {
  const db = await getDb();
  return (db
    .prepare('SELECT task_id FROM task_dependencies WHERE depends_on_id = ?')
    .all([taskId]) as { task_id: number }[]).map((r) => r.task_id);
}

export async function listTasksWithDependencies(weddingId: number): Promise<TaskWithDependencies[]> {
  const tasks = await listTasks(weddingId);
  const result: TaskWithDependencies[] = [];
  for (const t of tasks) {
    const dependencies = await getTaskDependencies(t.id);
    const dependents = await getTaskDependents(t.id);
    const blocked_by = await getTaskBlockers(t.id);
    result.push({
      ...t,
      dependencies,
      dependents,
      can_start: blocked_by.length === 0,
      blocked_by
    });
  }
  return result;
}

// ============ Guest Groups ============

export async function createGuestGroup(data: { wedding_id: number; name: string; sort_order?: number }): Promise<number> {
  const db = await getDb();
  const maxOrder =
    ((await db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) as max_ord FROM guest_groups WHERE wedding_id = ?')
      .get([data.wedding_id])) as { max_ord: number }).max_ord + 1;
  const stmt = db.prepare(
    'INSERT INTO guest_groups (wedding_id, name, sort_order) VALUES (?, ?, ?)'
  );
  const result = stmt.run([data.wedding_id, data.name, data.sort_order ?? maxOrder]);
  return Number(result.lastInsertRowid);
}

export async function updateGuestGroup(id: number, data: { name?: string; sort_order?: number }): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE guest_groups SET ${fields.join(', ')} WHERE id = ?`).run(values);
}

export async function deleteGuestGroup(id: number): Promise<void> {
  const db = await getDb();
  db.prepare('DELETE FROM guest_groups WHERE id = ?').run([id]);
}

export async function listGuestGroups(weddingId: number): Promise<GuestGroup[]> {
  const db = await getDb();
  return db
    .prepare('SELECT * FROM guest_groups WHERE wedding_id = ? ORDER BY sort_order ASC, id ASC')
    .all([weddingId]) as GuestGroup[];
}

export async function listGuestGroupsWithStats(weddingId: number): Promise<GuestGroupWithStats[]> {
  const db = await getDb();
  return db
    .prepare(
      `
    SELECT gg.*,
      COUNT(g.id) as guest_count,
      SUM(CASE WHEN g.attendance_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count
    FROM guest_groups gg
    LEFT JOIN guests g ON g.group_id = gg.id
    WHERE gg.wedding_id = ?
    GROUP BY gg.id
    ORDER BY gg.sort_order ASC, gg.id ASC
  `
    )
    .all([weddingId]) as GuestGroupWithStats[];
}

// ============ Tables ============

export async function createTableRow(data: {
  wedding_id: number;
  table_number: number;
  name?: string | null;
  capacity?: number;
}): Promise<number> {
  const db = await getDb();
  const stmt = db.prepare(
    'INSERT INTO tables (wedding_id, table_number, name, capacity) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run([
    data.wedding_id,
    data.table_number,
    data.name ?? null,
    data.capacity ?? 10
  ]);
  return Number(result.lastInsertRowid);
}

export { createTableRow as createTable };

export async function updateTable(
  id: number,
  data: { table_number?: number; name?: string | null; capacity?: number }
): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE tables SET ${fields.join(', ')} WHERE id = ?`).run(values);
}

export async function deleteTable(id: number): Promise<void> {
  const db = await getDb();
  db.prepare('DELETE FROM tables WHERE id = ?').run([id]);
}

export async function listTables(weddingId: number): Promise<Table[]> {
  const db = await getDb();
  return db
    .prepare('SELECT * FROM tables WHERE wedding_id = ? ORDER BY table_number ASC')
    .all([weddingId]) as Table[];
}

export async function listTablesWithStats(weddingId: number): Promise<TableWithStats[]> {
  const db = await getDb();
  return db
    .prepare(
      `
    SELECT t.*,
      COUNT(g.id) + COALESCE(SUM(g.plus_one), 0) as guest_count,
      (COUNT(g.id) + COALESCE(SUM(g.plus_one), 0)) >= t.capacity as is_full,
      (COUNT(g.id) + COALESCE(SUM(g.plus_one), 0)) > t.capacity as is_over
    FROM tables t
    LEFT JOIN guests g ON g.table_id = t.id AND g.attendance_status != 'declined'
    WHERE t.wedding_id = ?
    GROUP BY t.id
    ORDER BY t.table_number ASC
  `
    )
    .all([weddingId]) as TableWithStats[];
}

// ============ Guests ============

export async function createGuest(data: {
  wedding_id: number;
  name: string;
  phone?: string | null;
  group_id?: number | null;
  table_id?: number | null;
  attendance_status?: 'pending' | 'confirmed' | 'declined';
  plus_one?: number;
  notes?: string | null;
}): Promise<number> {
  const db = await getDb();
  const stmt = db.prepare(`
    INSERT INTO guests (wedding_id, name, phone, group_id, table_id, attendance_status, plus_one, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run([
    data.wedding_id,
    data.name,
    data.phone ?? null,
    data.group_id ?? null,
    data.table_id ?? null,
    data.attendance_status ?? 'pending',
    data.plus_one ?? 0,
    data.notes ?? null
  ]);
  return Number(result.lastInsertRowid);
}

export async function updateGuest(
  id: number,
  data: {
    name?: string;
    phone?: string | null;
    group_id?: number | null;
    table_id?: number | null;
    attendance_status?: 'pending' | 'confirmed' | 'declined';
    plus_one?: number;
    notes?: string | null;
  }
): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return;
  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE guests SET ${fields.join(', ')} WHERE id = ?`).run(values);
}

export async function deleteGuest(id: number): Promise<void> {
  const db = await getDb();
  db.prepare('DELETE FROM guests WHERE id = ?').run([id]);
}

export async function listGuests(weddingId: number): Promise<GuestDetail[]> {
  const db = await getDb();
  return db
    .prepare(
      `
    SELECT g.*, gg.name as group_name, t.table_number
    FROM guests g
    LEFT JOIN guest_groups gg ON gg.id = g.group_id
    LEFT JOIN tables t ON t.id = g.table_id
    WHERE g.wedding_id = ?
    ORDER BY COALESCE(gg.sort_order, 9999) ASC, g.name ASC
  `
    )
    .all([weddingId]) as GuestDetail[];
}

export async function getGuestStats(weddingId: number): Promise<{
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
  total_with_plus: number;
  confirmed_with_plus: number;
}> {
  const db = await getDb();
  return db
    .prepare(
      `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN attendance_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN attendance_status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN attendance_status = 'declined' THEN 1 ELSE 0 END) as declined,
      COUNT(*) + COALESCE(SUM(plus_one), 0) as total_with_plus,
      SUM(CASE WHEN attendance_status = 'confirmed' THEN 1 + plus_one ELSE 0 END) as confirmed_with_plus
    FROM guests WHERE wedding_id = ?
  `
    )
    .get([weddingId]) as {
    total: number;
    confirmed: number;
    pending: number;
    declined: number;
    total_with_plus: number;
    confirmed_with_plus: number;
  };
}

// ============ Suppliers ============

export async function createSupplier(data: {
  wedding_id: number;
  category: SupplierCategory;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  contract_amount?: number;
  paid_amount?: number;
  notes?: string | null;
}): Promise<number> {
  const db = await getDb();
  const stmt = db.prepare(`
    INSERT INTO suppliers (wedding_id, category, name, contact_person, phone, contract_amount, paid_amount, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run([
    data.wedding_id,
    data.category,
    data.name,
    data.contact_person ?? null,
    data.phone ?? null,
    data.contract_amount ?? 0,
    data.paid_amount ?? 0,
    data.notes ?? null
  ]);
  return Number(result.lastInsertRowid);
}

export async function updateSupplier(
  id: number,
  data: {
    category?: SupplierCategory;
    name?: string;
    contact_person?: string | null;
    phone?: string | null;
    contract_amount?: number;
    paid_amount?: number;
    notes?: string | null;
  }
): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return;
  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`).run(values);
}

export async function deleteSupplier(id: number): Promise<void> {
  const db = await getDb();
  db.prepare('DELETE FROM suppliers WHERE id = ?').run([id]);
}

export async function listSuppliers(weddingId: number): Promise<Supplier[]> {
  const db = await getDb();
  return db
    .prepare('SELECT * FROM suppliers WHERE wedding_id = ? ORDER BY category, id')
    .all([weddingId]) as Supplier[];
}

// ============ Expenses & Budget ============

export async function createExpense(data: {
  wedding_id: number;
  supplier_id?: number | null;
  category: string;
  description: string;
  amount: number;
  expense_date?: string;
  notes?: string | null;
}): Promise<number> {
  const db = await getDb();
  const stmt = db.prepare(`
    INSERT INTO expenses (wedding_id, supplier_id, category, description, amount, expense_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run([
    data.wedding_id,
    data.supplier_id ?? null,
    data.category,
    data.description,
    data.amount,
    data.expense_date ?? new Date().toISOString().slice(0, 10),
    data.notes ?? null
  ]);
  return Number(result.lastInsertRowid);
}

export async function deleteExpense(id: number): Promise<void> {
  const db = await getDb();
  db.prepare('DELETE FROM expenses WHERE id = ?').run([id]);
}

export async function listExpenses(weddingId: number): Promise<Expense[]> {
  const db = await getDb();
  return db
    .prepare('SELECT * FROM expenses WHERE wedding_id = ? ORDER BY expense_date DESC, id DESC')
    .all([weddingId]) as Expense[];
}

export async function getBudgetSummary(weddingId: number): Promise<BudgetSummary> {
  const wedding = await getWedding(weddingId);
  const budget_total = wedding?.budget_total ?? 0;
  const expenses = await listExpenses(weddingId);
  const total_spent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const db = await getDb();
  const byCategory = db
    .prepare(
      `
    SELECT category, SUM(amount) as total
    FROM expenses WHERE wedding_id = ?
    GROUP BY category ORDER BY total DESC
  `
    )
    .all([weddingId]) as { category: string; total: number }[];

  return {
    budget_total,
    total_spent,
    budget_remaining: budget_total - total_spent,
    is_over_budget: total_spent > budget_total,
    overage_amount: Math.max(0, total_spent - budget_total),
    by_category: byCategory,
    expenses
  };
}

export async function validateBudget(weddingId: number, newExpenseAmount: number): Promise<{
  will_over: boolean;
  new_total: number;
  budget: number;
  overage: number;
}> {
  const summary = await getBudgetSummary(weddingId);
  const new_total = summary.total_spent + newExpenseAmount;
  const will_over = new_total > summary.budget_total;
  return {
    will_over,
    new_total,
    budget: summary.budget_total,
    overage: Math.max(0, new_total - summary.budget_total)
  };
}
