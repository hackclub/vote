import { prisma } from '$lib/server/db';
import { requireVotingCtx, stableShuffle } from '$lib/server/vote-guard';
import { shortName } from '$lib/names';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const ctx = await requireVotingCtx(locals, params.slug);

	const [projects, myVotes] = await Promise.all([
		prisma.project.findMany({
			where: {
				eventId: ctx.event.id,
				submittedAt: { not: null },
				teamId: { not: ctx.team!.id }
			},
			include: { team: { include: { members: { include: { participant: true } } } } }
		}),
		prisma.vote.findMany({ where: { voterParticipantId: ctx.participant.id } })
	]);

	const votedProjectIds = new Set(myVotes.map((v) => v.projectId));

	return {
		slug: params.slug,
		voteLimit: ctx.event.voteLimit,
		votesUsed: myVotes.length,
		projects: stableShuffle(projects, ctx.participant.id).map((p) => ({
			id: p.id,
			name: p.name,
			description: p.description,
			screenshotUrl: p.screenshotUrl,
			makers: p.team.members.map(
				(m) => shortName(m.participant.firstName, m.participant.lastName) || 'Anonymous'
			),
			voted: votedProjectIds.has(p.id)
		}))
	};
};
