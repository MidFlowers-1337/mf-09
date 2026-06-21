import { json } from '@sveltejs/kit';
import { deleteExpense } from '$lib/server/repository';

export async function DELETE({ params }) {
  const id = Number(params.id);
  await deleteExpense(id);
  return json({ success: true });
}
