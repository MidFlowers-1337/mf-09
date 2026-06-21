import { json } from '@sveltejs/kit';
import { createWedding, listWeddings } from '$lib/server/repository';

export async function GET() {
  return json(await listWeddings());
}

export async function POST({ request }) {
  const body = await request.json();
  const id = await createWedding({
    groom_name: body.groom_name,
    bride_name: body.bride_name,
    wedding_date: body.wedding_date,
    venue: body.venue ?? null,
    budget_total: Number(body.budget_total) || 0,
    notes: body.notes ?? null
  });
  return json({ id }, { status: 201 });
}
