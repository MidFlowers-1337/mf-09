<script lang="ts">
  import type { PageData } from './$types';
  import type { TaskWithDependencies, TaskStatus } from '$lib/types';
  import { TASK_STATUS_LABELS } from '$lib/types';
  import { formatDate } from '$lib/utils';
  import { invalidateAll } from '$app/navigation';

  export let data: PageData;
  let showNewModal = false;
  let showDepModal = false;
  let selectedTask: TaskWithDependencies | null = null;

  let newTask = {
    title: '',
    description: '',
    assignee: '',
    due_date: '',
    dependencies: [] as number[]
  };

  const statuses: TaskStatus[] = ['todo', 'in_progress', 'completed'];

  function getTasksByStatus(status: TaskStatus) {
    return data.tasks.filter(t => t.status === status);
  }

  async function createTask() {
    const res = await fetch(`/api/weddings/${data.wedding.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTask.title,
        description: newTask.description,
        assignee: newTask.assignee,
        due_date: newTask.due_date,
        dependencies: newTask.dependencies
      })
    });
    if (res.ok) {
      newTask = { title: '', description: '', assignee: '', due_date: '', dependencies: [] };
      showNewModal = false;
      await invalidateAll();
    }
  }

  async function changeStatus(task: TaskWithDependencies, newStatus: TaskStatus) {
    if (newStatus !== 'todo' && newStatus !== 'completed' && !task.can_start) {
      alert(`无法开始：前置任务还没完成\n${task.blocked_by.map(b => '· ' + b.title).join('\n')}`);
      return;
    }
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || err?.message || '操作失败');
      return;
    }
    await invalidateAll();
  }

  async function deleteTask(id: number) {
    if (!confirm('确定删除此任务？关联的依赖会一并删除')) return;
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    await invalidateAll();
  }

  function openDepModal(task: TaskWithDependencies) {
    selectedTask = task;
    showDepModal = true;
  }

  async function toggleDep(depId: number, shouldAdd: boolean) {
    if (!selectedTask) return;
    const method = shouldAdd ? 'POST' : 'DELETE';
    const res = await fetch(`/api/tasks/${selectedTask.id}/dependencies`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depends_on_id: depId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || err?.message || '操作失败');
      return;
    }
    await invalidateAll();
  }
</script>

<div class="container">
  <div class="flex-between mb-4">
    <h1 class="page-title" style="margin: 0;">任务看板</h1>
    <button class="btn btn-primary" on:click={() => (showNewModal = true)}>
      <span>➕</span> 新建任务
    </button>
  </div>

  <div class="kanban">
    {#each statuses as status}
      <div class="kanban-column">
        <div class="column-header {status}">
          <div class="column-title">
            <span class="status-dot {status}"></span>
            {TASK_STATUS_LABELS[status]}
          </div>
          <span class="column-count">{getTasksByStatus(status).length}</span>
        </div>

        <div class="column-body">
          {#if getTasksByStatus(status).length === 0}
            <div class="empty-column">暂无任务</div>
          {:else}
            {#each getTasksByStatus(status) as task}
              <div
                class="task-card"
                class:blocked={!task.can_start && task.status !== 'completed'}
                draggable="true"
              >
                <div class="flex-between" style="margin-bottom: 8px;">
                  <div class="task-title">{task.title}</div>
                  <button class="btn-ghost btn-sm" on:click={() => deleteTask(task.id)} style="padding: 0 4px;">🗑️</button>
                </div>

                {#if task.description}
                  <div class="task-desc">{task.description}</div>
                {/if}

                <div class="task-meta">
                  {#if task.assignee}
                    <span class="tag tag-gray">👤 {task.assignee}</span>
                  {/if}
                  {#if task.due_date}
                    <span class="tag tag-blue">📅 {formatDate(task.due_date)}</span>
                  {/if}
                </div>

                {#if task.dependencies.length > 0}
                  <div class="task-deps">
                    <div class="text-xs text-muted" style="margin-bottom: 4px;">
                      依赖 {task.dependencies.length} 个前置任务
                    </div>
                    {#if !task.can_start}
                      <div class="blocked-list">
                        {#each task.blocked_by as blocker}
                          <span class="tag tag-red">🔒 {blocker.title}</span>
                        {/each}
                      </div>
                    {:else}
                      <div class="text-xs text-success">✅ 所有前置已完成</div>
                    {/if}
                  </div>
                {/if}

                <div class="task-actions">
                  <button
                    class="btn-link"
                    on:click={() => openDepModal(task)}
                  >
                    管理依赖
                  </button>
                  <div class="status-buttons">
                    {#if status !== 'todo'}
                      <button class="btn-sm btn-ghost" on:click={() => changeStatus(task, 'todo')}>待办</button>
                    {/if}
                    {#if status !== 'in_progress'}
                      <button
                        class="btn-sm btn-ghost"
                        class:disabled={!task.can_start && task.status === 'todo'}
                        on:click={() => changeStatus(task, 'in_progress')}
                      >
                        进行
                      </button>
                    {/if}
                    {#if status !== 'completed'}
                      <button
                        class="btn-sm btn-ghost"
                        class:disabled={!task.can_start}
                        on:click={() => changeStatus(task, 'completed')}
                      >
                        完成
                      </button>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

{#if showNewModal}
  <div class="modal-backdrop" on:click={(e) => e.target === e.currentTarget && (showNewModal = false)}>
    <div class="modal modal-wide">
      <div class="modal-title">新建任务</div>
      <div class="form-group">
        <label class="form-label">任务标题 *</label>
        <input class="form-input" bind:value={newTask.title} placeholder="例如：预订酒店" />
      </div>
      <div class="form-group">
        <label class="form-label">任务描述</label>
        <textarea class="form-textarea" bind:value={newTask.description} placeholder="详细说明..." />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">负责人</label>
          <input class="form-input" bind:value={newTask.assignee} placeholder="谁来做？" />
        </div>
        <div class="form-group">
          <label class="form-label">截止日期</label>
          <input class="form-input" type="date" bind:value={newTask.due_date} />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">前置任务（可选，多选）</label>
        <div class="multi-select">
          {#if data.tasks.length === 0}
            <div class="text-sm text-muted">还没有其他任务</div>
          {:else}
            {#each data.tasks as t}
              <label class="check-item">
                <input
                  type="checkbox"
                  value={t.id}
                  bind:group={newTask.dependencies}
                />
                <span>{t.title}</span>
              </label>
            {/each}
          {/if}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" on:click={() => (showNewModal = false)}>取消</button>
        <button
          class="btn btn-primary"
          disabled={!newTask.title}
          on:click={createTask}
        >创建</button>
      </div>
    </div>
  </div>
{/if}

{#if showDepModal && selectedTask}
  <div class="modal-backdrop" on:click={(e) => e.target === e.currentTarget && (showDepModal = false)}>
    <div class="modal">
      <div class="modal-title">管理依赖：{selectedTask.title}</div>
      <div class="text-sm text-muted mb-4">
        勾选后，这个任务会等待勾选的任务完成后才能开始
      </div>
      {#if data.tasks.filter(t => t.id !== selectedTask!.id).length === 0}
        <div class="text-sm text-muted">还没有其他任务</div>
      {:else}
        <div class="multi-select">
          {#each data.tasks.filter(t => t.id !== selectedTask!.id) as t}
            <label class="check-item">
              <input
                type="checkbox"
                checked={selectedTask!.dependencies.includes(t.id)}
                on:change={(e) => toggleDep(t.id, (e.target as HTMLInputElement).checked)}
              />
              <span>
                {t.title}
                <span class="tag {t.status === 'completed' ? 'tag-green' : 'tag-yellow'}" style="margin-left: 6px;">
                  {TASK_STATUS_LABELS[t.status]}
                </span>
              </span>
            </label>
          {/each}
        </div>
      {/if}
      <div class="modal-actions">
        <button class="btn btn-primary" on:click={() => (showDepModal = false)}>完成</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .kanban {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    min-height: 600px;
  }
  .kanban-column {
    background: #f7f3f0;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
  }
  .column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 2px solid #ede6e0;
  }
  .column-header.todo { border-color: #d6d0cb; }
  .column-header.in_progress { border-color: #f0c9bf; }
  .column-header.completed { border-color: #b6e0c6; }
  .column-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #4a3630;
  }
  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  .status-dot.todo { background: #c2b3ab; }
  .status-dot.in_progress { background: #e8a598; }
  .status-dot.completed { background: #6cc490; }
  .column-count {
    background: #fff;
    padding: 2px 10px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 600;
    color: #7a5c54;
  }
  .column-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
  }
  .empty-column {
    padding: 40px 20px;
    text-align: center;
    color: #b8aaa1;
    font-size: 13px;
  }
  .task-card {
    background: #fff;
    border-radius: 10px;
    padding: 14px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    border: 1px solid #f0ebe6;
    transition: all 0.15s;
  }
  .task-card:hover {
    box-shadow: 0 4px 12px rgba(196, 117, 103, 0.1);
  }
  .task-card.blocked {
    background: #fff7f5;
    border-color: #f3d9d2;
    opacity: 0.85;
  }
  .task-title {
    font-weight: 600;
    font-size: 14px;
    color: #4a3630;
  }
  .task-desc {
    font-size: 13px;
    color: #7a6f66;
    margin-bottom: 10px;
    line-height: 1.5;
  }
  .task-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }
  .task-deps {
    background: #faf7f5;
    padding: 8px 10px;
    border-radius: 6px;
    margin-bottom: 10px;
  }
  .blocked-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .task-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 10px;
    border-top: 1px solid #f2efec;
  }
  .status-buttons {
    display: flex;
    gap: 4px;
  }
  .status-buttons .disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .multi-select {
    max-height: 300px;
    overflow-y: auto;
    border: 1.5px solid #e8dcd4;
    border-radius: 8px;
    padding: 8px;
  }
  .check-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  }
  .check-item:hover { background: #faf7f5; }
  .check-item input { width: 16px; height: 16px; }
</style>
