import { fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireEventAdmin } from '$lib/server/admin';
import type { Actions, PageServerLoad } from './$types';

const nameOf = (p: { firstName: string | null; lastName: string | null; email: string }) =>
	`${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || p.email;

export const load: PageServerLoad = async ({ params, parent }) => {
	const { event } = await parent();

	const teams = await prisma.team.findMany({
		where: { eventId: params.id },
		orderBy: { createdAt: 'asc' },
		include: {
			members: { include: { participant: true } },
			project: { select: { id: true, name: true, submittedAt: true } }
		}
	});

	// Participants who can be added to a team: teamless, or alone on an
	// unsubmitted draft team (adding them dissolves that solo draft).
	const everyone = await prisma.participant.findMany({
		where: { eventId: params.id },
		include: {
			teamMember: {
				include: {
					team: {
						include: {
							_count: { select: { members: true } },
							project: { select: { submittedAt: true } }
						}
					}
				}
			}
		}
	});
	const addable = everyone
		.filter(
			(p) =>
				!p.teamMember ||
				(p.teamMember.team._count.members === 1 && !p.teamMember.team.project?.submittedAt)
		)
		.map((p) => ({ id: p.id, name: nameOf(p) }))
		.sort((a, b) => a.name.localeCompare(b.name));

	return {
		addable,
		teams: teams.map((t) => ({
			id: t.id,
			members: t.members.map((m) => ({
				participantId: m.participant.id,
				name: nameOf(m.participant)
			})),
			size: t.members.length,
			// Submitted teams are locked: their per-member Airtable records are
			// already synced and shouldn't be torn up from here.
			editable: !t.project?.submittedAt,
			atCapacity: t.members.length >= event.maxTeamSize,
			project: t.project
				? {
						id: t.project.id,
						name: t.project.name || '(untitled)',
						submitted: !!t.project.submittedAt
					}
				: null
		}))
	};
};

export const actions: Actions = {
	addMember: async ({ params, locals, request }) => {
		await requireEventAdmin(locals.user, params.id);
		const form = await request.formData();
		const teamId = String(form.get('teamId'));
		const participantId = String(form.get('participantId'));

		const team = await prisma.team.findUnique({
			where: { id: teamId },
			include: {
				event: { select: { maxTeamSize: true } },
				project: { select: { submittedAt: true } },
				_count: { select: { members: true } }
			}
		});
		if (!team || team.eventId !== params.id) return fail(404, { message: 'Team not found.' });
		if (team.project?.submittedAt)
			return fail(400, { message: 'This team already submitted — its roster is locked.' });
		if (team._count.members >= team.event.maxTeamSize)
			return fail(400, { message: `Teams can have at most ${team.event.maxTeamSize} members.` });

		const p = await prisma.participant.findUnique({
			where: { id: participantId },
			include: {
				teamMember: {
					include: {
						team: {
							include: {
								_count: { select: { members: true } },
								project: { select: { submittedAt: true } }
							}
						}
					}
				}
			}
		});
		if (!p || p.eventId !== params.id)
			return fail(400, { message: 'That participant is not in this event.' });

		// Already on this team — nothing to do.
		if (p.teamMember?.teamId === teamId) return { added: true };

		// On another team: only allowed if it's their own unsubmitted solo draft,
		// which dissolves (cascading its draft project) as they move over.
		let dissolveId: string | null = null;
		if (p.teamMember) {
			if (p.teamMember.team._count.members > 1 || p.teamMember.team.project?.submittedAt)
				return fail(400, { message: `${nameOf(p)} is already on another team.` });
			dissolveId = p.teamMember.teamId;
		}

		await prisma.$transaction(async (tx) => {
			if (dissolveId) await tx.team.delete({ where: { id: dissolveId } });
			await tx.teamMember.upsert({
				where: { participantId },
				update: { teamId },
				create: { teamId, participantId }
			});
		});
		return { added: true };
	},

	removeMember: async ({ params, locals, request }) => {
		await requireEventAdmin(locals.user, params.id);
		const form = await request.formData();
		const teamId = String(form.get('teamId'));
		const participantId = String(form.get('participantId'));

		const team = await prisma.team.findUnique({
			where: { id: teamId },
			include: {
				project: { select: { submittedAt: true } },
				_count: { select: { members: true } }
			}
		});
		if (!team || team.eventId !== params.id) return fail(404, { message: 'Team not found.' });
		if (team.project?.submittedAt)
			return fail(400, { message: 'This team already submitted — its roster is locked.' });

		const member = await prisma.teamMember.findUnique({ where: { participantId } });
		if (!member || member.teamId !== teamId)
			return fail(400, { message: 'That person is not on this team.' });

		await prisma.$transaction(async (tx) => {
			await tx.teamMember.delete({ where: { participantId } });
			// Last member gone → drop the now-empty team, cascading its draft project.
			if (team._count.members <= 1) await tx.team.delete({ where: { id: teamId } });
		});
		return { removed: true };
	}
};
