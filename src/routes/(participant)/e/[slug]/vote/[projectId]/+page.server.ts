import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireVotingCtx } from '$lib/server/vote-guard';
import { Prisma } from '../../../../../../generated/prisma/client';
import type { Actions, PageServerLoad } from './$types';

async function loadVotableProject(locals: App.Locals, slug: string, projectId: string) {
	const ctx = await requireVotingCtx(locals, slug);
	const project = await prisma.project.findUnique({
		where: { id: projectId },
		include: { team: { include: { members: { include: { participant: true } } } } }
	});
	if (!project || project.eventId !== ctx.event.id || !project.submittedAt) {
		error(404, 'Project not found');
	}
	if (project.teamId === ctx.team!.id) {
		redirect(302, `/e/${slug}/project`);
	}
	return { ctx, project };
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const { ctx, project } = await loadVotableProject(locals, params.slug, params.projectId);

	const myVotes = await prisma.vote.findMany({
		where: { voterParticipantId: ctx.participant.id }
	});

	return {
		slug: params.slug,
		voteLimit: ctx.event.voteLimit,
		votesUsed: myVotes.length,
		voted: myVotes.some((v) => v.projectId === project.id),
		project: {
			id: project.id,
			name: project.name,
			description: project.description,
			screenshotUrl: project.screenshotUrl,
			demoUrl: project.demoUrl,
			repoUrl: project.repoUrl
		},
		makers: project.team.members.map(
			(m) =>
				`${m.participant.firstName ?? ''} ${m.participant.lastName ?? ''}`.trim() ||
				m.participant.email
		)
	};
};

export const actions: Actions = {
	vote: async ({ locals, params }) => {
		const { ctx, project } = await loadVotableProject(locals, params.slug, params.projectId);

		// Serializable so parallel requests can't both pass the count check and
		// push the voter past voteLimit; conflicts surface as P2034 and retry.
		for (let attempt = 0; ; attempt++) {
			try {
				await prisma.$transaction(
					async (tx) => {
						const existing = await tx.vote.findUnique({
							where: {
								voterParticipantId_projectId: {
									voterParticipantId: ctx.participant.id,
									projectId: project.id
								}
							}
						});
						if (existing) {
							// Toggling off gives the vote back.
							await tx.vote.delete({ where: { id: existing.id } });
							return;
						}
						const used = await tx.vote.count({
							where: { voterParticipantId: ctx.participant.id }
						});
						if (used >= ctx.event.voteLimit) {
							throw new Error('NO_VOTES_LEFT');
						}
						await tx.vote.create({
							data: {
								eventId: ctx.event.id,
								voterParticipantId: ctx.participant.id,
								projectId: project.id
							}
						});
					},
					{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
				);
				break;
			} catch (e) {
				if (e instanceof Error && e.message === 'NO_VOTES_LEFT') {
					return fail(400, { message: `You've used all ${ctx.event.voteLimit} of your votes.` });
				}
				if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034' && attempt < 3) {
					continue;
				}
				throw e;
			}
		}

		redirect(302, `/e/${params.slug}/vote`);
	}
};
