import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [projects, voterCount] = await Promise.all([
		prisma.project.findMany({
			where: { eventId: params.id, submittedAt: { not: null } },
			include: {
				team: { include: { members: { include: { participant: true } } } },
				_count: { select: { votes: true } }
			}
		}),
		prisma.vote.groupBy({ by: ['voterParticipantId'], where: { eventId: params.id } })
	]);

	const ranked = projects
		.map((p) => ({
			id: p.id,
			name: p.name || '(untitled)',
			screenshotUrl: p.screenshotUrl,
			members: p.team.members.map((m) => m.participant.firstName?.trim() || m.participant.email),
			votes: p._count.votes
		}))
		.sort((a, b) => b.votes - a.votes);

	return { ranked, totalVoters: voterCount.length };
};
