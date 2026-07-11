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
