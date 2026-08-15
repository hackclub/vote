import { error, json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { getParticipantContext } from '$lib/server/flow';
import { getDisplayNames } from '$lib/server/slack';
import { shortName } from '$lib/names';
import type { RequestHandler } from './$types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) error(401, 'Not signed in');
	const slug = url.searchParams.get('event') ?? undefined;
	const ctx = await getParticipantContext(locals.user, slug);
	if (!ctx) error(403, 'Not a participant');

	const email = url.searchParams.get('email')?.trim().toLowerCase() ?? '';
	if (!EMAIL_RE.test(email)) return json({ result: null });

	const p = await prisma.participant.findFirst({
		where: { eventId: ctx.event.id, email, id: { not: ctx.participant.id } },
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

	if (!p || p.teamMember?.teamId === ctx.team?.id) return json({ result: null });

	const addable =
		!p.teamMember ||
		(p.teamMember.team.members.length === 1 && !p.teamMember.team.project?.submittedAt);

	const slackIds = new Set<string>();
	if (p.slackId) slackIds.add(p.slackId);
	if (!addable && p.teamMember) {
		for (const m of p.teamMember.team.members) {
			if (m.participant.slackId) slackIds.add(m.participant.slackId);
		}
	}
	const displayNames = await getDisplayNames([...slackIds]);
	const nameOf = (part: {
		firstName: string | null;
		lastName: string | null;
		slackId: string | null;
	}) =>
		(part.slackId ? displayNames.get(part.slackId) : null) ||
		shortName(part.firstName, part.lastName);

	const displayName = p.slackId ? (displayNames.get(p.slackId) ?? null) : null;
	const name = shortName(p.firstName, p.lastName);

	if (addable) {
		return json({ result: { id: p.id, name, displayName, addable: true } });
	}
	const teammates = p
		.teamMember!.team.members.filter((m) => m.participant.id !== p.id)
		.map((m) => nameOf(m.participant));
	return json({ result: { id: p.id, name, displayName, addable: false, teammates } });
};
