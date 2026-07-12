import { fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { syncProjectToAirtable } from '$lib/server/airtable';
import { requireEventAdmin } from '$lib/server/admin';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const projects = await prisma.project.findMany({
		where: { eventId: params.id },
		orderBy: { createdAt: 'asc' },
		include: {
			team: { include: { members: { include: { participant: true } } } },
			airtableRecords: true,
			_count: { select: { votes: true } }
		}
	});

	return {
		projects: projects.map((p) => {
			const memberCount = p.team.members.length;
			const synced = p.airtableRecords.filter((r) => r.airtableRecordId && !r.syncError).length;
			const errors = p.airtableRecords.filter((r) => r.syncError);
			return {
				id: p.id,
				name: p.name || '(untitled)',
				members: p.team.members.map(
					(m) =>
						`${m.participant.firstName ?? ''} ${m.participant.lastName ?? ''}`.trim() ||
						m.participant.email
				),
				submitted: !!p.submittedAt,
				votes: p._count.votes,
				demoUrl: p.demoUrl,
				repoUrl: p.repoUrl,
				sync: p.submittedAt
					? errors.length > 0
						? { state: 'error' as const, detail: errors[0].syncError?.slice(0, 200) ?? '' }
						: synced === memberCount && memberCount > 0
							? { state: 'synced' as const, detail: `${synced}/${memberCount} records` }
							: { state: 'pending' as const, detail: `${synced}/${memberCount} records` }
					: { state: 'draft' as const, detail: '' }
			};
		})
	};
};

export const actions: Actions = {
	resync: async ({ params, locals, request }) => {
		await requireEventAdmin(locals.user, params.id);
		const form = await request.formData();
		const projectId = String(form.get('projectId'));
		const project = await prisma.project.findUnique({ where: { id: projectId } });
		if (!project || project.eventId !== params.id) return fail(404, { message: 'Project not found.' });
		await syncProjectToAirtable(projectId);
		return { resynced: true };
	},

	// syncProjectToAirtable never throws — per-project errors land in
	// syncError and show up in the Airtable status column.
	resyncAll: async ({ params, locals }) => {
		await requireEventAdmin(locals.user, params.id);
		const projects = await prisma.project.findMany({
			where: { eventId: params.id, submittedAt: { not: null } },
			select: { id: true }
		});
		for (const p of projects) {
			await syncProjectToAirtable(p.id);
		}
		return { resyncedAll: projects.length };
	}
};
