import { getParticipantContext } from '$lib/server/flow';
import type { LayoutServerLoad } from './$types';

// Platform fallbacks when an event hasn't set its own branding (or on the
// pre-auth login screen, where there's no event context yet). The background
// is the blurred art behind each flow/project card.
const DEFAULT_LOGO = '/brand/crux-logo.webp';
const DEFAULT_BACKGROUND = '/brand/card-art.webp';

export const load: LayoutServerLoad = async ({ locals }) => {
	let logoUrl = DEFAULT_LOGO;
	let backgroundUrl = DEFAULT_BACKGROUND;

	if (locals.user) {
		const ctx = await getParticipantContext(locals.user);
		if (ctx) {
			logoUrl = ctx.event.logoUrl || DEFAULT_LOGO;
			backgroundUrl = ctx.event.backgroundUrl || DEFAULT_BACKGROUND;
		}
	}

	return { logoUrl, backgroundUrl };
};
