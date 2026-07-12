import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { getParticipantContext, flowDestination } from '$lib/server/flow';
import { deleteAirtableRecords, syncProjectToAirtable } from '$lib/server/airtable';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Gating handled by ../+layout.server.ts; the team step is always reachable.
	return {};
};

export const actions: Actions = {
	default: async ({ locals, request, params }) => {
		if (!locals.user) redirect(302, '/login');
		const ctx = await getParticipantContext(locals.user, params.slug);
		if (!ctx) redirect(302, '/');
		if (ctx.event.stage !== 'SUBMISSION') redirect(302, flowDestination(ctx));

		const form = await request.formData();
		let ids: string[];
		try {
			ids = JSON.parse(String(form.get('memberIds') ?? '[]'));
		} catch {
			return fail(400, { message: 'Invalid team selection.' });
		}

		// Self is always on the team.
		const memberIds = [...new Set([ctx.participant.id, ...ids])];
		if (memberIds.length > ctx.event.maxTeamSize) {
			return fail(400, { message: `Teams can have at most ${ctx.event.maxTeamSize} members.` });
		}

		const participants = await prisma.participant.findMany({
			where: { id: { in: memberIds }, eventId: ctx.event.id },
			include: {
				teamMember: {
					include: {
						team: { include: { project: true, _count: { select: { members: true } } } }
					}
				}
			}
		});
		if (participants.length !== memberIds.length) {
			return fail(400, { message: 'Someone you selected is not registered for this event.' });
		}
		// Someone on another team can still be added if that team is just them
		// with an unsubmitted draft — their solo team dissolves into this one.
		const elsewhere = participants.filter(
			(p) => p.teamMember && p.teamMember.teamId !== ctx.team?.id
		);
		const stuck = elsewhere.find(
			(p) => p.teamMember!.team._count.members > 1 || p.teamMember!.team.project?.submittedAt
		);
		if (stuck) {
			const name = stuck.firstName ?? 'A person you selected';
			return fail(400, {
				message:
					stuck.teamMember!.team._count.members > 1
						? `${name} is already on another team.`
						: `${name} already submitted a project of their own. Ask them to add you to their team instead.`
			});
		}
		const dissolveTeamIds = elsewhere.map((p) => p.teamMember!.teamId);

		// Airtable records about to be orphaned: members removed from this team,
		// plus anything on solo teams being dissolved (cascade wipes the tracking rows).
		const removedRecords = await prisma.airtableRecord.findMany({
			where: {
				airtableRecordId: { not: null },
				OR: [
					...(ctx.team
						? [{ teamMember: { teamId: ctx.team.id, participantId: { notIn: memberIds } } }]
						: []),
					...(dissolveTeamIds.length > 0
						? [{ teamMember: { teamId: { in: dissolveTeamIds } } }]
						: [])
				]
			}
		});

		await prisma.$transaction(async (tx) => {
			// Dissolve absorbed members' solo draft teams (cascades their old
			// teamMember + project) so the upsert below re-homes them here.
			if (dissolveTeamIds.length > 0) {
				await tx.team.deleteMany({ where: { id: { in: dissolveTeamIds } } });
			}
			let teamId = ctx.team?.id;
			if (!teamId) {
				const team = await tx.team.create({
					data: {
						eventId: ctx.event.id,
						createdByParticipantId: ctx.participant.id,
						project: { create: { eventId: ctx.event.id, currentStep: 1 } }
					}
				});
				teamId = team.id;
			}
			// Sync membership: remove people no longer selected, add new ones.
			await tx.teamMember.deleteMany({
				where: { teamId, participantId: { notIn: memberIds } }
			});
			for (const pid of memberIds) {
				await tx.teamMember.upsert({
					where: { participantId: pid },
					update: {},
					create: { teamId, participantId: pid }
				});
			}
		});

		// Keep Airtable in step when editing an already-submitted project.
		if (removedRecords.length > 0) {
			void deleteAirtableRecords(
				ctx.event.id,
				removedRecords.map((r) => r.airtableRecordId!)
			);
		}
		if (ctx.project?.submittedAt) {
			void syncProjectToAirtable(ctx.project.id).catch((e) =>
				console.error('[airtable] resync after team change failed:', e)
			);
		}

		redirect(302, `/e/${params.slug}/submit/checklist`);
	}
};
