import { error, redirect } from '@sveltejs/kit';
import {
  getWeddingWithStats,
  listTasksWithDependencies,
  getGuestStats,
  listGuestGroupsWithStats,
  getBudgetSummary
} from '$lib/server/repository';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
  const id = Number(params.id);
  const wedding = await getWeddingWithStats(id);
  if (!wedding) throw error(404, '婚礼不存在');
  return {
    wedding,
    tasks: await listTasksWithDependencies(id),
    guestStats: await getGuestStats(id),
    guestGroups: await listGuestGroupsWithStats(id),
    budget: await getBudgetSummary(id)
  };
}) satisfies PageServerLoad;
