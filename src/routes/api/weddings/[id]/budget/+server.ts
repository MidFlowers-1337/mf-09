import { json } from '@sveltejs/kit';
import { createExpense, getBudgetSummary, validateBudget } from '$lib/server/repository';

export async function GET({ params }) {
  const weddingId = Number(params.id);
  return json(await getBudgetSummary(weddingId));
}

export async function POST({ params, request }) {
  const weddingId = Number(params.id);
  const body = await request.json();
  const amount = Number(body.amount) || 0;
  const validation = await validateBudget(weddingId, amount);
  const id = await createExpense({
    wedding_id: weddingId,
    supplier_id: body.supplier_id ? Number(body.supplier_id) : null,
    category: body.category,
    description: body.description,
    amount,
    expense_date: body.expense_date,
    notes: body.notes ?? null
  });
  return json(
    { id, validation },
    { status: validation.will_over ? 202 : 201 }
  );
}
