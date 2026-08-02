import { redirect } from '@sveltejs/kit';
import { getParticipantContext, flowDestination } from '$lib/server/flow';
import { shortName } from '$lib/names';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/login');
	const ctx = await getParticipantContext(locals.user, params.slug);
	if (!ctx) redirect(302, '/');
	if (ctx.event.stage === 'DRAFT') redirect(302, `/e/${params.slug}/waiting`);
	if (ctx.event.stage === 'CLOSED') redirect(302, `/e/${params.slug}/closed`);
	if (!ctx.project?.submittedAt) redirect(302, flowDestination(ctx));

	return {
		slug: params.slug,
		stage: ctx.event.stage,
		project: {
			name: ctx.project.name,
			description: ctx.project.description,
			screenshotUrl: ctx.project.screenshotUrl,
			demoUrl: ctx.project.demoUrl,
			repoUrl: ctx.project.repoUrl
		},
		makers: ctx.team!.members.map(
			(m) => shortName(m.participant.firstName, m.participant.lastName) || 'Anonymous'
		)
	};
};
