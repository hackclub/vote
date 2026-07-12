import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { canAccessEvent } from '$lib/server/admin';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, params }) => {
	if (!(await canAccessEvent(locals.user, params.id))) error(404, 'Not found');

	const event = await prisma.event.findUnique({
		where: { id: params.id },
		include: {
			_count: { select: { participants: true, teams: true, projects: true, votes: true } }
		}
	});
	if (!event) error(404, 'Event not found');

	return {
		event: {
			id: event.id,
			name: event.name,
			slug: event.slug,
			stage: event.stage,
			voteLimit: event.voteLimit,
			maxTeamSize: event.maxTeamSize,
			airtableBaseId: event.airtableBaseId,
			airtableTableId: event.airtableTableId,
			airtableBaseName: event.airtableBaseName,
			airtableTableName: event.airtableTableName,
			airtableFieldMap: event.airtableFieldMap,
			// Never expose the tokens themselves — just whether a connection exists.
			airtableConnected: !!event.airtableRefreshToken,
			airtableConnectedBy: event.airtableConnectedBy,
			logoUrl: event.logoUrl,
			backgroundUrl: event.backgroundUrl,
			tagline: event.tagline,
			checklistItems: event.checklistItems,
			counts: event._count
		}
	};
};
