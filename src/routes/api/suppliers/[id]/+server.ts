import { json } from '@sveltejs/kit';
import { deleteSupplier, updateSupplier } from '$lib/server/repository';

export async function PUT({ params, request }) {
  const id = Number(params.id);
  const body = await request.json();
  await updateSupplier(id, {
    category: body.category,
    name: body.name,
    contact_person: body.contact_person,
    phone: body.phone,
    contract_amount: body.contract_amount !== undefined ? Number(body.contract_amount) : undefined,
    paid_amount: body.paid_amount !== undefined ? Number(body.paid_amount) : undefined,
    notes: body.notes
  });
  return json({ success: true });
}

export async function DELETE({ params }) {
  const id = Number(params.id);
  await deleteSupplier(id);
  return json({ success: true });
}
