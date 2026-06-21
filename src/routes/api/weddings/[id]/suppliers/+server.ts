import { json } from '@sveltejs/kit';
import { createSupplier, listSuppliers } from '$lib/server/repository';

export async function GET({ params }) {
  const weddingId = Number(params.id);
  return json(await listSuppliers(weddingId));
}

export async function POST({ params, request }) {
  const weddingId = Number(params.id);
  const body = await request.json();
  const id = await createSupplier({
    wedding_id: weddingId,
    category: body.category,
    name: body.name,
    contact_person: body.contact_person ?? null,
    phone: body.phone ?? null,
    contract_amount: body.contract_amount ? Number(body.contract_amount) : 0,
    paid_amount: body.paid_amount ? Number(body.paid_amount) : 0,
    notes: body.notes ?? null
  });
  return json({ id }, { status: 201 });
}
