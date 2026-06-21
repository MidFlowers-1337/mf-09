<script lang="ts">
  import type { PageData } from './$types';
  import { formatDateFriendly, formatMoney, daysUntil, formatDate } from '$lib/utils';
  import { TASK_STATUS_LABELS, SUPPLIER_CATEGORY_LABELS } from '$lib/types';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';

  export let data: PageData;
  let editingBudget = false;
  let editBudgetValue = '';

  async function saveBudget() {
    await fetch(`/api/weddings/${data.wedding.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget_total: Number(editBudgetValue) || 0 })
    });
    editingBudget = false;
    await invalidateAll();
  }

  function startEditBudget() {
    editBudgetValue = String(data.wedding.budget_total);
    editingBudget = true;
  }
</script>

<div class="container">
  <div class="hero-card card" class:over={data.wedding.is_over_budget}>
    <div class="flex-between" style="margin-bottom: 20px;">
      <div>
        <div class="couple-name">
          {data.wedding.groom_name} ❤️ {data.wedding.bride_name}
        </div>
        <div class="meta-row">
          <span>📅 {formatDateFriendly(data.wedding.wedding_date)}</span>
          {#if daysUntil(data.wedding.wedding_date) > 0}
            <span class="tag tag-blue">倒计时 {daysUntil(data.wedding.wedding_date)} 天</span>
          {:else if daysUntil(data.wedding.wedding_date) === 0}
            <span class="tag tag-red">💍 就是今天！</span>
          {:else}
            <span class="tag tag-gray">已举行</span>
          {/if}
          {#if data.wedding.venue}
            <span>📍 {data.wedding.venue}</span>
          {/if}
        </div>
      </div>
    </div>

    <div class="grid-4">
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div>
          <div class="stat-card-label">任务进度</div>
          <div class="stat-card-value">
            {data.wedding.completed_tasks} / {data.wedding.total_tasks}
          </div>
          <div class="progress-bar" style="margin-top: 8px;">
            <div
              class="progress-fill progress-normal"
              style="width: {data.wedding.total_tasks > 0 ? (data.wedding.completed_tasks / data.wedding.total_tasks) * 100 : 0}%"
            />
          </div>
        </div>
      </div>

      <div class="stat-card" class:over-card={data.wedding.is_over_budget}>
        <div class="stat-icon">💰</div>
        <div style="flex: 1;">
          <div class="stat-card-label flex-between">
            <span>预算使用</span>
            <button class="btn-link" on:click={startEditBudget} style="font-size: 11px;">调整</button>
          </div>
          {#if editingBudget}
            <div class="flex gap-2" style="margin-top: 4px;">
              <input
                type="number"
                class="form-input"
                style="padding: 4px 8px; font-size: 13px; flex: 1;"
                bind:value={editBudgetValue}
                on:keydown={(e) => e.key === 'Enter' && saveBudget()}
              />
              <button class="btn btn-primary btn-sm" on:click={saveBudget}>保存</button>
              <button class="btn btn-ghost btn-sm" on:click={() => editingBudget = false}>取消</button>
            </div>
          {:else}
            <div class="stat-card-value" class:over-val={data.wedding.is_over_budget}>
              {formatMoney(data.wedding.total_spent)}
              <span class="text-muted text-xs"> / {formatMoney(data.wedding.budget_total)}</span>
            </div>
            <div class="progress-bar" style="margin-top: 8px;">
              <div
                class="progress-fill {data.wedding.is_over_budget ? 'progress-danger' : 'progress-normal'}"
                style="width: {Math.min(data.wedding.budget_total > 0 ? (data.wedding.total_spent / data.wedding.budget_total) * 100 : 0, 100)}%"
              />
            </div>
            {#if data.wedding.is_over_budget}
              <div class="text-danger text-sm" style="margin-top: 4px;">
                ⚠️ 超支 {formatMoney(data.wedding.total_spent - data.wedding.budget_total)}
              </div>
            {/if}
          {/if}
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div>
          <div class="stat-card-label">宾客人数</div>
          <div class="stat-card-value">
            {data.guestStats.confirmed_with_plus}
            <span class="text-muted text-xs"> 已确认</span>
          </div>
          <div class="text-muted text-sm" style="margin-top: 4px;">
            待确认 {data.guestStats.pending} · 共 {data.guestStats.total_with_plus}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div>
          <div class="stat-card-label">待办任务</div>
          <div class="stat-card-value">
            {data.tasks.filter(t => t.status === 'todo').length}
          </div>
          <div class="text-muted text-sm" style="margin-top: 4px;">
            进行中 {data.tasks.filter(t => t.status === 'in_progress').length}
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="content-grid" style="margin-top: 20px;">
    <div class="card">
      <div class="flex-between mb-4">
        <div class="section-title" style="margin: 0;">任务概览</div>
        <a class="btn btn-secondary btn-sm" href="/weddings/{data.wedding.id}/tasks">查看看板 →</a>
      </div>
      {#if data.tasks.length === 0}
        <div class="empty-state" style="padding: 24px;">
          还没有任务
          <a href="/weddings/{data.wedding.id}/tasks" class="btn-link" style="display: block; margin-top: 8px;">去添加第一个任务</a>
        </div>
      {:else}
        <div style="display: flex; flex-direction: column; gap: 8px;">
          {#each data.tasks.slice(0, 6) as task}
            <div class="task-row">
              <div class="task-status-dot {task.status}"></div>
              <div style="flex: 1;">
                <div class="task-title" class:blocked={task.status !== 'completed' && !task.can_start}>
                  {task.title}
                </div>
                {#if task.blocked_by.length > 0}
                  <div class="text-xs text-danger">
                    🔒 依赖未完成：{task.blocked_by.map(b => b.title).join('、')}
                  </div>
                {/if}
              </div>
              <div class="text-xs text-muted">
                {TASK_STATUS_LABELS[task.status]}
              </div>
            </div>
          {/each}
          {#if data.tasks.length > 6}
            <div class="text-center text-sm text-muted" style="padding-top: 8px;">
              还有 {data.tasks.length - 6} 个任务...
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <div class="card">
      <div class="flex-between mb-4">
        <div class="section-title" style="margin: 0;">宾客分组</div>
        <a class="btn btn-secondary btn-sm" href="/weddings/{data.wedding.id}/guests">管理宾客 →</a>
      </div>
      {#if data.guestGroups.length === 0}
        <div class="empty-state" style="padding: 24px;">暂无分组</div>
      {:else}
        <div style="display: flex; flex-direction: column; gap: 10px;">
          {#each data.guestGroups as group}
            <div class="group-row">
              <div>
                <div style="font-weight: 500;">{group.name}</div>
                <div class="text-xs text-muted">确认 {group.confirmed_count} / 共 {group.guest_count}</div>
              </div>
              <div class="progress-bar" style="width: 120px;">
                <div
                  class="progress-fill progress-normal"
                  style="width: {group.guest_count > 0 ? (group.confirmed_count / group.guest_count) * 100 : 0}%"
                />
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="card">
      <div class="flex-between mb-4">
        <div class="section-title" style="margin: 0;">近期支出</div>
        <a class="btn btn-secondary btn-sm" href="/weddings/{data.wedding.id}/budget">查看全部 →</a>
      </div>
      {#if data.budget.expenses.length === 0}
        <div class="empty-state" style="padding: 24px;">暂无支出记录</div>
      {:else}
        <div style="display: flex; flex-direction: column; gap: 8px;">
          {#each data.budget.expenses.slice(0, 5) as exp}
            <div class="expense-row">
              <div style="flex: 1;">
                <div style="font-size: 14px;">{exp.description}</div>
                <div class="text-xs text-muted">{formatDate(exp.expense_date)} · {exp.category}</div>
              </div>
              <div style="font-weight: 600; color: #4a3630;">{formatMoney(exp.amount)}</div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .hero-card {
    border: 2px solid #f5ebe6;
    background: linear-gradient(135deg, #fffbf9 0%, #fff 100%);
  }
  .hero-card.over {
    border-color: #f3bcb1;
    background: linear-gradient(135deg, #fff5f3 0%, #fff 100%);
  }
  .couple-name {
    font-size: 28px;
    font-weight: 700;
    color: #4a3630;
    margin-bottom: 6px;
  }
  .meta-row {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 14px;
    color: #7a6f66;
  }
  .stat-card {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    background: #fff;
    border-radius: 12px;
    padding: 16px;
    border: 1px solid #f2efec;
  }
  .stat-card.over-card { border-color: #fde6e2; }
  .stat-icon {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: #faf7f5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
  }
  .stat-card-label {
    font-size: 12px;
    color: #a5968d;
    margin-bottom: 4px;
  }
  .stat-card-value {
    font-size: 20px;
    font-weight: 700;
    color: #4a3630;
  }
  .stat-card-value.over-val { color: #c2513c; }
  .content-grid {
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    gap: 20px;
  }
  .task-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #faf7f5;
    border-radius: 8px;
  }
  .task-status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .task-status-dot.todo { background: #c2b3ab; }
  .task-status-dot.in_progress { background: #e8a598; }
  .task-status-dot.completed { background: #6cc490; }
  .task-title {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 2px;
  }
  .task-title.blocked {
    color: #a5968d;
    text-decoration: line-through;
  }
  .group-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px;
    background: #faf7f5;
    border-radius: 8px;
  }
  .expense-row {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    border-radius: 8px;
    gap: 12px;
  }
  .expense-row:hover { background: #faf7f5; }
</style>
