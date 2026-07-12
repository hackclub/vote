import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server/db';
import { requireApiKey } from '$lib/server/api-auth';
import { CHECKLIST_ITEMS } from '$lib/server/checklist';
import { slugify } from '$lib/server/slug';
import { Prisma } from '../../../../generated/prisma/client';
import type { RequestHandler } from './$types';

const schema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'name is required')
		.max(100, 'name must be at most 100 characters'),
	logoUrl: z.url({ protocol: /^https?$/, error: 'logoUrl must be a valid http(s) URL' }),
	backgroundUrl: z.url({
		protocol: /^https?$/,
		error: 'backgroundUrl must be a valid http(s) URL'
	}),
	slug: z.string().trim().max(64, 'slug must be at most 64 characters').optional(),
	voteLimit: z.number().int().min(1).max(50).optional(),
	maxTeamSize: z.number().int().min(1).max(20).optional()
});

export const POST: RequestHandler = async ({ request, url }) => {
	requireApiKey(request);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Request body must be valid JSON');
	}

	const parsed = schema.safeParse(body);
	if (!parsed.success) error(400, parsed.error.issues[0].message);

	const slug = slugify(parsed.data.slug ?? parsed.data.name);
	if (!slug) error(400, 'slug must contain at least one alphanumeric character');

	if (await prisma.event.findUnique({ where: { slug } })) {
		error(409, `An event with slug "${slug}" already exists`);
	}

	let event;
	try {
		event = await prisma.event.create({
			data: {
				name: parsed.data.name,
				slug,
				logoUrl: parsed.data.logoUrl,
				backgroundUrl: parsed.data.backgroundUrl,
				voteLimit: parsed.data.voteLimit ?? 3,
				maxTeamSize: parsed.data.maxTeamSize ?? 3,
				checklistItems: CHECKLIST_ITEMS
			}
		});
	} catch (e) {
		// Race between the uniqueness pre-check and the insert.
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
			error(409, `An event with slug "${slug}" already exists`);
		}
		throw e;
	}

	const origin = (env.APP_ORIGIN || url.origin).trim().replace(/\/+$/, '');
	return json(
		{
			id: event.id,
			name: event.name,
			slug: event.slug,
			stage: event.stage,
			voteLimit: event.voteLimit,
			maxTeamSize: event.maxTeamSize,
			logoUrl: event.logoUrl,
			backgroundUrl: event.backgroundUrl,
			createdAt: event.createdAt.toISOString(),
			adminUrl: `${origin}/admin/events/${event.id}`,
			galleryUrl: `${origin}/gallery/${event.slug}`
		},
		{ status: 201 }
	);
};
