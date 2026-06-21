import { json } from '@sveltejs/kit';
import { createGuestGroup, listGuestGroupsWithStats } from '$lib/server/repository';

export async function GET({ params }) {
  const weddingId = Number(params.id);
  return json(await listGuestGroupsWithStats(weddingId));
}

export async function POST({ params, request }) {
  const weddingId = Number(params.id);
  const body = await request.json();
  const id = await createGuestGroup({
    wedding_id: weddingId,
    name: body.name,
    sort_order: body.sort_order
  });
  return json({ id }, { status: 201 });
}
