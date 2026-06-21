import { error, json } from '@sveltejs/kit';
import { deleteWedding, getWeddingWithStats, updateWedding } from '$lib/server/repository';

export async function GET({ params }) {
  const id = Number(params.id);
  const wedding = await getWeddingWithStats(id);
  if (!wedding) throw error(404, '婚礼不存在');
  return json(wedding);
}

export async function PUT({ params, request }) {
  const id = Number(params.id);
  const body = await request.json();
  await updateWedding(id, {
    groom_name: body.groom_name,
    bride_name: body.bride_name,
    wedding_date: body.wedding_date,
    venue: body.venue,
    budget_total: body.budget_total !== undefined ? Number(body.budget_total) : undefined,
    notes: body.notes
  });
  const updated = await getWeddingWithStats(id);
  if (!updated) throw error(404, '婚礼不存在');
  return json(updated);
}

export async function DELETE({ params }) {
  const id = Number(params.id);
  await deleteWedding(id);
  return json({ success: true });
}
