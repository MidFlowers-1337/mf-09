<script lang="ts">
  import type { PageData } from './$types';
  import { invalidateAll } from '$app/navigation';

  export let data: PageData;

  let activeGroupId: number | null = null;
  let activeTableId: number | null = null;

  let showGuestModal = false;
  let showGroupModal = false;
  let showTableModal = false;

  let editingGuest: any = null;
  let editingGroup: any = null;
  let editingTable: any = null;

  let guestForm = {
    name: '',
    phone: '',
    group_id: '' as string,
    table_id: '' as string,
    attending: 'pending' as string,
    plus_count: 1,
    dietary: '',
    notes: ''
  };

  let groupForm = { name: '' };
  let tableForm = { name: '', capacity: 10 };

  function openNewGuest() {
    editingGuest = null;
    guestForm = {
      name: '',
      phone: '',
      group_id: activeGroupId ? String(activeGroupId) : '',
      table_id: activeTableId ? String(activeTableId) : '',
      attending: 'pending',
      plus_count: 1,
      dietary: '',
      notes: ''
    };
    showGuestModal = true;
  }

  function openEditGuest(guest: any) {
    editingGuest = guest;
    guestForm = {
      name: guest.name,
      phone: guest.phone || '',
      group_id: guest.group_id ? String(guest.group_id) : '',
      table_id: guest.table_id ? String(guest.table_id) : '',
      attending: guest.attending,
      plus_count: guest.plus_count,
      dietary: guest.dietary || '',
      notes: guest.notes || ''
    };
    showGuestModal = true;
  }

  function openNewGroup() {
    editingGroup = null;
    groupForm = { name: '' };
    showGroupModal = true;
  }

  function openEditGroup(group: any) {
    editingGroup = group;
    groupForm = { name: group.name };
    showGroupModal = true;
  }

  function openNewTable() {
    editingTable = null;
    tableForm = { name: '', capacity: 10 };
    showTableModal = true;
  }

  function openEditTable(table: any) {
    editingTable = table;
    tableForm = { name: table.name, capacity: table.capacity };
    showTableModal = true;
  }

  $: filteredGuests = data.guests.filter(g => {
    if (activeGroupId && g.group_id !== activeGroupId) return false;
    if (activeTableId && g.table_id !== activeTableId) return false;
    return true;
  });

  async function saveGuest() {
    if (!guestForm.name) return;
    const payload = {
      ...guestForm,
      group_id: guestForm.group_id ? Number(guestForm.group_id) : null,
      table_id: guestForm.table_id ? Number(guestForm.table_id) : null,
      plus_count: Number(guestForm.plus_count) || 1
    };

    let res;
    if (editingGuest) {
      res = await fetch(`/api/guests/${editingGuest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`/api/weddings/${data.wedding.id}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || err?.message || '保存失败');
      return;
    }
    showGuestModal = false;
    await invalidateAll();
  }

  async function deleteGuest(id: number) {
    if (!confirm('确定删除这位宾客？')) return;
    await fetch(`/api/guests/${id}`, { method: 'DELETE' });
    await invalidateAll();
  }

  async function saveGroup() {
    if (!groupForm.name) return;
    let res;
    if (editingGroup) {
      res = await fetch(`/api/groups/${editingGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupForm)
      });
    } else {
      res = await fetch(`/api/weddings/${data.wedding.id}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupForm)
      });
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || err?.message || '保存失败');
      return;
    }
    showGroupModal = false;
    await invalidateAll();
  }

  async function deleteGroup(id: number) {
    if (!confirm('确定删除这个分组？组内宾客将变为未分组。')) return;
    await fetch(`/api/groups/${id}`, { method: 'DELETE' });
    if (activeGroupId === id) activeGroupId = null;
    await invalidateAll();
  }

  async function saveTable() {
    if (!tableForm.name) return;
    const payload = { ...tableForm, capacity: Number(tableForm.capacity) || 10 };
    let res;
    if (editingTable) {
      res = await fetch(`/api/tables/${editingTable.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`/api/weddings/${data.wedding.id}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || err?.message || '保存失败');
      return;
    }
    showTableModal = false;
    await invalidateAll();
  }

  async function deleteTable(id: number) {
    if (!confirm('确定删除这桌？该桌宾客将变为未安排。')) return;
    await fetch(`/api/tables/${id}`, { method: 'DELETE' });
    if (activeTableId === id) activeTableId = null;
    await invalidateAll();
  }

  const attendingLabel = (s: string) => ({ yes: '✅ 确认出席', no: '❌ 不出席', pending: '⏳ 待确认' }[s] || s);
</script>

<div class="container">
  <div class="page-header">
    <h1 class="page-title" style="margin: 0;">宾客管理</h1>
    <div class="stats-row">
      <div class="stat-chip">
        <span class="stat-label">总人数</span>
        <span class="stat-value">{data.stats.total_guests}</span>
      </div>
      <div class="stat-chip">
        <span class="stat-label">确认出席</span>
        <span class="stat-value text-success">{data.stats.confirmed_attending}</span>
      </div>
      <div class="stat-chip">
        <span class="stat-label">待确认</span>
        <span class="stat-value text-warning">{data.stats.pending}</span>
      </div>
    </div>
  </div>

  <div class="three-col">
    <!-- 分组栏 -->
    <div class="card sidebar-card">
      <div class="card-header">
      <span class="section-title">分组</span>
      <button class="btn btn-primary btn-sm" on:click={openNewGroup}>+ 新增</button>
    </div>
    <div class="list">
      <div
        class="list-item {activeGroupId === null ? 'active' : ''}"
        on:click={() => (activeGroupId = null)}
      >
        <span class="list-item-name">全部宾客</span>
        <span class="list-item-count">{data.stats.total_guests}</span>
      </div>
      {#each data.groups as g}
        <div
          class="list-item {activeGroupId === g.id ? 'active' : ''}"
          on:click={() => (activeGroupId = g.id)}
        >
          <span class="list-item-name">{g.name}</span>
          <span class="list-actions">
            <span class="list-item-count">{g.guest_count}</span>
            <button class="icon-btn" on:click|stopPropagation={() => openEditGroup(g)}>✏️</button>
            <button class="icon-btn" on:click|stopPropagation={() => deleteGroup(g.id)}>🗑️</button>
          </span>
        </div>
      {/each}
    </div>
  </div>

    <!-- 宾客列表 -->
    <div class="card main-card">
      <div class="card-header">
        <span class="section-title">
          宾客
          {#if activeGroupId}
            <span class="filter-tag">按分组筛选</span>
          {/if}
          {#if activeTableId}
            <span class="filter-tag">按桌次筛选</span>
          {/if}
        </span>
        <button class="btn btn-primary btn-sm" on:click={openNewGuest}>+ 新增宾客</button>
      </div>
      <div class="guest-list">
        {#if filteredGuests.length === 0}
          <div class="empty-state" style="padding: 40px 20px;">
            <div style="font-size: 32px; margin-bottom: 8px;">👥</div>
            <div style="font-size: 13px; color: #a5968d;">暂无宾客</div>
          </div>
        {:else}
          {#each filteredGuests as guest}
            <div class="guest-card">
              <div class="guest-main">
                <div class="guest-name">{guest.name}</div>
                <div class="guest-attending guest-attending-{guest.attending}">
                  {attendingLabel(guest.attending)}
                </div>
              </div>
              <div class="guest-meta">
                {#if guest.group_name}
                  <span class="meta-tag">{guest.group_name}</span>
                {/if}
                {#if guest.table_name}
                  <span class="meta-tag meta-tag-table">🪑 {guest.table_name}</span>
                {/if}
                {#if guest.plus_count > 1}
                  <span class="meta-tag">+{guest.plus_count - 1}人陪同</span>
                {/if}
              </div>
              <div class="guest-actions">
                <button class="icon-btn" on:click={() => openEditGuest(guest)}>✏️</button>
                <button class="icon-btn" on:click={() => deleteGuest(guest.id)}>🗑️</button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <!-- 桌次栏 -->
    <div class="card sidebar-card">
      <div class="card-header">
        <span class="section-title">桌次</span>
        <button class="btn btn-primary btn-sm" on:click={openNewTable}>+ 新增</button>
      </div>
      <div class="list">
        <div
          class="list-item {activeTableId === null ? 'active' : ''}"
          on:click={() => (activeTableId = null)}
        >
          <span class="list-item-name">全部桌次</span>
          <span class="list-item-count">{data.stats.total_tables}</span>
        </div>
        {#each data.tables as t}
          <div
            class="list-item {activeTableId === t.id ? 'active' : ''} {t.is_over ? 'over' : ''}"
            on:click={() => (activeTableId = t.id)}
          >
            <span class="list-item-name">
              {t.name}
              {#if t.is_over}<span title="超员"> ⚠️</span>{/if}
            </span>
            <span class="list-actions">
              <span class="list-item-count {t.is_over ? 'over-count' : ''}">
                {t.seated_count}/{t.capacity}
              </span>
              <button class="icon-btn" on:click|stopPropagation={() => openEditTable(t)}>✏️</button>
              <button class="icon-btn" on:click|stopPropagation={() => deleteTable(t.id)}>🗑️</button>
            </span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<!-- 宾客弹窗 -->
{#if showGuestModal}
  <div class="modal-backdrop" on:click={(e) => e.target === e.currentTarget && (showGuestModal = false)}>
    <div class="modal modal-wide">
      <div class="modal-title">{editingGuest ? '编辑宾客' : '新增宾客'}</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">姓名 *</label>
          <input class="form-input" bind:value={guestForm.name} placeholder="宾客姓名" />
        </div>
        <div class="form-group">
          <label class="form-label">电话</label>
          <input class="form-input" bind:value={guestForm.phone} placeholder="联系电话" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">分组</label>
          <select class="form-select" bind:value={guestForm.group_id}>
            <option value="">未分组</option>
            {#each data.groups as g}
              <option value={g.id}>{g.name}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">桌次</label>
          <select class="form-select" bind:value={guestForm.table_id}>
            <option value="">未安排</option>
            {#each data.tables as t}
              <option value={t.id}>{t.name} ({t.seated_count}/{t.capacity})</option>
            {/each}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">出席状态</label>
          <select class="form-select" bind:value={guestForm.attending}>
            <option value="pending">待确认</option>
            <option value="yes">确认出席</option>
            <option value="no">不出席</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">人数 (含本人)</label>
          <input class="form-input" type="number" min="1" bind:value={guestForm.plus_count} />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">饮食禁忌</label>
        <input class="form-input" bind:value={guestForm.dietary} placeholder="例如：清真、素食、海鲜过敏..." />
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea class="form-textarea" bind:value={guestForm.notes} placeholder="其他备注..." />
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" on:click={() => (showGuestModal = false)}>取消</button>
        <button class="btn btn-primary" disabled={!guestForm.name} on:click={saveGuest}>保存</button>
      </div>
    </div>
  </div>
{/if}

<!-- 分组弹窗 -->
{#if showGroupModal}
  <div class="modal-backdrop" on:click={(e) => e.target === e.currentTarget && (showGroupModal = false)}>
    <div class="modal">
      <div class="modal-title">{editingGroup ? '编辑分组' : '新增分组'}</div>
      <div class="form-group">
        <label class="form-label">分组名称 *</label>
        <input class="form-input" bind:value={groupForm.name} placeholder="例如：男方亲戚" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" on:click={() => (showGroupModal = false)}>取消</button>
        <button class="btn btn-primary" disabled={!groupForm.name} on:click={saveGroup}>保存</button>
      </div>
    </div>
  </div>
{/if}

<!-- 桌次弹窗 -->
{#if showTableModal}
  <div class="modal-backdrop" on:click={(e) => e.target === e.currentTarget && (showTableModal = false)}>
    <div class="modal">
      <div class="modal-title">{editingTable ? '编辑桌次' : '新增桌次'}</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">桌号/桌名 *</label>
          <input class="form-input" bind:value={tableForm.name} placeholder="例如：主桌、1号桌" />
        </div>
        <div class="form-group">
          <label class="form-label">容纳人数</label>
          <input class="form-input" type="number" min="1" bind:value={tableForm.capacity} />
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" on:click={() => (showTableModal = false)}>取消</button>
        <button class="btn btn-primary" disabled={!tableForm.name} on:click={saveTable}>保存</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  .stats-row {
    display: flex;
    gap: 12px;
  }
  .stat-chip {
    background: #fff;
    border: 1px solid #f0ebe6;
    border-radius: 10px;
    padding: 10px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
  }
  .stat-label {
    font-size: 12px;
    color: #a5968d;
    margin-bottom: 2px;
  }
  .stat-value {
    font-size: 20px;
    font-weight: 700;
    color: #4a3630;
  }
  .three-col {
    display: grid;
    grid-template-columns: 220px 1fr 240px;
    gap: 16px;
    min-height: 600px;
  }
  .sidebar-card { padding: 0; }
  .main-card { padding: 0; display: flex; flex-direction: column; }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    border-bottom: 1px solid #f2efec;
  }
  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: #4a3630;
  }
  .filter-tag {
    background: #f5ebe6;
    color: #c47567;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 100px;
    margin-left: 8px;
    font-weight: normal;
  }
  .list {
    padding: 8px;
    overflow-y: auto;
    flex: 1;
  }
  .list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    margin-bottom: 2px;
  }
  .list-item:hover { background: #faf7f5; }
  .list-item.active {
    background: #f5ebe6;
  }
  .list-item.over {
    background: #fff5f3;
  }
  .list-item-name {
    font-size: 14px;
    color: #4a3630;
  }
  .list-item-count {
    font-size: 12px;
    color: #a5968d;
    background: #f2efec;
    padding: 2px 8px;
    border-radius: 100px;
  }
  .list-item-count.over-count {
    background: #f3d9d2;
    color: #c2513c;
    font-weight: 600;
  }
  .list-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 13px;
    opacity: 0.6;
  }
  .icon-btn:hover {
    background: #f2efec;
    opacity: 1;
  }
  .guest-list {
    padding: 12px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .guest-card {
    background: #fff;
    border: 1px solid #f0ebe6;
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .guest-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .guest-name {
    font-weight: 600;
    font-size: 14px;
    color: #4a3630;
  }
  .guest-attending {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 100px;
  }
  .guest-attending-yes {
    background: #e5f6ec;
    color: #2d8c4e;
  }
  .guest-attending-no {
    background: #f3d9d2;
    color: #c2513c;
  }
  .guest-attending-pending {
    background: #fef3e6;
    color: #c98a3d;
  }
  .guest-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .meta-tag {
    background: #f5ebe6;
    color: #8b6b60;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 6px;
  }
  .meta-tag-table {
    background: #e8f4ed;
    color: #3f8c58;
  }
  .guest-actions {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
    padding-top: 8px;
    border-top: 1px solid #f2efec;
  }
  .empty-state {
    text-align: center;
    color: #a5968d;
  }
  .text-success { color: #2d8c4e; }
  .text-warning { color: #c98a3d; }
  .text-danger { color: #c2513c; }
</style>
