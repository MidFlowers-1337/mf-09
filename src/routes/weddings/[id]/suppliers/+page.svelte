<script lang="ts">
  import type { PageData } from './$types';
  import type { Supplier, SupplierCategory } from '$lib/types';
  import { SUPPLIER_CATEGORY_LABELS } from '$lib/types';
  import { formatMoney } from '$lib/utils';
  import { invalidateAll } from '$app/navigation';

  export let data: PageData;

  let showModal = false;
  let editing: Supplier | null = null;

  let form = {
    category: 'venue' as SupplierCategory,
    name: '',
    contact_person: '',
    phone: '',
    contract_amount: 0,
    paid_amount: 0,
    notes: ''
  };

  const categories: SupplierCategory[] = ['venue', 'florist', 'photography', 'makeup', 'catering', 'mc', 'music', 'dress', 'other'];

  const categoryIcons: Record<SupplierCategory, string> = {
    venue: '🏨', florist: '💐', photography: '📷', makeup: '💄',
    catering: '🍽️', mc: '🎤', music: '🎵', dress: '👗', other: '📦'
  };

  function reset() {
    form = { category: 'venue', name: '', contact_person: '', phone: '', contract_amount: 0, paid_amount: 0, notes: '' };
    editing = null;
  }

  function openNew() {
    reset();
    showModal = true;
  }

  function openEdit(s: Supplier) {
    editing = s;
    form = {
      category: s.category,
      name: s.name,
      contact_person: s.contact_person ?? '',
      phone: s.phone ?? '',
      contract_amount: s.contract_amount,
      paid_amount: s.paid_amount,
      notes: s.notes ?? ''
    };
    showModal = true;
  }

  async function save() {
    if (!form.name.trim()) return;
    if (editing) {
      await fetch(`/api/suppliers/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
    } else {
      await fetch(`/api/weddings/${data.wedding.id}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
    }
    showModal = false;
    reset();
    await invalidateAll();
  }

  async function del(id: number) {
    if (!confirm('确定删除该供应商？')) return;
    await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
    await invalidateAll();
  }

  function getTotalContract(): number {
    return data.suppliers.reduce((s, x) => s + x.contract_amount, 0);
  }
  function getTotalPaid(): number {
    return data.suppliers.reduce((s, x) => s + x.paid_amount, 0);
  }
</script>

<div class="container">
  <div class="flex-between mb-4">
    <h1 class="page-title" style="margin: 0;">供应商管理</h1>
    <button class="btn btn-primary" on:click={openNew}>➕ 添加供应商</button>
  </div>

  <div class="grid-4 mb-4">
    <div class="card">
      <div class="text-sm text-muted">供应商总数</div>
      <div class="stat">{data.suppliers.length}</div>
    </div>
    <div class="card">
      <div class="text-sm text-muted">合同总额</div>
      <div class="stat">{formatMoney(getTotalContract())}</div>
    </div>
    <div class="card">
      <div class="text-sm text-muted">已付款</div>
      <div class="stat text-success">{formatMoney(getTotalPaid())}</div>
    </div>
    <div class="card">
      <div class="text-sm text-muted">待付款</div>
      <div class="stat text-danger">{formatMoney(getTotalContract() - getTotalPaid())}</div>
    </div>
  </div>

  {#if data.suppliers.length === 0}
    <div class="card empty-state">
      <div style="font-size: 48px; margin-bottom: 12px;">📋</div>
      <div style="font-size: 15px; color: #7a6f66;">还没有登记供应商</div>
      <button class="btn btn-primary btn-sm mt-4" on:click={openNew}>添加第一个供应商</button>
    </div>
  {:else}
    <div class="supplier-grid">
      {#each categories as cat}
        {#each data.suppliers.filter(s => s.category === cat) as s}
          <div class="card supplier-card">
            <div class="flex-between">
              <div class="cat-title">
                <span class="cat-icon">{categoryIcons[cat]}</span>
                <span>{SUPPLIER_CATEGORY_LABELS[cat]}</span>
              </div>
              <div class="flex gap-2">
                <button class="btn-ghost btn-sm" on:click={() => openEdit(s)}>✏️</button>
                <button class="btn-ghost btn-sm" on:click={() => del(s.id)}>🗑️</button>
              </div>
            </div>
            <div class="sup-name">{s.name}</div>
            {#if s.contact_person || s.phone}
              <div class="contact-info text-sm">
                {#if s.contact_person}
                  <div>联系人：{s.contact_person}</div>
                {/if}
                {#if s.phone}
                  <div>☎️ {s.phone}</div>
                {/if}
              </div>
            {/if}
            <div class="payment-bar">
              <div class="flex-between text-sm mb-2">
                <span class="text-muted">合同 {formatMoney(s.contract_amount)}</span>
                <span>已付 <b class="text-success">{formatMoney(s.paid_amount)}</b></span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill {s.paid_amount >= s.contract_amount ? 'progress-normal' : 'progress-normal'}"
                  style="width: {s.contract_amount > 0 ? Math.min((s.paid_amount / s.contract_amount) * 100, 100) : 0}%"
                />
              </div>
              {#if s.paid_amount < s.contract_amount}
                <div class="text-sm text-danger mt-2">
                  还差 {formatMoney(s.contract_amount - s.paid_amount)}
                </div>
              {:else if s.paid_amount >= s.contract_amount}
                <div class="text-sm text-success mt-2">✅ 已结清</div>
              {/if}
            </div>
            {#if s.notes}
              <div class="text-sm text-muted mt-2" style="border-top: 1px solid #f2efec; padding-top: 8px;">
                💬 {s.notes}
              </div>
            {/if}
          </div>
        {/each}
      {/each}
    </div>
  {/if}
</div>

{#if showModal}
  <div class="modal-backdrop" on:click={(e) => e.target === e.currentTarget && (showModal = false)}>
    <div class="modal">
      <div class="modal-title">{editing ? '编辑供应商' : '添加供应商'}</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">类别</label>
          <select class="form-select" bind:value={form.category}>
            {#each categories as c}
              <option value={c}>{categoryIcons[c]} {SUPPLIER_CATEGORY_LABELS[c]}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">名称 *</label>
          <input class="form-input" bind:value={form.name} placeholder="例如：XX大酒店" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">联系人</label>
          <input class="form-input" bind:value={form.contact_person} />
        </div>
        <div class="form-group">
          <label class="form-label">电话</label>
          <input class="form-input" bind:value={form.phone} />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">合同金额</label>
          <input class="form-input" type="number" min="0" step="0.01" bind:value={form.contract_amount} />
        </div>
        <div class="form-group">
          <label class="form-label">已付金额</label>
          <input class="form-input" type="number" min="0" step="0.01" bind:value={form.paid_amount} />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea class="form-textarea" bind:value={form.notes} placeholder="合同要点、交付时间等..." />
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" on:click={() => (showModal = false)}>取消</button>
        <button class="btn btn-primary" disabled={!form.name.trim()} on:click={save}>
          {editing ? '保存' : '添加'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .stat { font-size: 22px; font-weight: 700; color: #4a3630; margin-top: 4px; }
  .stat.text-success { color: #2d8c4e; }
  .stat.text-danger { color: #c2513c; }
  .supplier-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }
  .supplier-card { display: flex; flex-direction: column; gap: 10px; }
  .cat-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #7a5c54;
    background: #f5ebe6;
    padding: 4px 10px;
    border-radius: 100px;
    width: fit-content;
  }
  .cat-icon { font-size: 14px; }
  .sup-name {
    font-size: 18px;
    font-weight: 700;
    color: #4a3630;
  }
  .contact-info {
    color: #7a6f66;
    line-height: 1.7;
  }
  .payment-bar {
    background: #faf7f5;
    border-radius: 8px;
    padding: 12px;
  }
</style>
