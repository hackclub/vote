import { error, json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireEventAdmin } from '$lib/server/admin';
import { getEventAccessToken, listBases } from '$lib/server/airtable-oauth';
import type { RequestHandler } from './$types';

/** Bases visible to the event's connected Airtable account, for the picker. */
export const GET: RequestHandler = async ({ params, locals }) => {
	await requireEventAdmin(locals.user, params.id);
	const event = await prisma.event.findUnique({ where: { id: params.id } });
	if (!event) error(404, 'Not found');

	const token = await getEventAccessToken(event);
	if (!token) return json({ connected: false, bases: [] });

	try {
		return json({ connected: true, bases: await listBases(token) });
	} catch (e) {
		console.error('[airtable] listing bases failed:', e);
		error(502, 'Loading bases from Airtable failed.');
	}
};
