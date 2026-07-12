import { fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireEventAdmin } from '$lib/server/admin';
import { AIRTABLE_SYNC_FIELDS, type AirtableFieldMap } from '$lib/airtable-sync-fields';
import type { Actions } from './$types';

/** Keeps only well-formed entries for known app fields. */
function sanitizeFieldMap(raw: string): AirtableFieldMap | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

	const known = new Set(AIRTABLE_SYNC_FIELDS.map((f) => f.key));
	const map: AirtableFieldMap = {};
	for (const [key, value] of Object.entries(parsed)) {
		if (!known.has(key)) continue;
		const id = (value as { id?: unknown })?.id;
		const name = (value as { name?: unknown })?.name;
		if (typeof id !== 'string' || !/^fld[A-Za-z0-9]{5,}$/.test(id)) continue;
		if (typeof name !== 'string' || !name.trim()) continue;
		map[key] = { id, name: name.trim().slice(0, 255) };
	}
	return map;
}

export const actions: Actions = {
	/** Saves the base, table, and field mapping chosen in the sync wizard. */
	select: async ({ params, locals, request }) => {
		await requireEventAdmin(locals.user, params.id);
		const form = await request.formData();
		const baseId = String(form.get('baseId') ?? '').trim();
		const tableId = String(form.get('tableId') ?? '').trim();
		if (!/^app[A-Za-z0-9]{5,}$/.test(baseId) || !/^tbl[A-Za-z0-9]{5,}$/.test(tableId)) {
			return fail(400, { message: 'Pick a base and a table to sync with' });
		}
		const fieldMap = sanitizeFieldMap(String(form.get('fieldMap') ?? ''));
		if (!fieldMap || Object.keys(fieldMap).length === 0) {
			return fail(400, { message: 'Map at least one field' });
		}
		await prisma.event.update({
			where: { id: params.id },
			data: {
				airtableBaseId: baseId,
				airtableTableId: tableId,
				airtableBaseName: String(form.get('baseName') ?? '').trim() || null,
				airtableTableName: String(form.get('tableName') ?? '').trim() || null,
				airtableFieldMap: fieldMap
			}
		});
		return { saved: true };
	},

	/**
	 * Drops the OAuth connection. The base/table selection is kept so a
	 * reconnect resumes syncing to the same table.
	 */
	disconnect: async ({ params, locals }) => {
		await requireEventAdmin(locals.user, params.id);
		await prisma.event.update({
			where: { id: params.id },
			data: {
				airtableAccessToken: null,
				airtableRefreshToken: null,
				airtableTokenExpiresAt: null,
				airtableConnectedBy: null
			}
		});
		return { disconnected: true };
	}
};
