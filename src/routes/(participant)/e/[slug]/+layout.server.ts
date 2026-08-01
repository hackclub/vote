import { redirect } from '@sveltejs/kit';
import { getParticipantContext } from '$lib/server/flow';
import type { LayoutServerLoad } from './$types';

// Platform fallback for events that haven't set their own background — the
// blurred art behind each flow/project card. There's deliberately no logo
// fallback: an event without a logo shows its name instead of another event's
// artwork (see EventLogo.svelte).
const DEFAULT_BACKGROUND = '/brand/card-art.webp';

export const load: LayoutServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/login');
	// Anyone hitting an event they're not a participant of goes back to the picker.
	const ctx = await getParticipantContext(locals.user, params.slug);
	if (!ctx) redirect(302, '/');

	return {
		eventName: ctx.event.name,
		logoUrl: ctx.event.logoUrl,
		cardLogoMonochrome: ctx.event.cardLogoMonochrome,
		backgroundUrl: ctx.event.backgroundUrl || DEFAULT_BACKGROUND
	};
};
