import { error } from '@sveltejs/kit';
import { getWedding, getBudgetSummary, listSuppliers } from '$lib/server/repository';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
  const id = Number(params.id);
  const wedding = await getWedding(id);
  if (!wedding) throw error(404, '婚礼不存在');
  return {
    wedding,
    budget: await getBudgetSummary(id),
    suppliers: await listSuppliers(id)
  };
}) satisfies PageServerLoad;
