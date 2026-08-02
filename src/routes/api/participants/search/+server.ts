import { error, json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { getParticipantContext } from '$lib/server/flow';
import { getDisplayNames } from '$lib/server/slack';
import { shortName } from '$lib/names';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) error(401, 'Not signed in');
	const slug = url.searchParams.get('event') ?? undefined;
	const ctx = await getParticipantContext(locals.user, slug);
	if (!ctx) error(403, 'Not a participant');

	const q = url.searchParams.get('q')?.trim().toLowerCase() ?? '';
	if (q.length < 2) return json({ results: [] });

	// Match by Slack display name, which requires resolving names for the whole
	// candidate pool first (lookups are memoized, so this is cheap after the first
	// search). First name remains matchable; emails are neither matched nor returned.
	const pool = await prisma.participant.findMany({
		where: {
			eventId: ctx.event.id,
			id: { not: ctx.participant.id }
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			slackId: true,
			teamMember: {
				select: {
					teamId: true,
					team: {
						select: {
							project: { select: { submittedAt: true } },
							members: {
								select: {
									participant: {
										select: { id: true, firstName: true, lastName: true, slackId: true }
									}
								}
							}
						}
					}
				}
			}
		}
	});

	// Everyone except our own teammates (they're already listed as members).
	const relevant = pool.filter((p) => !p.teamMember || p.teamMember.teamId !== ctx.team?.id);

	// Addable: teamless, or alone on an unsubmitted draft team — the team
	// action dissolves that solo draft when they're added here. Everyone else
	// is on a real team and is shown greyed out with their teammates listed.
	const isAddable = (p: (typeof relevant)[number]) =>
		!p.teamMember ||
		(p.teamMember.team.members.length === 1 && !p.teamMember.team.project?.submittedAt);

	// Resolve display names for the candidates and, for people already on a team,
	// their teammates (whose names we surface in the "in a team with …" note).
	const slackIds = new Set<string>();
	for (const p of relevant) {
		if (p.slackId) slackIds.add(p.slackId);
		if (!isAddable(p) && p.teamMember) {
			for (const m of p.teamMember.team.members) {
				if (m.participant.slackId) slackIds.add(m.participant.slackId);
			}
		}
	}
	const displayNames = await getDisplayNames([...slackIds]);

	const nameOf = (part: { firstName: string | null; lastName: string | null; slackId: string | null }) =>
		(part.slackId ? displayNames.get(part.slackId) : null) || shortName(part.firstName, part.lastName);

	const results = relevant
		.map((p) => {
			const displayName = p.slackId ? (displayNames.get(p.slackId) ?? null) : null;
			const name = shortName(p.firstName, p.lastName);
			if (isAddable(p)) return { id: p.id, name, displayName, addable: true as const };
			const teammates = p.teamMember!.team.members
				.filter((m) => m.participant.id !== p.id)
				.map((m) => nameOf(m.participant));
			return { id: p.id, name, displayName, addable: false as const, teammates };
		})
		.filter(
			(p) =>
				p.displayName?.toLowerCase().includes(q) || p.name.toLowerCase().split(' ')[0].includes(q)
		)
		// Addable people first, so a full team's members don't crowd them out.
		.sort((a, b) => Number(b.addable) - Number(a.addable))
		.slice(0, 8);

	return json({ results });
};
