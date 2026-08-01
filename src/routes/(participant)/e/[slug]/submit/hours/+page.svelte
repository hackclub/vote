<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { pageTitle } from '$lib/branding';
	import { backHref, stepNumber, SUBMIT_STEPS } from '$lib/submit-steps';
	import FlowCard from '$lib/components/participant/FlowCard.svelte';
	import SectionHeader from '$lib/components/participant/SectionHeader.svelte';
	import CardButton from '$lib/components/participant/CardButton.svelte';

	let { data, form } = $props();

	const back = backHref(data.slug, 'hours');

	const members = data.members ?? [];

	// Hackatime suggestions per member, fetched from the public API (optional).
	let suggestions = $state<Record<string, { name: string; hours: number }[]>>({});

	onMount(async () => {
		for (const m of members) {
			try {
				const res = await fetch(
					`/api/hackatime/projects?participantId=${encodeURIComponent(m.participantId)}&event=${data.slug}`
				);
				if (res.ok) {
					const body = await res.json();
					if (body.projects.length > 0) suggestions[m.id] = body.projects;
				}
			} catch {
				// Suggestions are best-effort; the field stays a free-text input.
			}
		}
	});

	function firstName(name: string) {
		return name.split(' ')[0] || name;
	}
</script>

<svelte:head>
	<title>{pageTitle('Hour estimates', data.eventName)}</title>
</svelte:head>

<FlowCard dim>
	<form method="POST" use:enhance class="flex h-full flex-col px-6 pt-9 pb-6">
		<SectionHeader
			backHref={back}
			step={stepNumber('hours')}
			totalSteps={SUBMIT_STEPS.length}
			title="Hour Estimates"
			subtitle="How much time did your team spend on your projects?"
		/>

		<div class="mt-8 flex flex-col gap-4 overflow-y-auto pb-2">
			{#each members as m (m.id)}
				<div class="flex flex-col gap-1.5">
					<label for="hours-{m.id}" class="text-xs text-[#ccc]">{m.name} - Hours</label>
					<input
						id="hours-{m.id}"
						name="hours:{m.id}"
						type="number"
						min="0"
						max="1000"
						step="0.5"
						value={m.hoursEstimate ?? ''}
						placeholder="0"
						required
						class="h-10 w-full rounded-xl border border-white bg-transparent px-3 text-base text-white placeholder-[#999] transition-shadow duration-150 focus:ring-1 focus:ring-inset focus:ring-white"
					/>
				</div>
				<div class="flex flex-col gap-1.5">
					<label for="hackatime-{m.id}" class="text-xs text-[#ccc]">
						{firstName(m.name)} - Hackatime projects (optional)
					</label>
					<input
						id="hackatime-{m.id}"
						name="hackatime:{m.id}"
						type="text"
						list="hackatime-list-{m.id}"
						value={m.hackatimeProjects.join(', ')}
						placeholder={suggestions[m.id] ? 'Pick or type project names' : 'Comma-separated project names'}
						class="h-10 w-full rounded-xl border border-white bg-transparent px-3 text-base text-white placeholder-[#999] transition-shadow duration-150 focus:ring-1 focus:ring-inset focus:ring-white"
					/>
					<datalist id="hackatime-list-{m.id}">
						{#each suggestions[m.id] ?? [] as s (s.name)}
							<option value={s.name}>{s.name} ({s.hours}h tracked)</option>
						{/each}
					</datalist>
				</div>
			{/each}
		</div>

		{#if form?.message}
			<p class="mt-3 text-sm text-red-400">{form.message}</p>
		{/if}

		<div class="mt-auto pt-4">
			<CardButton>Next →</CardButton>
		</div>
	</form>
</FlowCard>
