import { json } from '@sveltejs/kit';
import { createTable, listTablesWithStats } from '$lib/server/repository';

export async function GET({ params }) {
  const weddingId = Number(params.id);
  return json(await listTablesWithStats(weddingId));
}

export async function POST({ params, request }) {
  const weddingId = Number(params.id);
  const body = await request.json();
  const id = await createTable({
    wedding_id: weddingId,
    table_number: Number(body.table_number),
    name: body.name ?? null,
    capacity: body.capacity ? Number(body.capacity) : 10
  });
  return json({ id }, { status: 201 });
}
