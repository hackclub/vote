import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { prisma } from '$lib/server/db';
import { requireProjectCtx, guardStepOrder } from '$lib/server/submit-guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params }) => {
	guardStepOrder(await parent(), 'details', params.slug);
};

const schema = z.object({
	name: z.string().trim().min(1, 'Give your project a name').max(50, 'Max 50 characters'),
	description: z
		.string()
		.trim()
		.min(1, 'Tell us what your project is about')
		.max(500, 'Max 500 characters'),
	// Site-relative dev uploads arrive here prefixed with http://localhost, so
	// requiring http(s) covers both cases while rejecting javascript:/data: URLs.
	screenshotUrl: z
		.string()
		.url('Upload a screenshot of your project')
		.refine(
			(u) => u.startsWith('http://') || u.startsWith('https://'),
			'Upload a screenshot of your project'
		)
});

export const actions: Actions = {
	default: async ({ locals, request, params }) => {
		const ctx = await requireProjectCtx(locals, params.slug);

		const form = await request.formData();
		const raw = {
			name: String(form.get('name') ?? ''),
			description: String(form.get('description') ?? ''),
			screenshotUrl: String(form.get('screenshotUrl') ?? '')
		};
		// Dev fallback uploads are site-relative; make them pass URL validation.
		const parsed = schema.safeParse({
			...raw,
			screenshotUrl: raw.screenshotUrl.startsWith('/')
				? `http://localhost${raw.screenshotUrl}`
				: raw.screenshotUrl
		});
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0].message, values: raw });
		}

		await prisma.project.update({
			where: { id: ctx.project.id },
			data: {
				name: parsed.data.name,
				description: parsed.data.description,
				screenshotUrl: raw.screenshotUrl,
				currentStep: Math.max(ctx.project.currentStep, 3)
			}
		});
		redirect(302, `/e/${params.slug}/submit/links`);
	}
};
