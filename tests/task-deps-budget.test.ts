import {
  createWedding,
  createTask,
  updateTask,
  addTaskDependency,
  removeTaskDependency,
  canTaskStart,
  getTaskBlockers,
  detectCyclicDependency,
  getTaskDependencies,
  getTaskDependents,
  createExpense,
  getBudgetSummary,
  validateBudget,
  deleteExpense
} from '../src/lib/server/repository';
import { getDbForTest, setTestDb, closeDb } from '../src/lib/server/db';

interface Database {
  prepare(sql: string): any;
  exec(sql: string): void;
  pragma(sql: string): unknown;
  close(): void;
  export(): Uint8Array;
}

describe('任务依赖系统', () => {
  let db: Database;
  let weddingId: number;

  beforeEach(async () => {
    db = await getDbForTest();
    setTestDb(db);
    weddingId = await createWedding({
      groom_name: '测试新郎',
      bride_name: '测试新娘',
      wedding_date: '2026-10-01',
      budget_total: 100000
    });
  });

  afterEach(() => {
    setTestDb(null);
    db.close();
  });

  test('创建任务时没有依赖，可以直接开始', async () => {
    const taskId = await createTask({ wedding_id: weddingId, title: '预订酒店' });
    expect(await canTaskStart(taskId)).toBe(true);
    expect(await getTaskBlockers(taskId)).toEqual([]);
  });

  test('添加依赖后，前置任务未完成则不能开始', async () => {
    const t1 = await createTask({ wedding_id: weddingId, title: '选酒店' });
    const t2 = await createTask({ wedding_id: weddingId, title: '签合同' });
    await addTaskDependency(t2, t1);

    expect(await getTaskDependencies(t2)).toEqual([t1]);
    expect(await getTaskDependents(t1)).toEqual([t2]);
    expect(await canTaskStart(t2)).toBe(false);
    const blockers = await getTaskBlockers(t2);
    expect(blockers).toHaveLength(1);
    expect(blockers[0].title).toBe('选酒店');
  });

  test('前置任务完成后，后置任务可以开始', async () => {
    const t1 = await createTask({ wedding_id: weddingId, title: '选酒店' });
    const t2 = await createTask({ wedding_id: weddingId, title: '签合同' });
    await addTaskDependency(t2, t1);
    await updateTask(t1, { status: 'completed' });
    expect(await canTaskStart(t2)).toBe(true);
    expect(await getTaskBlockers(t2)).toEqual([]);
  });

  test('前置未完成时禁止切换到 in_progress', async () => {
    const t1 = await createTask({ wedding_id: weddingId, title: '选酒店' });
    const t2 = await createTask({ wedding_id: weddingId, title: '签合同' });
    await addTaskDependency(t2, t1);
    await expect(updateTask(t2, { status: 'in_progress' })).rejects.toThrow(/前置任务尚未完成/);
  });

  test('前置未完成时禁止切换到 completed', async () => {
    const t1 = await createTask({ wedding_id: weddingId, title: '选酒店' });
    const t2 = await createTask({ wedding_id: weddingId, title: '签合同' });
    await addTaskDependency(t2, t1);
    await expect(updateTask(t2, { status: 'completed' })).rejects.toThrow(/前置任务尚未完成/);
  });

  test('多层依赖链需全部前置完成', async () => {
    const t1 = await createTask({ wedding_id: weddingId, title: '设计请柬' });
    const t2 = await createTask({ wedding_id: weddingId, title: '印刷请柬' });
    const t3 = await createTask({ wedding_id: weddingId, title: '发送请柬' });
    await addTaskDependency(t2, t1);
    await addTaskDependency(t3, t2);

    expect(await canTaskStart(t2)).toBe(false);
    expect(await canTaskStart(t3)).toBe(false);

    await updateTask(t1, { status: 'completed' });
    expect(await canTaskStart(t2)).toBe(true);
    expect(await canTaskStart(t3)).toBe(false);

    await updateTask(t2, { status: 'completed' });
    expect(await canTaskStart(t3)).toBe(true);
  });

  test('一个任务依赖多个前置需全部完成', async () => {
    const t1 = await createTask({ wedding_id: weddingId, title: '订酒店' });
    const t2 = await createTask({ wedding_id: weddingId, title: '订婚庆' });
    const t3 = await createTask({ wedding_id: weddingId, title: '确认流程' });
    await addTaskDependency(t3, t1);
    await addTaskDependency(t3, t2);

    expect(await canTaskStart(t3)).toBe(false);
    expect(await getTaskBlockers(t3)).toHaveLength(2);

    await updateTask(t1, { status: 'completed' });
    expect(await canTaskStart(t3)).toBe(false);
    expect(await getTaskBlockers(t3)).toHaveLength(1);

    await updateTask(t2, { status: 'completed' });
    expect(await canTaskStart(t3)).toBe(true);
  });

  test('禁止任务依赖自身', async () => {
    const t1 = await createTask({ wedding_id: weddingId, title: '自指任务' });
    await expect(addTaskDependency(t1, t1)).rejects.toThrow(/不能依赖自身/);
  });

  test('检测直接循环依赖', async () => {
    const t1 = await createTask({ wedding_id: weddingId, title: 'A' });
    const t2 = await createTask({ wedding_id: weddingId, title: 'B' });
    await addTaskDependency(t2, t1);
    expect(await detectCyclicDependency(t1, t2)).toBe(true);
    await expect(addTaskDependency(t1, t2)).rejects.toThrow(/形成循环/);
  });

  test('检测长链循环依赖 A->B->C, C->A', async () => {
    const t1 = await createTask({ wedding_id: weddingId, title: 'A' });
    const t2 = await createTask({ wedding_id: weddingId, title: 'B' });
    const t3 = await createTask({ wedding_id: weddingId, title: 'C' });
    await addTaskDependency(t2, t1);
    await addTaskDependency(t3, t2);
    expect(await detectCyclicDependency(t1, t3)).toBe(true);
    await expect(addTaskDependency(t1, t3)).rejects.toThrow(/形成循环/);
  });

  test('非循环链不应误报', async () => {
    const t1 = await createTask({ wedding_id: weddingId, title: 'A' });
    const t2 = await createTask({ wedding_id: weddingId, title: 'B' });
    const t3 = await createTask({ wedding_id: weddingId, title: 'C' });
    await addTaskDependency(t2, t1);
    await addTaskDependency(t3, t2);
    expect(await detectCyclicDependency(t3, t1)).toBe(false);
    expect(await detectCyclicDependency(t2, t1)).toBe(false);
  });

  test('不同婚礼的任务不能建立依赖', async () => {
    const w2 = await createWedding({
      groom_name: '另一场', bride_name: '婚礼',
      wedding_date: '2026-11-11', budget_total: 50000
    });
    const t1 = await createTask({ wedding_id: weddingId, title: '本场任务' });
    const t2 = await createTask({ wedding_id: w2, title: '外场任务' });
    await expect(addTaskDependency(t1, t2)).rejects.toThrow(/同一场婚礼/);
  });

  test('重复添加同一依赖不会报错', async () => {
    const t1 = await createTask({ wedding_id: weddingId, title: 'T1' });
    const t2 = await createTask({ wedding_id: weddingId, title: 'T2' });
    await addTaskDependency(t2, t1);
    await expect(addTaskDependency(t2, t1)).resolves.not.toThrow();
    expect(await getTaskDependencies(t2)).toEqual([t1]);
  });

  test('移除依赖后任务不再被阻塞', async () => {
    const t1 = await createTask({ wedding_id: weddingId, title: '前置' });
    const t2 = await createTask({ wedding_id: weddingId, title: '后置' });
    await addTaskDependency(t2, t1);
    expect(await canTaskStart(t2)).toBe(false);
    await removeTaskDependency(t2, t1);
    expect(await canTaskStart(t2)).toBe(true);
    expect(await getTaskDependencies(t2)).toEqual([]);
  });
});

describe('预算校验系统', () => {
  let db: Database;
  let weddingId: number;

  beforeEach(async () => {
    db = await getDbForTest();
    setTestDb(db);
    weddingId = await createWedding({
      groom_name: '预算新郎',
      bride_name: '预算新娘',
      wedding_date: '2026-10-01',
      budget_total: 100000
    });
  });

  afterEach(() => {
    setTestDb(null);
    db.close();
  });

  test('空婚礼预算统计正确', async () => {
    const s = await getBudgetSummary(weddingId);
    expect(s.budget_total).toBe(100000);
    expect(s.total_spent).toBe(0);
    expect(s.budget_remaining).toBe(100000);
    expect(s.is_over_budget).toBe(false);
    expect(s.overage_amount).toBe(0);
  });

  test('添加支出后预算统计正确', async () => {
    await createExpense({ wedding_id: weddingId, category: '场地费', description: '酒店定金', amount: 30000 });
    const s = await getBudgetSummary(weddingId);
    expect(s.total_spent).toBe(30000);
    expect(s.budget_remaining).toBe(70000);
    expect(s.is_over_budget).toBe(false);
  });

  test('多笔支出累计与分类统计正确', async () => {
    await createExpense({ wedding_id: weddingId, category: '场地费', description: '定金', amount: 30000 });
    await createExpense({ wedding_id: weddingId, category: '场地费', description: '尾款', amount: 50000 });
    await createExpense({ wedding_id: weddingId, category: '花艺', description: '全场鲜花', amount: 8000 });
    const s = await getBudgetSummary(weddingId);
    expect(s.total_spent).toBe(88000);
    expect(s.by_category).toHaveLength(2);
    const catMap = new Map(s.by_category.map(c => [c.category, c.total]));
    expect(catMap.get('场地费')).toBe(80000);
    expect(catMap.get('花艺')).toBe(8000);
  });

  test('超支判定正确', async () => {
    await createExpense({ wedding_id: weddingId, category: '场地费', description: '全款', amount: 80000 });
    await createExpense({ wedding_id: weddingId, category: '摄影', description: '套餐', amount: 25000 });
    const s = await getBudgetSummary(weddingId);
    expect(s.total_spent).toBe(105000);
    expect(s.is_over_budget).toBe(true);
    expect(s.overage_amount).toBe(5000);
    expect(s.budget_remaining).toBe(-5000);
  });

  test('validateBudget 预判新支出是否会超支', async () => {
    await createExpense({ wedding_id: weddingId, category: '场地费', description: '定金', amount: 60000 });
    const v1 = await validateBudget(weddingId, 30000);
    expect(v1.will_over).toBe(false);
    expect(v1.new_total).toBe(90000);
    const v2 = await validateBudget(weddingId, 45000);
    expect(v2.will_over).toBe(true);
    expect(v2.new_total).toBe(105000);
    expect(v2.overage).toBe(5000);
  });

  test('零预算婚礼支出判定超支', async () => {
    const zw = await createWedding({
      groom_name: '零', bride_name: '预算',
      wedding_date: '2026-10-01', budget_total: 0
    });
    expect((await validateBudget(zw, 1)).will_over).toBe(true);
    await createExpense({ wedding_id: zw, category: '测试', description: '一元', amount: 1 });
    expect((await getBudgetSummary(zw)).is_over_budget).toBe(true);
  });

  test('删除支出后预算恢复正确', async () => {
    const e1 = await createExpense({ wedding_id: weddingId, category: 'A', description: 'a', amount: 50000 });
    const e2 = await createExpense({ wedding_id: weddingId, category: 'B', description: 'b', amount: 60000 });
    expect((await getBudgetSummary(weddingId)).is_over_budget).toBe(true);
    await deleteExpense(e2);
    const s = await getBudgetSummary(weddingId);
    expect(s.total_spent).toBe(50000);
    expect(s.is_over_budget).toBe(false);
  });
});
