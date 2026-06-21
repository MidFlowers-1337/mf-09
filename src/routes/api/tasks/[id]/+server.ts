import { error, json } from '@sveltejs/kit';
import { deleteTask, getTask, updateTask } from '$lib/server/repository';

export async function PUT({ params, request }) {
  const id = Number(params.id);
  const body = await request.json();
  try {
    await updateTask(id, {
      title: body.title,
      description: body.description,
      assignee: body.assignee,
      due_date: body.due_date,
      status: body.status,
      sort_order: body.sort_order
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '更新失败';
    throw error(400, message);
  }
  const updated = await getTask(id);
  if (!updated) throw error(404, '任务不存在');
  return json(updated);
}

export async function DELETE({ params }) {
  const id = Number(params.id);
  await deleteTask(id);
  return json({ success: true });
}
