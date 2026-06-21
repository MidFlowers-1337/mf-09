import { error } from '@sveltejs/kit';
import {
  getWedding,
  listGuests,
  getGuestStats,
  listGuestGroupsWithStats,
  listTablesWithStats
} from '$lib/server/repository';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
  const id = Number(params.id);
  const wedding = await getWedding(id);
  if (!wedding) throw error(404, '婚礼不存在');
  return {
    wedding,
    guests: await listGuests(id),
    stats: await getGuestStats(id),
    groups: await listGuestGroupsWithStats(id),
    tables: await listTablesWithStats(id)
  };
}) satisfies PageServerLoad;
