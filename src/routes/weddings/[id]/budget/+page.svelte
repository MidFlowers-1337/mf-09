<script lang="ts">
  import type { PageData } from './$types';
  import { formatMoney, formatDate, todayStr } from '$lib/utils';
  import { SUPPLIER_CATEGORY_LABELS } from '$lib/types';
  import { invalidateAll } from '$app/navigation';

  export let data: PageData;

  let showModal = false;
  let form = {
    category: '',
    supplier_id: '' as string,
    description: '',
    amount: '' as string,
    expense_date: todayStr(),
    notes: ''
  };

  const commonCategories = [
    '场地费', '餐饮费', '花艺装饰', '摄影摄像', '化妆造型',
    '婚纱礼服', '司仪主持', '音乐乐队', '喜糖喜饼', '请柬印刷', '其他'
  ];

  function reset() {
    form = { category: '', supplier_id: '', description: '', amount: '', expense_date: todayStr(), notes: '' };
  }

  function getCheckboxChecked(e: Event): boolean {
    const target = e.target as HTMLInputElement;
    return target.checked;
  }

  async function addExpense() {
    if (!form.category || !form.description || !form.amount) return;
    const amount = Number(form.amount);
    if (isNaN(amount) || amount <= 0) return;

    const payload = {
      ...form,
      supplier_id: form.supplier_id || null,
      amount
    };

    const res = await fetch(`/api/weddings/${data.wedding.id}/budget`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await res.json().catch(() => ({}));

    if (res.status === 202 && body?.validation?.will_over) {
      const ok = confirm(`⚠️ 添加这笔后将超支 ${formatMoney(body.validation.overage)}\n确定要继续吗？`);
      if (!ok) return;
      const res2 = await fetch(`/api/weddings/${data.wedding.id}/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, force_overage: true })
      });
      if (!res2.ok) {
        const err = await res2.json().catch(() => ({}));
        alert(err?.error || err?.message || '创建失败');
        return;
      }
    } else if (!res.ok) {
      alert(body?.error || body?.message || '创建失败');
      return;
    }

    showModal = false;
    reset();
    await invalidateAll();
  }

  async function deleteExpense(id: number) {
    if (!confirm('确定删除这笔支出？')) return;
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    await invalidateAll();
  }

  $: usedPercent = data.budget.budget_total > 0
    ? Math.min((data.budget.total_spent / data.budget.budget_total) * 100, 100)
    : 0;

  $: maxCategoryTotal = Math.max(...data.budget.by_category.map(c => c.total), 1);
</script>

<div class="container">
  <div class="flex-between mb-4">
    <h1 class="page-title" style="margin: 0;">预算与支出</h1>
    <button class="btn btn-primary" on:click={() => (showModal = true)}>➕ 记一笔</button>
  </div>

  <div class="summary-card card" class:over={data.budget.is_over_budget}>
    <div class="summary-grid">
      <div>
        <div class="text-sm text-muted">预算总额</div>
        <div class="budget-total">{formatMoney(data.budget.budget_total)}</div>
      </div>
      <div class="progress-wrap">
        <div class="flex-between text-sm mb-2">
          <span class="text-muted">已使用 {usedPercent.toFixed(1)}%</span>
          <span class="text-muted">{formatMoney(data.budget.total_spent)} / {formatMoney(data.budget.budget_total)}</span>
        </div>
        <div class="progress-bar" style="height: 16px;">
          <div
            class="progress-fill {data.budget.is_over_budget ? 'progress-danger' : 'progress-normal'}"
            style="width: {usedPercent}%"
          />
        </div>
      </div>
      <div class="text-right">
        <div class="text-sm text-muted">剩余预算</div>
        <div class="remaining" class:over-val={data.budget.is_over_budget}>
          {#if data.budget.is_over_budget}
            <span style="font-size: 20px;">⚠️</span> 超支 {formatMoney(data.budget.overage_amount)}
          {:else}
            {formatMoney(data.budget.budget_remaining)}
          {/if}
        </div>
      </div>
    </div>
  </div>

  <div class="content-grid" style="margin-top: 20px;">
    <div class="card">
      <div class="section-title">支出分类</div>
      {#if data.budget.by_category.length === 0}
        <div class="empty-state" style="padding: 24px;">暂无支出数据</div>
      {:else}
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">
          {#each data.budget.by_category as c}
            <div>
              <div class="flex-between text-sm mb-1">
                <span style="font-weight: 500;">{c.category}</span>
                <span style="color: #7a5c54;">{formatMoney(c.total)}</span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill progress-normal"
                  style="width: {(c.total / maxCategoryTotal) * 100}%"
                />
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="card">
      <div class="section-title">支出明细 ({data.budget.expenses.length})</div>
      {#if data.budget.expenses.length === 0}
        <div class="empty-state" style="padding: 48px 24px;">
          <div style="font-size: 48px; margin-bottom: 12px;">📝</div>
          <div style="font-size: 15px; color: #7a6f66;">还没有支出记录</div>
          <button class="btn btn-primary btn-sm mt-4" on:click={() => (showModal = true)}>记第一笔</button>
        </div>
      {:else}
        <div style="overflow-y: auto; max-height: 520px;">
          <table class="table">
            <thead style="position: sticky; top: 0;">
              <tr>
                <th>日期</th>
                <th>类别</th>
                <th>说明</th>
                <th style="text-align: right;">金额</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {#each data.budget.expenses as exp}
                <tr>
                  <td class="text-sm text-muted">{formatDate(exp.expense_date)}</td>
                  <td>{exp.category}</td>
                  <td>
                    <div>{exp.description}</div>
                    {#if exp.notes}
                      <div class="text-xs text-muted">{exp.notes}</div>
                    {/if}
                  </td>
                  <td style="text-align: right; font-weight: 600;">{formatMoney(exp.amount)}</td>
                  <td style="text-align: right;">
                    <button class="btn-ghost btn-sm" on:click={() => deleteExpense(exp.id)}>🗑️</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
</div>

{#if showModal}
  <div class="modal-backdrop" on:click={(e) => e.target === e.currentTarget && (showModal = false)}>
    <div class="modal">
      <div class="modal-title">记一笔支出</div>
      <div class="form-group">
        <label class="form-label">支出类别 *</label>
        <div class="category-picker">
          {#each commonCategories as cat}
            <button
              type="button"
              class="cat-chip {form.category === cat ? 'active' : ''}"
              on:click={() => (form.category = cat)}
            >
              {cat}
            </button>
          {/each}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">关联供应商</label>
        <select class="form-select" bind:value={form.supplier_id}>
          <option value="">不关联</option>
          {#each data.suppliers as s}
            <option value={s.id}>{SUPPLIER_CATEGORY_LABELS[s.category]} - {s.name}</option>
          {/each}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">支出说明 *</label>
        <input class="form-input" bind:value={form.description} placeholder="例如：婚宴定金" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">金额 (元) *</label>
          <input class="form-input" type="number" min="0" step="0.01" bind:value={form.amount} placeholder="0.00" />
        </div>
        <div class="form-group">
          <label class="form-label">支出日期</label>
          <input class="form-input" type="date" bind:value={form.expense_date} />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea class="form-textarea" bind:value={form.notes} placeholder="可选..." />
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" on:click={() => (showModal = false)}>取消</button>
        <button
          class="btn btn-primary"
          disabled={!form.category || !form.description || !form.amount}
          on:click={addExpense}
        >保存</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .summary-card {
    background: linear-gradient(135deg, #fff9f7 0%, #fff 100%);
    border: 2px solid #f5ebe6;
  }
  .summary-card.over {
    background: linear-gradient(135deg, #fff5f3 0%, #fff 100%);
    border-color: #f3d9d2;
  }
  .summary-grid {
    display: grid;
    grid-template-columns: 200px 1fr 200px;
    gap: 24px;
    align-items: center;
  }
  .budget-total {
    font-size: 28px;
    font-weight: 700;
    color: #4a3630;
    margin-top: 4px;
  }
  .remaining {
    font-size: 22px;
    font-weight: 700;
    color: #2d8c4e;
    margin-top: 4px;
  }
  .remaining.over-val {
    color: #c2513c;
  }
  .text-right { text-align: right; }
  .content-grid {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 20px;
  }
  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #4a3630;
    margin-bottom: 4px;
  }
  .table {
    width: 100%;
    border-collapse: collapse;
  }
  .table th, .table td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid #f2efec;
  }
  .table th {
    background: #faf7f5;
    font-size: 12px;
    font-weight: 600;
    color: #7a5c54;
  }
  .category-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .cat-chip {
    padding: 6px 12px;
    border: 1.5px solid #e8dcd4;
    border-radius: 100px;
    background: #fff;
    font-size: 13px;
    color: #7a5c54;
    cursor: pointer;
    transition: all 0.15s;
  }
  .cat-chip:hover {
    border-color: #d48c7e;
    color: #c47567;
  }
  .cat-chip.active {
    background: #f5ebe6;
    border-color: #d48c7e;
    color: #c47567;
    font-weight: 500;
  }
  .text-xs { font-size: 12px; }
  .text-sm { font-size: 13px; }
  .text-muted { color: #a5968d; }
  .text-success { color: #2d8c4e; }
  .text-danger { color: #c2513c; }
  .mt-4 { margin-top: 16px; }
  .mb-2 { margin-bottom: 8px; }
  .mb-4 { margin-bottom: 16px; }
  .flex-between {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .empty-state {
    text-align: center;
    color: #a5968d;
  }
</style>
