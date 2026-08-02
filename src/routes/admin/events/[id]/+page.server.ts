import { error, fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireEventAdmin } from '$lib/server/admin';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// Ship rate: share of participants who are on a team with a submitted project.
	const [total, shipped] = await Promise.all([
		prisma.participant.count({ where: { eventId: params.id } }),
		prisma.participant.count({
			where: {
				eventId: params.id,
				teamMember: { team: { project: { submittedAt: { not: null } } } }
			}
		})
	]);
	return { shipRate: { total, shipped, percent: total > 0 ? Math.round((shipped / total) * 100) : 0 } };
};

const STAGES = ['DRAFT', 'SUBMISSION', 'VOTING', 'CLOSED'] as const;

export const actions: Actions = {
	stage: async ({ params, locals, request }) => {
		await requireEventAdmin(locals.user, params.id);
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

	settings: async ({ params, locals, request }) => {
		await requireEventAdmin(locals.user, params.id);
		const form = await request.formData();
		const voteLimit = Number(form.get('voteLimit'));
		const maxTeamSize = Number(form.get('maxTeamSize'));
		if (
			!Number.isInteger(voteLimit) ||
			voteLimit < 1 ||
			!Number.isInteger(maxTeamSize) ||
			maxTeamSize < 1
		) {
			return fail(400, { message: 'Vote limit and team size must be positive whole numbers' });
		}
		// Only touch fields the submission actually carried. Reading an absent
		// field as "" and storing null means any form that doesn't post every
		// field — a stale tab, a partial submit — silently wipes branding.
		const optionalText = (field: string) =>
			form.has(field) ? String(form.get(field)).trim() || null : undefined;

		const checklistItems = form.has('checklistItems')
			? String(form.get('checklistItems'))
					.split('\n')
					.map((s) => s.trim())
					.filter(Boolean)
			: undefined;

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
				logoUrl: optionalText('logoUrl'),
				// A hidden "off" precedes the checkbox so the key is always present;
				// the checkbox appends "on" when ticked. Absent entirely means the
				// form predates this field, so leave the stored value alone.
				cardLogoMonochrome: form.has('cardLogoMonochrome')
					? form.getAll('cardLogoMonochrome').includes('on')
					: undefined,
				backgroundUrl: optionalText('backgroundUrl'),
				tagline: optionalText('tagline'),
				checklistItems
			}
		});
		return { saved: true };
	}
};
