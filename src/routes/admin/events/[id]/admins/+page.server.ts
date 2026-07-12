import { fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireEventAdmin, superadminEmails } from '$lib/server/admin';
import type { Actions, PageServerLoad } from './$types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const load: PageServerLoad = async ({ params }) => {
	const supers = superadminEmails();
	const granted = await prisma.eventAdmin.findMany({
		where: { eventId: params.id },
		orderBy: { createdAt: 'desc' }
	});

	return {
		superadmins: [...supers].sort(),
		eventAdmins: granted.map((g) => ({ email: g.email, addedBy: g.addedBy }))
	};
};

export const actions: Actions = {
	grant: async ({ params, locals, request }) => {
		await requireEventAdmin(locals.user, params.id);
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.toLowerCase()
			.trim();
		if (!EMAIL_RE.test(email)) return fail(400, { message: 'Enter a valid email.' });
		if (superadminEmails().has(email)) {
			return fail(400, { message: `${email} is already a superadmin (all events).` });
		}

		await prisma.eventAdmin.upsert({
			where: { eventId_email: { eventId: params.id, email } },
			update: {},
			create: { eventId: params.id, email, addedBy: locals.user?.email }
		});
		return { granted: email };
	},

	revoke: async ({ params, locals, request }) => {
		await requireEventAdmin(locals.user, params.id);
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.toLowerCase()
			.trim();
		await prisma.eventAdmin.deleteMany({ where: { eventId: params.id, email } });
		return { revoked: email };
	}
};
