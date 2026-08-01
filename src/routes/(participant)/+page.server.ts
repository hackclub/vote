import { redirect } from '@sveltejs/kit';
import { getParticipantContext, flowDestination } from '$lib/server/flow';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	// There's no event picker: only one event runs at a time, so drop straight
	// into the participant's flow. If they're on several — a rollover between
	// events — getParticipantContext picks by stage priority.
	const ctx = await getParticipantContext(locals.user);
	if (ctx) redirect(302, flowDestination(ctx));

	// Signed in but not on any event's participant list — the only state this
	// page still renders.
	return { email: locals.user.email };
};
