import { redirect } from '@sveltejs/kit';
import { getParticipantContext, flowDestination } from '$lib/server/flow';
import { getDisplayNames } from '$lib/server/slack';
import { shortName } from '$lib/names';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/login');

	const ctx = await getParticipantContext(locals.user, params.slug);
	if (!ctx) redirect(302, '/');
	// Submit pages only exist during SUBMISSION — editing locks once voting starts,
	// or when an admin freezes submissions mid-stage.
	if (ctx.event.stage !== 'SUBMISSION' || ctx.event.submissionsLocked)
		redirect(302, flowDestination(ctx));

	// Teammates are identified by Slack display name + "First L." — never email.
	const slackIds = [
		ctx.participant.slackId,
		...(ctx.team?.members.map((m) => m.participant.slackId) ?? [])
	].filter((id): id is string => !!id);
	const displayNames = await getDisplayNames(slackIds);
	const displayNameOf = (slackId: string | null) =>
		slackId ? (displayNames.get(slackId) ?? null) : null;

	return {
		slug: params.slug,
		event: {
			id: ctx.event.id,
			name: ctx.event.name,
			stage: ctx.event.stage,
			maxTeamSize: ctx.event.maxTeamSize,
			checklistItems: ctx.event.checklistItems
		},
		participant: {
			id: ctx.participant.id,
			name: shortName(ctx.participant.firstName, ctx.participant.lastName),
			displayName: displayNameOf(ctx.participant.slackId),
			firstName: ctx.participant.firstName,
			lastName: ctx.participant.lastName
		},
		members: ctx.team
			? ctx.team.members.map((m) => ({
					id: m.id,
					participantId: m.participantId,
					name: shortName(m.participant.firstName, m.participant.lastName),
					displayName: displayNameOf(m.participant.slackId),
					hoursEstimate: m.hoursEstimate,
					hackatimeProjects: m.hackatimeProjects
				}))
			: null,
		project: ctx.project
			? {
					id: ctx.project.id,
					name: ctx.project.name,
					description: ctx.project.description,
					screenshotUrl: ctx.project.screenshotUrl,
					demoUrl: ctx.project.demoUrl,
					repoUrl: ctx.project.repoUrl,
					currentStep: ctx.project.currentStep,
					checklistCompletedAt: ctx.project.checklistCompletedAt,
					submittedAt: ctx.project.submittedAt
				}
			: null
	};
};
