import { json } from '@sveltejs/kit';
import { deleteGuestGroup, updateGuestGroup } from '$lib/server/repository';

export async function PUT({ params, request }) {
  const id = Number(params.id);
  const body = await request.json();
  await updateGuestGroup(id, {
    name: body.name,
    sort_order: body.sort_order
  });
  return json({ success: true });
}

export async function DELETE({ params }) {
  const id = Number(params.id);
  await deleteGuestGroup(id);
  return json({ success: true });
}
