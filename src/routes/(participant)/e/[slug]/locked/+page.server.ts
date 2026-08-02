import { redirect } from '@sveltejs/kit';
import { getParticipantContext, flowDestination } from '$lib/server/flow';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/login');
	const ctx = await getParticipantContext(locals.user, params.slug);
	if (!ctx) redirect(302, '/');
	// Only for participants shut out of submitting with nothing submitted: either
	// voting has started, or an admin froze submissions mid-stage.
	const submissionsClosed =
		ctx.event.stage === 'VOTING' ||
		(ctx.event.stage === 'SUBMISSION' && ctx.event.submissionsLocked);
	if (!submissionsClosed || ctx.project?.submittedAt) redirect(302, flowDestination(ctx));

	return { votingStarted: ctx.event.stage === 'VOTING' };
};
