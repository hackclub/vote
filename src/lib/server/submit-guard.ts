import { redirect } from '@sveltejs/kit';
import {
	getParticipantContext,
	flowDestination,
	SUBMIT_STEPS,
	type SubmitStep,
	type ParticipantContext
} from './flow';

/**
 * Action guard: signed in, participant, and the event accepts submissions.
 * Submissions lock the moment voting starts — no new or edited submissions during
 * VOTING — or when an admin freezes them mid-SUBMISSION via `submissionsLocked`.
 */
export async function requireSubmissionCtx(
	locals: App.Locals,
	slug: string
): Promise<ParticipantContext> {
	if (!locals.user) redirect(302, '/login');
	const ctx = await getParticipantContext(locals.user, slug);
	if (!ctx) redirect(302, '/');
	if (ctx.event.stage !== 'SUBMISSION' || ctx.event.submissionsLocked)
		redirect(302, flowDestination(ctx));
	return ctx;
}

/** Action guard for steps after `team`: a team + draft project must exist. */
export async function requireProjectCtx(locals: App.Locals, slug: string) {
	const ctx = await requireSubmissionCtx(locals, slug);
	if (!ctx.team || !ctx.project) redirect(302, `/e/${slug}/submit/team`);
	return { ...ctx, team: ctx.team, project: ctx.project };
}

/**
 * Load guard: don't let people jump ahead of their current step
 * (revisiting earlier steps — or any step after submitting — is fine).
 */
export function guardStepOrder(
	data: { members: unknown; project: { currentStep: number; submittedAt: Date | null } | null },
	step: SubmitStep,
	slug: string
) {
	if (step === 'team') return;
	if (!data.members || !data.project) redirect(302, `/e/${slug}/submit/team`);
	if (!data.project.submittedAt) {
		const idx = SUBMIT_STEPS.indexOf(step);
		if (idx > data.project.currentStep) {
			redirect(302, `/e/${slug}/submit/${SUBMIT_STEPS[data.project.currentStep]}`);
		}
	}
}
