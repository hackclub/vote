export const SUBMIT_STEPS = ['team', 'checklist', 'details', 'links', 'hours'] as const;
export type SubmitStep = (typeof SUBMIT_STEPS)[number];

/**
 * Where a step's back control points. Revisiting an earlier step is always
 * allowed (see guardStepOrder), so this just walks the flow backwards. The
 * first step has nothing before it and falls back to the project page — which
 * only exists for a team that already submitted and came back to edit.
 */
export function backHref(slug: string, step: SubmitStep, submitted = false): string | null {
	const i = SUBMIT_STEPS.indexOf(step);
	if (i > 0) return `/e/${slug}/submit/${SUBMIT_STEPS[i - 1]}`;
	return submitted ? `/e/${slug}/project` : null;
}

/** 1-based position of a step, for the "Step N of M" caption. */
export function stepNumber(step: SubmitStep): number {
	return SUBMIT_STEPS.indexOf(step) + 1;
}
