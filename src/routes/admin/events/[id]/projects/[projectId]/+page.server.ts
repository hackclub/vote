import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { prisma } from '$lib/server/db';
import { syncProjectToAirtable } from '$lib/server/airtable';
import { requireEventAdmin } from '$lib/server/admin';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const project = await prisma.project.findUnique({
		where: { id: params.projectId },
		include: {
			team: { include: { members: { include: { participant: true } } } },
			airtableRecords: true
		}
	});
	if (!project || project.eventId !== params.id) error(404, 'Project not found');

	return {
		project: {
			id: project.id,
			name: project.name,
			description: project.description,
			screenshotUrl: project.screenshotUrl,
			demoUrl: project.demoUrl,
			repoUrl: project.repoUrl,
			submitted: !!project.submittedAt
		},
		members: project.team.members.map((m) => ({
			id: m.id,
			name:
				`${m.participant.firstName ?? ''} ${m.participant.lastName ?? ''}`.trim() ||
				m.participant.email,
			email: m.participant.email,
			hoursEstimate: m.hoursEstimate,
			hackatimeProjects: m.hackatimeProjects.join(', '),
			airtableRecordId: project.airtableRecords.find((r) => r.teamMemberId === m.id)
				?.airtableRecordId
		}))
	};
};

// http(s) only — these render as hrefs/srcs on public pages, so a javascript:
// URL here would be stored XSS.
const optionalUrl = z
	.string()
	.trim()
	.transform((s) => s || null)
	.pipe(z.string().url().nullable())
	.refine((u) => u === null || u.startsWith('http://') || u.startsWith('https://'), {
		message: 'Links must start with http:// or https://'
	});

const schema = z.object({
	name: z.string().trim().max(50),
	description: z.string().trim().max(500),
	screenshotUrl: optionalUrl,
	demoUrl: optionalUrl,
	repoUrl: optionalUrl
});

export const actions: Actions = {
	save: async ({ params, locals, request }) => {
		await requireEventAdmin(locals.user, params.id);
		const form = await request.formData();
		const parsed = schema.safeParse({
			name: String(form.get('name') ?? ''),
			description: String(form.get('description') ?? ''),
			screenshotUrl: String(form.get('screenshotUrl') ?? ''),
			demoUrl: String(form.get('demoUrl') ?? ''),
			repoUrl: String(form.get('repoUrl') ?? '')
		});
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0].message });
		}

		const project = await prisma.project.findUnique({
			where: { id: params.projectId },
			include: { team: { include: { members: true } } }
		});
		if (!project || project.eventId !== params.id) error(404);

		await prisma.$transaction(async (tx) => {
			await tx.project.update({ where: { id: project.id }, data: parsed.data });
			for (const member of project.team.members) {
				const hoursRaw = String(form.get(`hours:${member.id}`) ?? '').trim();
				const hours = hoursRaw === '' ? null : Number(hoursRaw);
				if (hours !== null && (!Number.isFinite(hours) || hours < 0)) continue;
				await tx.teamMember.update({
					where: { id: member.id },
					data: {
						hoursEstimate: hours,
						hackatimeProjects: String(form.get(`hackatime:${member.id}`) ?? '')
							.split(',')
							.map((s) => s.trim())
							.filter(Boolean)
					}
				});
			}
		});

		if (project.submittedAt) {
			await syncProjectToAirtable(project.id);
		}
		return { saved: true };
	},

	delete: async ({ params, locals }) => {
		await requireEventAdmin(locals.user, params.id);
		const project = await prisma.project.findUnique({ where: { id: params.projectId } });
		if (!project || project.eventId !== params.id) error(404);
		// Deleting the team cascades to members, project, votes, and airtable tracking rows.
		await prisma.team.delete({ where: { id: project.teamId } });
		redirect(302, `/admin/events/${params.id}/projects`);
	}
};
