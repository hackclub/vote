<script lang="ts">
	import { enhance } from '$app/forms';
	import { pageTitle } from '$lib/branding';
	import { backHref, stepNumber, SUBMIT_STEPS } from '$lib/submit-steps';
	import FlowCard from '$lib/components/participant/FlowCard.svelte';
	import SectionHeader from '$lib/components/participant/SectionHeader.svelte';
	import CardButton from '$lib/components/participant/CardButton.svelte';
	import { Check } from '@lucide/svelte';

	let { data } = $props();

	const back = backHref(data.slug, 'checklist');

	let checked = $state<boolean[]>(data.event.checklistItems.map(() => !!data.project?.checklistCompletedAt));
	const allChecked = $derived(checked.every(Boolean));

	function toggle(i: number) {
		checked[i] = !checked[i];
	}
</script>

<svelte:head>
	<title>{pageTitle('Checklist', data.eventName)}</title>
</svelte:head>

<FlowCard dim>
	<form method="POST" use:enhance class="flex h-full flex-col px-6 pt-9 pb-6">
		<SectionHeader
			backHref={back}
			step={stepNumber('checklist')}
			totalSteps={SUBMIT_STEPS.length}
			title="Pre-submission Checklist"
			subtitle="Make sure this project meets all the requirements below before you start submitting"
		/>

		<div class="mt-10 flex flex-col gap-3">
			{#each data.event.checklistItems as item, i (i)}
				<label class="flex cursor-pointer items-center gap-2.5">
					<button
						type="button"
						role="checkbox"
						aria-checked={checked[i]}
						onclick={() => toggle(i)}
						class="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-all {checked[i]
							? 'border-white bg-white text-[#141414]'
							: 'border-white bg-transparent hover:bg-white/20 hover:shadow-[inset_0_0_0_1px_white]'}"
					>
						{#if checked[i]}
							<Check size={16} strokeWidth={3} />
						{/if}
					</button>
					<span class="text-base text-white">{item}</span>
				</label>
			{/each}
		</div>

		<div class="mt-auto pt-4">
			<CardButton disabled={!allChecked}>
				<span class="grid place-items-center">
					<span
						class="col-start-1 row-start-1 transition-opacity duration-300 {allChecked
							? 'opacity-0'
							: 'opacity-100'}"
					>
						Complete Required Fields to Continue
					</span>
					<span
						class="col-start-1 row-start-1 transition-opacity duration-300 {allChecked
							? 'opacity-100'
							: 'opacity-0'}"
					>
						Next →
					</span>
				</span>
			</CardButton>
		</div>
	</form>
</FlowCard>
