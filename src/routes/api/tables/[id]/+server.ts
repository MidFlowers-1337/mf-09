import { error, json } from '@sveltejs/kit';
import { deleteTable, updateTable } from '$lib/server/repository';

export async function PUT({ params, request }) {
  const id = Number(params.id);
  const body = await request.json();
  try {
    await updateTable(id, {
      table_number: body.table_number ? Number(body.table_number) : undefined,
      name: body.name,
      capacity: body.capacity !== undefined ? Number(body.capacity) : undefined
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '更新失败';
    throw error(400, message);
  }
  return json({ success: true });
}

export async function DELETE({ params }) {
  const id = Number(params.id);
  await deleteTable(id);
  return json({ success: true });
}
