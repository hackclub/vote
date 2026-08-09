import { redirect } from '@sveltejs/kit';
import { getParticipantContext, flowDestination, type ParticipantContext } from './flow';

/**
 * Voting requires: signed in, participant, stage VOTING, and own project
 * submitted.
 */
export async function requireVotingCtx(
	locals: App.Locals,
	slug: string
): Promise<ParticipantContext> {
	if (!locals.user) redirect(302, '/login');
	const ctx = await getParticipantContext(locals.user, slug);
	if (!ctx) redirect(302, '/');
	if (ctx.event.stage !== 'VOTING') redirect(302, flowDestination(ctx));
	if (!ctx.project?.submittedAt) redirect(302, flowDestination(ctx));
	return ctx;
}

/** Stable per-viewer shuffle so ballot order doesn't bias early projects. */
export function stableShuffle<T extends { id: string }>(items: T[], seed: string): T[] {
	const hash = (s: string) => {
		let h = 2166136261;
		for (let i = 0; i < s.length; i++) {
			h ^= s.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return h >>> 0;
	};
	return [...items].sort((a, b) => hash(a.id + seed) - hash(b.id + seed));
}
