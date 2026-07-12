import { error, json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireEventAdmin } from '$lib/server/admin';
import { getEventAccessToken, listTables } from '$lib/server/airtable-oauth';
import type { RequestHandler } from './$types';

/** Tables (with field schemas) of one base, for the picker + field checks. */
export const GET: RequestHandler = async ({ params, locals, url }) => {
	await requireEventAdmin(locals.user, params.id);
	const baseId = url.searchParams.get('baseId') ?? '';
	if (!/^app[A-Za-z0-9]{5,}$/.test(baseId)) error(400, 'Invalid base id');

	const event = await prisma.event.findUnique({ where: { id: params.id } });
	if (!event) error(404, 'Not found');

	const token = await getEventAccessToken(event);
	if (!token) return json({ connected: false, tables: [] });

	try {
		return json({ connected: true, tables: await listTables(token, baseId) });
	} catch (e) {
		console.error('[airtable] listing tables failed:', e);
		error(502, 'Loading tables from Airtable failed.');
	}
};
