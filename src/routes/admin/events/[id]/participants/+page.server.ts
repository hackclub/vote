import { fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { fetchAttendRoster } from '$lib/server/attend';
import type { Actions, PageServerLoad } from './$types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const load: PageServerLoad = async ({ params }) => {
	const [event, participants] = await Promise.all([
		prisma.event.findUnique({ where: { id: params.id }, select: { attendSlug: true } }),
		prisma.participant.findMany({
			where: { eventId: params.id },
			orderBy: { email: 'asc' },
			include: {
				user: { select: { id: true } },
				teamMember: { select: { teamId: true } }
			}
		})
	]);
	return {
		attendSlug: event?.attendSlug ?? null,
		participants: participants.map((p) => ({
			id: p.id,
			email: p.email,
			name: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
			signedUp: !!p.user,
			onTeam: !!p.teamMember
		}))
	};
};

export const actions: Actions = {
	sync: async ({ params }) => {
		const event = await prisma.event.findUnique({
			where: { id: params.id },
			select: { attendSlug: true }
		});
		if (!event?.attendSlug) {
			return fail(400, { message: 'This event has no Attend slug configured.' });
		}

		let roster;
		try {
			roster = await fetchAttendRoster(event.attendSlug);
		} catch (e) {
			console.error('[attend] roster sync failed:', e);
			return fail(502, { message: e instanceof Error ? e.message : 'Attend roster fetch failed.' });
		}

		const result = await prisma.participant.createMany({
			data: roster.map((p) => ({
				eventId: params.id,
				email: p.email,
				firstName: p.firstName,
				lastName: p.lastName
			})),
			skipDuplicates: true
		});

		return {
			synced: {
				added: result.count,
				skipped: roster.length - result.count,
				total: roster.length
			}
		};
	},

	add: async ({ params, request }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').toLowerCase().trim();
		if (!EMAIL_RE.test(email)) return fail(400, { message: 'Enter a valid email.' });

		const result = await prisma.participant.createMany({
			data: [
				{
					eventId: params.id,
					email,
					firstName: String(form.get('firstName') ?? '').trim() || null,
					lastName: String(form.get('lastName') ?? '').trim() || null
				}
			],
			skipDuplicates: true
		});
		if (result.count === 0) return fail(400, { message: `${email} is already registered.` });
		return { added: email };
	},

	remove: async ({ params, request }) => {
		const form = await request.formData();
		const id = String(form.get('id'));
		await prisma.participant.deleteMany({ where: { id, eventId: params.id } });
		return { removed: true };
	}
};
