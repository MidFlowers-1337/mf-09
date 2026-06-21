<script lang="ts">
  import type { PageData } from './$types';
  import type { GuestDetail, GuestGroupWithStats, TableWithStats, AttendanceStatus } from '$lib/types';
  import { ATTENDANCE_LABELS, DEFAULT_GUEST_GROUPS } from '$lib/types';
  import { formatMoney } from '$lib/utils';
  import { invalidateAll } from '$app/navigation';

  export let data: PageData;

  let showGuestModal = false;
  let showGroupModal = false;
  let showTableModal = false;
  let editingGuest: GuestDetail | null = null;

  let guestForm = {
    name: '',
    phone: '',
    group_id: '' as string,
    table_id: '' as string,
    attendance_status: 'pending' as AttendanceStatus,
    plus_one: 0,
    notes: ''
  };
  let groupName = '';
  let newTable = { table_number: 1, name: '', capacity: 10 };
  let filterGroup: number | 'all' = 'all';
  let filterTable: number | 'all' = 'all';
  let searchQuery = '';

  function resetGuestForm() {
    guestForm = { name: '', phone: '', group_id: '', table_id: '', attendance_status: 'pending', plus_one: 0, notes: '' };
    editingGuest = null;
  }

  function openNewGuest() {
    resetGuestForm();
    showGuestModal = true;
  }
  function openEditGuest(g: GuestDetail) {
    editingGuest = g;
    guestForm = {
      name: g.name,
      phone: g.phone ?? '',
      group_id: g.group_id ? String(g.group_id) : '',
      table_id: g.table_id ? String(g.table_id) : '',
      attendance_status: g.attendance_status,
      plus_one: g.plus_one,
      notes: g.notes ?? ''
    };
    showGuestModal = true;
  }

  async function saveGuest() {
    if (!guestForm.name.trim()) return;
    if (editingGuest) {
      await fetch(`/api/guests/${editingGuest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...guestForm,
          group_id: guestForm.group_id || null,
          table_id: guestForm.table_id || null
        })
      });
    } else {
      await fetch(`/api/weddings/${data.wedding.id}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...guestForm,
          group_id: guestForm.group_id || null,
          table_id: guestForm.table_id || null
        })
      });
    }
    showGuestModal = false;
    resetGuestForm();
    await invalidateAll();
  }

  async function deleteGuest(id: number) {
    if (!confirm('确定删除该宾客？')) return;
    await fetch(`/api/guests/${id}`, { method: 'DELETE' });
    await invalidateAll();
  }

  async function createGroup() {
    if (!groupName.trim()) return;
    await fetch(`/api/weddings/${data.wedding.id}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: groupName })
    });
    groupName = '';
    showGroupModal = false;
    await invalidateAll();
  }

  async function deleteGroup(id: number) {
    if (!confirm('确定删除该分组？宾客不会被删除，只是不再属于任何分组')) return;
    await fetch(`/api/groups/${id}`, { method: 'DELETE' });
    await invalidateAll();
  }

  async function createTable() {
    if (!newTable.table_number) return;
    await fetch(`/api/weddings/${data.wedding.id}/tables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTable)
    });
    newTable = { table_number: (data.tables.length + 1), name: '', capacity: 10 };
    showTableModal = false;
    await invalidateAll();
  }

  async function deleteTable(id: number) {
    if (!confirm('确定删除该桌？座位上的宾客不会被删除，只是不再安排桌次')) return;
    await fetch(`/api/tables/${id}`, { method: 'DELETE' });
    await invalidateAll();
  }

  function getFilteredGuests(): GuestDetail[] {
    return data.guests.filter(g => {
      if (filterGroup !== 'all' && g.group_id !== filterGroup) return false;
      if (filterTable !== 'all' && g.table_id !== filterTable) return false;
      if (searchQuery && !g.name.includes(searchQuery)) return false;
      return true;
    });
  }

  function getUnseatedGuestsCount(): number {
    return data.guests.filter(g => !g.table_id && g.attendance_status !== 'declined').length
      + data.guests.filter(g => !g.table_id && g.attendance_status !== 'declined').reduce((s, g) => s + g.plus_one, 0);
  }

  function getTotalConfirmedWithPlus(): number {
    return data.guests.filter(g => g.attendance_status === 'confirmed').length
      + data.guests.filter(g => g.attendance_status === 'confirmed').reduce((s, g) => s + g.plus_one, 0);
  }

  function getTotalTablesCapacity(): number {
    return data.tables.reduce((s, t) => s + t.capacity, 0);
  }
</script>

<div class="container">
  <div class="flex-between mb-4">
    <h1 class="page-title" style="margin: 0;">宾客管理</h1>
    <button class="btn btn-primary" on:click={openNewGuest}>➕ 添加宾客</button>
  </div>

  <div class="stats-bar grid-4">
    <div class="stat-item card">
      <div class="stat-label">总邀请</div>
      <div class="stat-value">{data.stats.total_with_plus}</div>
      <div class="text-xs text-muted">{data.stats.total} 人 + {data.stats.total_with_plus - data.stats.total} 个携伴</div>
    </div>
    <div class="stat-item card">
      <div class="stat-label">已确认</div>
      <div class="stat-value text-success">{getTotalConfirmedWithPlus()}</div>
      <div class="text-xs text-muted">主宾 {data.stats.confirmed} + 携伴 {getTotalConfirmedWithPlus() - data.stats.confirmed}</div>
    </div>
    <div class="stat-item card">
      <div class="stat-label">席位安排</div>
      <div class="stat-value">{getTotalTablesCapacity()}</div>
      <div class="text-xs text-muted">
        {#if getUnseatedGuestsCount() > 0}
          <span class="text-danger">还有 {getUnseatedGuestsCount()} 人未安排</span>
        {:else}
          <span class="text-success">全部已入座</span>
        {/if}
      </div>
    </div>
    <div class="stat-item card">
      <div class="stat-label">待确认 / 婉拒</div>
      <div class="stat-value">
        <span style="color: #997404;">{data.stats.pending}</span>
        <span class="text-muted"> / </span>
        <span style="color: #a5968d;">{data.stats.declined}</span>
      </div>
      <div class="text-xs text-muted">确认率 {data.stats.total > 0 ? Math.round((data.stats.confirmed / data.stats.total) * 100) : 0}%</div>
    </div>
  </div>

  <div class="main-grid" style="margin-top: 20px;">
    <div class="sidebar">
      <div class="card mb-4">
        <div class="flex-between" style="margin-bottom: 12px;">
          <div class="section-title" style="margin: 0;">分组</div>
          <button class="btn-link" on:click={() => (showGroupModal = true)}>+ 新分组</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div
            class="group-item {filterGroup === 'all' ? 'active' : ''}"
            on:click={() => (filterGroup = 'all')}
          >
            <span>全部宾客</span>
            <span class="count">{data.guests.length}</span>
          </div>
          {#each data.groups as g}
            <div
              class="group-item {filterGroup === g.id ? 'active' : ''}"
              on:click={() => (filterGroup = filterGroup === g.id ? 'all' : g.id)}
            >
              <span>{g.name}</span>
              <span class="flex gap-2 items-center">
                <span class="count">{g.confirmed_count}/{g.guest_count}</span>
                <button
                  class="btn-ghost btn-sm"
                  style="padding: 0 4px;"
                  on:click|stopPropagation={() => deleteGroup(g.id)}
                >✕</button>
              </span>
            </div>
          {/each}
          {#each DEFAULT_GUEST_GROUPS.filter(n => !data.groups.find(g => g.name === n)) as missingName}
            <button
              class="btn-link"
              style="text-align: left; padding: 6px 10px; color: #c47567;"
              on:click={async () => {
                await fetch(`/api/weddings/${data.wedding.id}/groups`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: missingName })
                });
                await invalidateAll();
              }}
            >+ 添加"{missingName}"分组</button>
          {/each}
        </div>
      </div>

      <div class="card">
        <div class="flex-between" style="margin-bottom: 12px;">
          <div class="section-title" style="margin: 0;">桌次</div>
          <button class="btn-link" on:click={() => (showTableModal = true)}>+ 新桌</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div
            class="group-item {filterTable === 'all' ? 'active' : ''}"
            on:click={() => (filterTable = 'all')}
          >
            <span>全部桌次</span>
          </div>
          {#each data.tables as t}
            <div
              class="group-item {filterTable === t.id ? 'active' : ''}"
              class:table-over={t.is_over}
              on:click={() => (filterTable = filterTable === t.id ? 'all' : t.id)}
            >
              <div style="flex: 1;">
                <div style="font-size: 13px; font-weight: 500;">
                  第 {t.table_number} 桌 {t.name ? `· ${t.name}` : ''}
                </div>
                <div class="text-xs text-muted">
                  {t.guest_count}/{t.capacity} 人
                  {#if t.is_full && !t.is_over}
                    <span class="tag tag-yellow" style="margin-left: 4px;">坐满</span>
                  {:else if t.is_over}
                    <span class="tag tag-red">超员</span>
                  {/if}
                </div>
              </div>
              <button
                class="btn-ghost btn-sm"
                style="padding: 0 4px;"
                on:click|stopPropagation={() => deleteTable(t.id)}
              >✕</button>
            </div>
          {/each}
          {#if data.tables.length === 0}
            <div class="text-sm text-muted" style="padding: 8px;">还没有桌次</div>
          {/if}
        </div>
      </div>
    </div>

    <div class="content-area">
      <div class="card">
        <div class="flex-between mb-4">
          <div class="section-title" style="margin: 0;">
            宾客列表 ({getFilteredGuests().length})
          </div>
          <input
            class="form-input"
            style="width: 200px; padding: 6px 10px; font-size: 13px;"
            placeholder="搜索姓名..."
            bind:value={searchQuery}
          />
        </div>
        {#if getFilteredGuests().length === 0}
          <div class="empty-state">
            暂无宾客
            <button class="btn btn-primary btn-sm mt-4" on:click={openNewGuest}>添加第一个宾客</button>
          </div>
        {:else}
          <table class="table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>分组</th>
                <th>桌次</th>
                <th>状态</th>
                <th>携伴</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {#each getFilteredGuests() as g}
                <tr>
                  <td>
                    <div style="font-weight: 500;">{g.name}</div>
                    {#if g.phone}
                      <div class="text-xs text-muted">{g.phone}</div>
                    {/if}
                  </td>
                  <td>{g.group_name || <span class="text-muted">—</span>}</td>
                  <td>
                    {#if g.table_number}
                      第 {g.table_number} 桌
                    {:else}
                      <span class="text-muted">未安排</span>
                    {/if}
                  </td>
                  <td>
                    <span class="tag {g.attendance_status === 'confirmed' ? 'tag-green' : g.attendance_status === 'declined' ? 'tag-gray' : 'tag-yellow'}">
                      {ATTENDANCE_LABELS[g.attendance_status]}
                    </span>
                  </td>
                  <td>{g.plus_one > 0 ? `+${g.plus_one}` : '—'}</td>
                  <td>
                    <div class="flex gap-2">
                      <button class="btn-link" on:click={() => openEditGuest(g)}>编辑</button>
                      <button class="btn-link" style="color:#c2513c" on:click={() => deleteGuest(g.id)}>删除</button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>
    </div>
  </div>
</div>

{#if showGuestModal}
  <div class="modal-backdrop" on:click={(e) => e.target === e.currentTarget && (showGuestModal = false)}>
    <div class="modal">
      <div class="modal-title">{editingGuest ? '编辑宾客' : '添加宾客'}</div>
      <div class="form-group">
        <label class="form-label">姓名 *</label>
        <input class="form-input" bind:value={guestForm.name} placeholder="宾客姓名" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">电话</label>
          <input class="form-input" bind:value={guestForm.phone} />
        </div>
        <div class="form-group">
          <label class="form-label">携伴人数</label>
          <input class="form-input" type="number" min="0" bind:value={guestForm.plus_one} />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">分组</label>
          <select class="form-select" bind:value={guestForm.group_id}>
            <option value="">（未分组）</option>
            {#each data.groups as g}
              <option value={g.id}>{g.name}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">桌次</label>
          <select class="form-select" bind:value={guestForm.table_id}>
            <option value="">（未安排）</option>
            {#each data.tables as t}
              <option value={t.id}>
                第 {t.table_number} 桌 {t.name ? `(${t.name})` : ''} [{t.guest_count}/{t.capacity}]
              </option>
            {/each}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">到场情况</label>
        <select class="form-select" bind:value={guestForm.attendance_status}>
          <option value="pending">待确认</option>
          <option value="confirmed">已确认</option>
          <option value="declined">无法到场</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea class="form-textarea" bind:value={guestForm.notes} placeholder="饮食偏好、特别说明..." />
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" on:click={() => (showGuestModal = false)}>取消</button>
        <button class="btn btn-primary" disabled={!guestForm.name.trim()} on:click={saveGuest}>
          {editingGuest ? '保存' : '添加'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showGroupModal}
  <div class="modal-backdrop" on:click={(e) => e.target === e.currentTarget && (showGroupModal = false)}>
    <div class="modal">
      <div class="modal-title">新建分组</div>
      <div class="form-group">
        <label class="form-label">分组名称</label>
        <input class="form-input" bind:value={groupName} placeholder="例如：同事" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" on:click={() => (showGroupModal = false)}>取消</button>
        <button class="btn btn-primary" disabled={!groupName.trim()} on:click={createGroup}>创建</button>
      </div>
    </div>
  </div>
{/if}

{#if showTableModal}
  <div class="modal-backdrop" on:click={(e) => e.target === e.currentTarget && (showTableModal = false)}>
    <div class="modal">
      <div class="modal-title">新建桌次</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">桌号</label>
          <input class="form-input" type="number" min="1" bind:value={newTable.table_number} />
        </div>
        <div class="form-group">
          <label class="form-label">容量</label>
          <input class="form-input" type="number" min="1" bind:value={newTable.capacity} />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">桌名（可选）</label>
        <input class="form-input" bind:value={newTable.name} placeholder="例如：主桌、同学桌" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" on:click={() => (showTableModal = false)}>取消</button>
        <button class="btn btn-primary" disabled={!newTable.table_number} on:click={createTable}>创建</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .stats-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .stat-item { padding: 16px 20px; }
  .stat-label { font-size: 12px; color: #a5968d; margin-bottom: 4px; }
  .stat-value { font-size: 24px; font-weight: 700; color: #4a3630; }
  .stat-value.text-success { color: #2d8c4e; }
  .main-grid { display: grid; grid-template-columns: 280px 1fr; gap: 20px; }
  .sidebar { display: flex; flex-direction: column; }
  .group-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    color: #4a3630;
    transition: background 0.15s;
  }
  .group-item:hover { background: #faf7f5; }
  .group-item.active {
    background: #f5ebe6;
    color: #c47567;
    font-weight: 600;
  }
  .group-item.table-over { background: #fff5f3; }
  .count {
    background: #f2efec;
    color: #7a6f66;
    padding: 2px 8px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 600;
  }
  .group-item.active .count { background: #eadfd8; color: #c47567; }
</style>
