import { json } from '@sveltejs/kit';
import { deleteGuest, updateGuest } from '$lib/server/repository';

export async function PUT({ params, request }) {
  const id = Number(params.id);
  const body = await request.json();
  await updateGuest(id, {
    name: body.name,
    phone: body.phone,
    group_id: body.group_id !== undefined ? (body.group_id ? Number(body.group_id) : null) : undefined,
    table_id: body.table_id !== undefined ? (body.table_id ? Number(body.table_id) : null) : undefined,
    attendance_status: body.attendance_status,
    plus_one: body.plus_one !== undefined ? Number(body.plus_one) : undefined,
    notes: body.notes
  });
  return json({ success: true });
}

export async function DELETE({ params }) {
  const id = Number(params.id);
  await deleteGuest(id);
  return json({ success: true });
}
