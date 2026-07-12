import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { prisma } from './db';
import type { User } from '../../generated/prisma/client';

/**
 * Two admin tiers:
 *  - Superadmin: email listed in the ADMIN_EMAILS env var. Full access to every
 *    event, can create events and manage any event's admins.
 *  - Event admin: granted per-event via the EventAdmin allowlist. Access limited
 *    to the events they're granted on.
 */

export function superadminEmails(): Set<string> {
	return new Set(
		(env.ADMIN_EMAILS ?? '')
			.split(',')
			.map((e) => e.toLowerCase().trim())
			.filter(Boolean)
	);
}

export function isSuperadmin(email: string | undefined | null): boolean {
	return !!email && superadminEmails().has(email.toLowerCase().trim());
}

export interface AdminScope {
	email: string;
	superadmin: boolean;
	events: { id: string; name: string; slug: string; stage: string }[];
}

/** Returns the caller's admin scope, or null if they aren't an admin anywhere. */
export async function getAdminScope(user: User | null): Promise<AdminScope | null> {
	if (!user) return null;
	const email = user.email.toLowerCase().trim();
	const superadmin = isSuperadmin(email);

	const events = superadmin
		? await prisma.event.findMany({
				orderBy: { createdAt: 'desc' },
				select: { id: true, name: true, slug: true, stage: true }
			})
		: await prisma.event
				.findMany({
					where: { admins: { some: { email } } },
					orderBy: { createdAt: 'desc' },
					select: { id: true, name: true, slug: true, stage: true }
				});

	if (!superadmin && events.length === 0) return null;
	return { email, superadmin, events };
}

/** True if the user may manage the given event. */
export async function canAccessEvent(user: User | null, eventId: string): Promise<boolean> {
	if (!user) return false;
	if (isSuperadmin(user.email)) return true;
	const row = await prisma.eventAdmin.findUnique({
		where: { eventId_email: { eventId, email: user.email.toLowerCase().trim() } }
	});
	return row != null;
}

/**
 * Throws 404 unless the user may manage the given event. Form actions run
 * without layout loads, so every event-scoped action must call this itself —
 * the layout guard only protects page renders. 404 (not 403) so event IDs
 * aren't confirmed to non-admins.
 */
export async function requireEventAdmin(user: User | null, eventId: string): Promise<void> {
	if (!(await canAccessEvent(user, eventId))) error(404, 'Not found');
}
