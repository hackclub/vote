import { prisma } from './db';

const BRANDING_SELECT = {
	name: true,
	slug: true,
	logoUrl: true,
	cardLogoMonochrome: true,
	backgroundUrl: true
} as const;

/**
 * The event that brands pages with no event in context — the login screen and
 * the event picker. Prefers the newest event that's actually running, falling
 * back to the newest event of any stage so a platform whose events are all
 * draft or finished still has something to show.
 */
export async function getFeaturedEvent() {
	const live = await prisma.event.findFirst({
		where: { stage: { in: ['SUBMISSION', 'VOTING'] } },
		orderBy: { createdAt: 'desc' },
		select: BRANDING_SELECT
	});
	if (live) return live;

	return prisma.event.findFirst({ orderBy: { createdAt: 'desc' }, select: BRANDING_SELECT });
}
