import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { getDisplayNames } from '$lib/server/cachet';
import type { PageServerLoad } from './$types';

// Public read-only gallery — no auth. Real names and emails must never appear
// here (they're for logged-in voters only); makers show only their Slack
// display name via cachet, or "Anonymous".
export const load: PageServerLoad = async ({ params }) => {
	const event = await prisma.event.findUnique({ where: { slug: params.slug } });
	if (!event) error(404, 'Event not found');

	const projects = await prisma.project.findMany({
		where: { eventId: event.id, submittedAt: { not: null } },
		include: { team: { include: { members: { include: { participant: true } } } } },
		orderBy: { submittedAt: 'asc' }
	});

	const displayNames = await getDisplayNames(
		projects.flatMap((p) => p.team.members.map((m) => m.participant.slackId)).filter((id) => id !== null)
	);

	return {
		eventName: event.name,
		slug: event.slug,
		projects: projects.map((p) => {
			const makers = p.team.members
				.map((m) => (m.participant.slackId && displayNames.get(m.participant.slackId)) || '')
				.filter(Boolean);
			return {
				id: p.id,
				name: p.name,
				description: p.description,
				screenshotUrl: p.screenshotUrl,
				makers: makers.length ? makers : ['Anonymous']
			};
		})
	};
};
