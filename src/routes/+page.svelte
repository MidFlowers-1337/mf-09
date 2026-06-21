<script lang="ts">
  import type { PageData } from './$types';
  import { formatDateFriendly, formatMoney, daysUntil } from '$lib/utils';
  import { invalidateAll, goto } from '$app/navigation';

  export let data: PageData;
  let showModal = false;
  let form = {
    groom_name: '',
    bride_name: '',
    wedding_date: '',
    budget_total: '',
    venue: '',
    notes: ''
  };
  let submitting = false;

  function resetForm() {
    form = { groom_name: '', bride_name: '', wedding_date: '', budget_total: '', venue: '', notes: '' };
  }

  async function createWedding() {
    if (!form.groom_name || !form.bride_name || !form.wedding_date) return;
    submitting = true;
    try {
      const res = await fetch('/api/weddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groom_name: form.groom_name,
          bride_name: form.bride_name,
          wedding_date: form.wedding_date,
          venue: form.venue || null,
          budget_total: Number(form.budget_total) || 0,
          notes: form.notes || null
        })
      });
      if (res.ok) {
        const body = await res.json();
        showModal = false;
        resetForm();
        await invalidateAll();
        if (body?.id) {
          await goto(`/weddings/${body.id}`);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || err?.message || '创建失败');
      }
    } finally {
      submitting = false;
    }
  }
</script>

<div class="container">
  <div class="flex-between mb-4">
    <h1 class="page-title" style="margin: 0;">我的婚礼</h1>
    <button class="btn btn-primary" on:click={() => (showModal = true)}>
      <span>➕</span> 新建婚礼
    </button>
  </div>

  {#if data.weddings.length === 0}
    <div class="card empty-state">
      <div style="font-size: 48px; margin-bottom: 16px;">💐</div>
      <div style="font-size: 16px; color: #7a6f66; margin-bottom: 8px;">还没有婚礼</div>
      <div style="font-size: 13px; color: #a5968d; margin-bottom: 24px;">
        点击右上角新建一场婚礼，开始你的筹备工作
      </div>
      <button class="btn btn-primary" on:click={() => (showModal = true)}>创建第一场婚礼</button>
    </div>
  {:else}
    <div class="grid-3">
      {#each data.weddings as wedding}
        <a href="/weddings/{wedding.id}" class="wedding-card">
          <div class="card-header">
            <div class="wedding-couple">
              {wedding.groom_name} ❤️ {wedding.bride_name}
            </div>
            {#if daysUntil(wedding.wedding_date) > 0}
              <span class="tag tag-blue">{daysUntil(wedding.wedding_date)} 天后</span>
            {:else if daysUntil(wedding.wedding_date) === 0}
              <span class="tag tag-red">就是今天！</span>
            {:else}
              <span class="tag tag-gray">已完成</span>
            {/if}
          </div>
          <div class="wedding-date">{formatDateFriendly(wedding.wedding_date)}</div>
          {#if wedding.venue}
            <div class="wedding-venue">📍 {wedding.venue}</div>
          {/if}

          <div class="stats-row">
            <div class="stat-item">
              <div class="stat-label">任务进度</div>
              <div class="stat-value">
                {wedding.completed_tasks}/{wedding.total_tasks}
              </div>
              <div class="progress-bar mt-2">
                <div
                  class="progress-fill progress-normal"
                  style="width: {wedding.total_tasks > 0 ? (wedding.completed_tasks / wedding.total_tasks) * 100 : 0}%"
                />
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-label">预算</div>
              <div class="stat-value" class:over={wedding.is_over_budget}>
                {formatMoney(wedding.total_spent)}
                <span class="text-muted text-xs">/{formatMoney(wedding.budget_total)}</span>
              </div>
              <div class="progress-bar mt-2">
                <div
                  class="progress-fill {wedding.is_over_budget ? 'progress-danger' : 'progress-normal'}"
                  style="width: {Math.min(wedding.budget_total > 0 ? (wedding.total_spent / wedding.budget_total) * 100 : 0, 100)}%"
                />
              </div>
            </div>
          </div>

          <div class="quick-stats">
            <span class="tag tag-purple">👥 宾客 {wedding.confirmed_guests}/{wedding.total_guests}</span>
            {#if wedding.is_over_budget}
              <span class="tag tag-red">⚠️ 超支 {formatMoney(wedding.total_spent - wedding.budget_total)}</span>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

{#if showModal}
  <div class="modal-backdrop" on:click={(e) => e.target === e.currentTarget && (showModal = false)}>
    <div class="modal">
      <div class="modal-title">新建婚礼</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">新郎姓名</label>
          <input class="form-input" bind:value={form.groom_name} required placeholder="例如：张先生" />
        </div>
        <div class="form-group">
          <label class="form-label">新娘姓名</label>
          <input class="form-input" bind:value={form.bride_name} required placeholder="例如：李小姐" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">婚礼日期</label>
          <input class="form-input" bind:value={form.wedding_date} type="date" required />
        </div>
        <div class="form-group">
          <label class="form-label">预算总额 (元)</label>
          <input class="form-input" bind:value={form.budget_total} type="number" min="0" step="0.01" placeholder="例如：100000" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">婚礼场地</label>
        <input class="form-input" bind:value={form.venue} placeholder="例如：XX大酒店宴会厅" />
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea class="form-textarea" bind:value={form.notes} placeholder="任何需要记录的信息..." />
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" on:click={() => (showModal = false)}>取消</button>
        <button type="button" class="btn btn-primary" on:click={createWedding} disabled={submitting}>
          {submitting ? '创建中...' : '创建婚礼'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .wedding-card {
    display: block;
    background: #fff;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    transition: all 0.2s;
    border: 2px solid transparent;
  }
  .wedding-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(196, 117, 103, 0.12);
    border-color: #f5ebe6;
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }
  .wedding-couple {
    font-size: 18px;
    font-weight: 600;
    color: #4a3630;
  }
  .wedding-date {
    font-size: 14px;
    color: #7a5c54;
    margin-bottom: 6px;
  }
  .wedding-venue {
    font-size: 13px;
    color: #a5968d;
    margin-bottom: 20px;
  }
  .stats-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    padding: 16px 0;
    border-top: 1px solid #f2efec;
    border-bottom: 1px solid #f2efec;
    margin-bottom: 16px;
  }
  .stat-label {
    font-size: 12px;
    color: #a5968d;
    margin-bottom: 4px;
  }
  .stat-value {
    font-size: 16px;
    font-weight: 600;
    color: #4a3630;
  }
  .stat-value.over { color: #c2513c; }
  .quick-stats {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
</style>
