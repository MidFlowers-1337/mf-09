import { getDb } from '$lib/server/db';
import type { Handle } from '@sveltejs/kit';

export const handle = (async ({ event, resolve }) => {
  try {
    await getDb();
  } catch (e) {
    console.error('Failed to initialize database', e);
  }
  return resolve(event);
}) satisfies Handle;
