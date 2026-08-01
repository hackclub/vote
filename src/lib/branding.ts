/**
 * Name shown when no event is in context — the picker, the error page, and any
 * event that hasn't been given a name yet. Event-scoped pages use the event's
 * own name instead.
 */
export const PLATFORM_NAME = 'Hack Club Horizons';

/** `<title>` text for a page, scoped to an event when there is one. */
export function pageTitle(section: string, eventName?: string | null): string {
	return `${section} · ${eventName || PLATFORM_NAME}`;
}
