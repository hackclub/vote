import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { getDisplayNames } from '$lib/server/cachet';
import type { PageServerLoad } from './$types';

// Public read-only project view — no auth, no emails (see gallery load).
export const load: PageServerLoad = async ({ params }) => {
	const event = await prisma.event.findUnique({ where: { slug: params.slug } });
	if (!event) error(404, 'Event not found');

	const project = await prisma.project.findUnique({
		where: { id: params.projectId },
		include: { team: { include: { members: { include: { participant: true } } } } }
	});
	if (!project || project.eventId !== event.id || !project.submittedAt) {
		error(404, 'Project not found');
	}

	const displayNames = await getDisplayNames(
		project.team.members.map((m) => m.participant.slackId).filter((id) => id !== null)
	);
	const makers = project.team.members
		.map((m) => (m.participant.slackId && displayNames.get(m.participant.slackId)) || '')
		.filter(Boolean);

	return {
		slug: event.slug,
		project: {
			name: project.name,
			description: project.description,
			screenshotUrl: project.screenshotUrl,
			demoUrl: project.demoUrl,
			repoUrl: project.repoUrl
		},
		makers: makers.length ? makers : ['Anonymous']
	};
};
