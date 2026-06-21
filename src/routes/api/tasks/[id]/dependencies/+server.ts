import { error, json } from '@sveltejs/kit';
import { addTaskDependency, removeTaskDependency } from '$lib/server/repository';

export async function POST({ params, request }) {
  const taskId = Number(params.id);
  const body = await request.json();
  try {
    await addTaskDependency(taskId, Number(body.depends_on_id));
    return json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : '添加依赖失败';
    throw error(400, message);
  }
}

export async function DELETE({ params, request }) {
  const taskId = Number(params.id);
  const body = await request.json();
  await removeTaskDependency(taskId, Number(body.depends_on_id));
  return json({ success: true });
}
