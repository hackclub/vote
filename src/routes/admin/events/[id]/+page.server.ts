import { error, fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({});

const STAGES = ['DRAFT', 'SUBMISSION', 'VOTING', 'CLOSED'] as const;

export const actions: Actions = {
	stage: async ({ params, request }) => {
		const form = await request.formData();
		const stage = String(form.get('stage'));
		if (!STAGES.includes(stage as (typeof STAGES)[number])) {
			return fail(400, { message: 'Invalid stage' });
		}
		await prisma.event.update({
			where: { id: params.id },
			data: { stage: stage as (typeof STAGES)[number] }
		});
		return { staged: true };
	},

	settings: async ({ params, request }) => {
		const form = await request.formData();
		const voteLimit = Number(form.get('voteLimit'));
		const maxTeamSize = Number(form.get('maxTeamSize'));
		if (!Number.isInteger(voteLimit) || voteLimit < 1 || !Number.isInteger(maxTeamSize) || maxTeamSize < 1) {
			return fail(400, { message: 'Vote limit and team size must be positive whole numbers' });
		}
		const checklistItems = String(form.get('checklistItems') ?? '')
			.split('\n')
			.map((s) => s.trim())
			.filter(Boolean);

		const event = await prisma.event.findUnique({ where: { id: params.id } });
		if (!event) error(404);

		// The slug doubles as the Attend event slug, so admins can edit it to match.
		const slug =
			String(form.get('slug') ?? '')
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9-]+/g, '-')
				.replace(/^-+|-+$/g, '') || event.slug;
		if (slug !== event.slug) {
			const taken = await prisma.event.findUnique({ where: { slug } });
			if (taken) return fail(400, { message: `An event with slug "${slug}" already exists` });
		}

		await prisma.event.update({
			where: { id: params.id },
			data: {
				name: String(form.get('name') ?? event.name).trim() || event.name,
				slug,
				voteLimit,
				maxTeamSize,
				airtableBaseId: String(form.get('airtableBaseId') ?? '').trim() || null,
				airtableTableId: String(form.get('airtableTableId') ?? '').trim() || null,
				logoUrl: String(form.get('logoUrl') ?? '').trim() || null,
				backgroundUrl: String(form.get('backgroundUrl') ?? '').trim() || null,
				checklistItems
			}
		});
		return { saved: true };
	}
};
