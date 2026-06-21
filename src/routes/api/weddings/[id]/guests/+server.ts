import { json } from '@sveltejs/kit';
import { createGuest, getGuestStats, listGuests } from '$lib/server/repository';

export async function GET({ params }) {
  const weddingId = Number(params.id);
  const guests = await listGuests(weddingId);
  const stats = await getGuestStats(weddingId);
  return json({ guests, stats });
}

export async function POST({ params, request }) {
  const weddingId = Number(params.id);
  const body = await request.json();
  const id = await createGuest({
    wedding_id: weddingId,
    name: body.name,
    phone: body.phone ?? null,
    group_id: body.group_id ? Number(body.group_id) : null,
    table_id: body.table_id ? Number(body.table_id) : null,
    attendance_status: body.attendance_status ?? 'pending',
    plus_one: body.plus_one ? Number(body.plus_one) : 0,
    notes: body.notes ?? null
  });
  return json({ id }, { status: 201 });
}
