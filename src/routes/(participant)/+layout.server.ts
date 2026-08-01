import { getAdminScope } from '$lib/server/admin';
import { getFeaturedEvent } from '$lib/server/featured-event';
import type { LayoutServerLoad } from './$types';

// Branding for the login screen and the event picker, where there's no single
// event in context — it follows the featured event so the platform never shows
// one event's name on another's behalf. Event-scoped pages under /e/[slug] and
// /gallery/[slug] override this with their own event. The background is the
// blurred art behind each flow/project card.
const DEFAULT_BACKGROUND = '/brand/card-art.webp';

export const load: LayoutServerLoad = async ({ locals }) => {
	const featured = await getFeaturedEvent();

	return {
		eventName: featured?.name ?? null,
		logoUrl: featured?.logoUrl ?? null,
		cardLogoMonochrome: featured?.cardLogoMonochrome ?? true,
		backgroundUrl: featured?.backgroundUrl || DEFAULT_BACKGROUND,
		signedIn: !!locals.user,
		isAdmin: !!(await getAdminScope(locals.user))
	};
};
