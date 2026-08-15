import { env } from '$env/dynamic/private';

const ATTEND_BASE = 'https://attend.hackclub.com';

export interface AttendRosterEntry {
	email: string;
	firstName: string | null;
	lastName: string | null;
	slackId: string | null;
	/** Attend registration status, e.g. "complete" | "in_progress" | "awaiting_guardian". */
	status: string | null;
	/** ISO timestamp of when the participant was checked in on-site, or null if not yet. */
	checkedInAt: string | null;
	participantEventId: number | null;
}

export interface AttendAddress {
	line1: string | null;
	line2: string | null;
	city: string | null;
	state: string | null;
	zip: string | null;
	country: string | null;
}

/**
 * Fetches the event's participant list from Attend
 * (GET /api/v1/events/:slug/participants). Unlike the leaner .../roster
 * endpoint, this one includes `checked_in_at`, which we need to import only
 * on-site attendees. (It also returns sensitive medical/travel fields we ignore.)
 *
 * Throws on failure — unlike the per-login lookup, roster sync is an explicit
 * admin action, so the error should surface in the UI rather than be swallowed.
 */
export async function fetchAttendRoster(attendSlug: string): Promise<AttendRosterEntry[]> {
	if (!env.ATTEND_API_KEY) {
		throw new Error('ATTEND_API_KEY is not configured');
	}

	const url = `${ATTEND_BASE}/api/v1/events/${encodeURIComponent(attendSlug)}/participants`;
	const res = await fetch(url, { headers: { Authorization: `Bearer ${env.ATTEND_API_KEY}` } });
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		throw new Error(`Attend roster fetch failed (${res.status}): ${body.slice(0, 200)}`);
	}

	const data = await res.json();
	const list: unknown[] = Array.isArray(data) ? data : (data.participants ?? data.data ?? []);
	return list
		.filter((p): p is { email: string } & Record<string, unknown> => {
			const email = (p as { email?: unknown }).email;
			return typeof email === 'string' && email.includes('@');
		})
		.map((p) => ({
			email: (p.email as string).toLowerCase().trim(),
			firstName: (p.first_name as string) || null,
			lastName: (p.last_name as string) || null,
			slackId: (p.slack_user_id as string) || null,
			status: (p.status as string) || null,
			checkedInAt: (p.checked_in_at as string) || null,
			participantEventId: typeof p.participant_event_id === 'number' ? p.participant_event_id : null
		}));
}

export async function fetchAttendAddress(
	attendSlug: string,
	participantEventId: number
): Promise<AttendAddress | null> {
	if (!env.ATTEND_API_KEY) {
		throw new Error('ATTEND_API_KEY is not configured');
	}

	const url = `${ATTEND_BASE}/api/v1/events/${encodeURIComponent(attendSlug)}/participants/${participantEventId}`;
	const res = await fetch(url, { headers: { Authorization: `Bearer ${env.ATTEND_API_KEY}` } });
	if (!res.ok) return null;

	const data = await res.json().catch(() => null);
	const address = (data?.participant?.personal?.address ?? null) as Record<string, unknown> | null;
	if (!address || typeof address !== 'object') return null;

	const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
	const mapped: AttendAddress = {
		line1: str(address.line_1),
		line2: str(address.line_2),
		city: str(address.city),
		state: str(address.state),
		zip: str(address.postal_code),
		country: str(address.country)
	};
	if (Object.values(mapped).every((v) => v === null)) return null;
	return mapped;
}
