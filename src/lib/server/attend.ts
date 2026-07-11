import { env } from '$env/dynamic/private';

const ATTEND_BASE = 'https://attend.hackclub.com';

export interface AttendLookup {
	registered: boolean;
	participantId: number | null;
	status: string | null;
}

/**
 * Read-only participation check against the Attend API
 * (GET /api/v1/events/:slug/participants/lookup). Unlike the invite endpoint it
 * has no side effects, so it's safe to call on every sign-in.
 *
 * Returns null when the integration is unconfigured or the request fails, so
 * callers degrade gracefully rather than blocking sign-in. The event API key is
 * scoped to a single Attend event, so `attendSlug` must be the key's event —
 * other slugs return 403 and therefore null.
 */
export async function lookupAttendParticipant(
	attendSlug: string,
	email: string
): Promise<AttendLookup | null> {
	if (!env.ATTEND_API_KEY) return null;

	const url =
		`${ATTEND_BASE}/api/v1/events/${encodeURIComponent(attendSlug)}` +
		`/participants/lookup?email=${encodeURIComponent(email)}`;

	let res: Response;
	try {
		res = await fetch(url, { headers: { Authorization: `Bearer ${env.ATTEND_API_KEY}` } });
	} catch (e) {
		console.error(`[attend] lookup request failed for ${attendSlug}:`, e);
		return null;
	}

	if (!res.ok) {
		const body = await res.text().catch(() => '');
		console.error(`[attend] lookup for ${attendSlug} returned ${res.status}: ${body.slice(0, 200)}`);
		return null;
	}

	const data = await res.json();
	return {
		registered: data.registered === true,
		participantId: data.participant_id ?? null,
		status: data.status ?? null
	};
}

export interface AttendRosterEntry {
	email: string;
	firstName: string | null;
	lastName: string | null;
}

/**
 * Fetches the event's full participant roster from Attend
 * (GET /api/v1/events/:slug/participants/roster). Attend already excludes
 * withdrawn/rejected registrations and returns only email + name.
 *
 * Throws on failure — unlike the per-login lookup, roster sync is an explicit
 * admin action, so the error should surface in the UI rather than be swallowed.
 */
export async function fetchAttendRoster(attendSlug: string): Promise<AttendRosterEntry[]> {
	if (!env.ATTEND_API_KEY) {
		throw new Error('ATTEND_API_KEY is not configured');
	}

	const url = `${ATTEND_BASE}/api/v1/events/${encodeURIComponent(attendSlug)}/participants/roster`;
	const res = await fetch(url, { headers: { Authorization: `Bearer ${env.ATTEND_API_KEY}` } });
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		throw new Error(`Attend roster fetch failed (${res.status}): ${body.slice(0, 200)}`);
	}

	const data = await res.json();
	return (data.participants ?? [])
		.filter((p: { email?: string }) => typeof p.email === 'string' && p.email.includes('@'))
		.map((p: { email: string; first_name?: string; last_name?: string }) => ({
			email: p.email.toLowerCase().trim(),
			firstName: p.first_name || null,
			lastName: p.last_name || null
		}));
}
