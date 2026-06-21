import { json } from '@sveltejs/kit';
import { createTask, listTasksWithDependencies, addTaskDependency } from '$lib/server/repository';

export async function GET({ params }) {
  const weddingId = Number(params.id);
  return json(await listTasksWithDependencies(weddingId));
}

export async function POST({ params, request }) {
  const weddingId = Number(params.id);
  const body = await request.json();
  const id = await createTask({
    wedding_id: weddingId,
    title: body.title,
    description: body.description ?? null,
    assignee: body.assignee ?? null,
    due_date: body.due_date ?? null
  });
  if (body.dependencies && Array.isArray(body.dependencies)) {
    for (const depId of body.dependencies) {
      try {
        await addTaskDependency(id, Number(depId));
      } catch {
        /* ignore */
      }
    }
  }
  return json({ id }, { status: 201 });
}
