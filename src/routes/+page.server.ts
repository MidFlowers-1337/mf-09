import { listWeddings, createWedding, createGuestGroup } from '$lib/server/repository';
import type { PageServerLoad, Actions } from './$types';

export const load = (async () => {
  return {
    weddings: await listWeddings()
  };
}) satisfies PageServerLoad;

export const actions = {
  create: async ({ request }) => {
    const form = await request.formData();
    const id = await createWedding({
      groom_name: String(form.get('groom_name')),
      bride_name: String(form.get('bride_name')),
      wedding_date: String(form.get('wedding_date')),
      venue: form.get('venue') ? String(form.get('venue')) : null,
      budget_total: Number(form.get('budget_total')) || 0,
      notes: form.get('notes') ? String(form.get('notes')) : null
    });
    const defaults = ['男方亲戚', '女方亲戚', '男方朋友', '女方朋友', '同事', '其他'];
    for (const g of defaults) {
      await createGuestGroup({ wedding_id: id, name: g });
    }
    return { created: id };
  }
} satisfies Actions;
