<script lang="ts">
	import { enhance } from '$app/forms';
	import { pageTitle } from '$lib/branding';
	import { backHref, stepNumber, SUBMIT_STEPS } from '$lib/submit-steps';
	import FlowCard from '$lib/components/participant/FlowCard.svelte';
	import SectionHeader from '$lib/components/participant/SectionHeader.svelte';
	import CardButton from '$lib/components/participant/CardButton.svelte';
	import { X } from '@lucide/svelte';

	let { data, form } = $props();

	const back = $derived(backHref(data.slug, 'team', !!data.project?.submittedAt));

	type Member = { participantId: string; name: string; displayName: string | null };

	const self: Member = {
		participantId: data.participant.id,
		name: data.participant.name || data.participant.displayName || 'You',
		displayName: data.participant.displayName
	};

	let members = $state<Member[]>(
		data.members
			? data.members.map((m) => ({
					participantId: m.participantId,
					name: m.name,
					displayName: m.displayName
				}))
			: [self]
	);

	type SearchResult = { id: string; name: string; displayName: string | null };

	let query = $state('');
	let results = $state<SearchResult[]>([]);
	let searching = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;

	const memberIdsJson = $derived(
		JSON.stringify(members.filter((m) => m.participantId !== self.participantId).map((m) => m.participantId))
	);
	const atCapacity = $derived(members.length >= data.event.maxTeamSize);
	const visibleResults = $derived(
		results.filter((r) => !members.some((m) => m.participantId === r.id))
	);

	function search() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			const q = query.trim();
			if (q.length < 2) {
				results = [];
				return;
			}
			searching = true;
			try {
				const res = await fetch(
					`/api/participants/search?q=${encodeURIComponent(q)}&event=${data.slug}`
				);
				if (res.ok) results = (await res.json()).results;
			} finally {
				searching = false;
			}
		}, 200);
	}

	function add(r: SearchResult) {
		if (atCapacity) return;
		members = [...members, { participantId: r.id, name: r.name, displayName: r.displayName }];
		query = '';
		results = [];
	}

	function remove(participantId: string) {
		if (participantId === self.participantId) return;
		members = members.filter((m) => m.participantId !== participantId);
	}
</script>

<svelte:head>
	<title>{pageTitle('Your team', data.eventName)}</title>
</svelte:head>

<FlowCard dim>
	<form method="POST" use:enhance class="flex h-full flex-col px-6 pt-9 pb-6">
		<SectionHeader
			backHref={back}
			step={stepNumber('team')}
			totalSteps={SUBMIT_STEPS.length}
			title="Add your team members"
			subtitle="Only one team member needs to fill out the submission form"
		/>

		<div class="mt-9 flex flex-col gap-1.5">
			<p class="text-xs text-[#ccc]">
				Search by Slack display name. Max ({data.event.maxTeamSize})
			</p>
			<div class="relative">
				<div
					class="flex h-9 w-full items-center justify-between rounded-xl border border-white py-2 pr-2 pl-3 transition-shadow duration-150 focus-within:ring-1 focus-within:ring-white focus-within:ring-inset"
				>
					<input
						type="text"
						bind:value={query}
						oninput={search}
						placeholder="orpheus"
						disabled={atCapacity}
						class="w-full border-none bg-transparent p-0 text-base text-white placeholder-[#999] focus:ring-0 disabled:opacity-50"
					/>
				</div>
				{#if visibleResults.length > 0}
					<div
						class="absolute top-full right-0 left-0 z-20 mt-1 max-h-[140px] overflow-y-auto rounded-xl border border-white bg-[#111]/95 backdrop-blur-md"
					>
						{#each visibleResults as r (r.id)}
							<button
								type="button"
								onclick={() => add(r)}
								class="flex w-full cursor-pointer flex-col px-3 py-1.5 text-left hover:bg-white/10"
							>
								<span class="text-base font-medium text-white">{r.displayName || r.name}</span>
								{#if r.displayName && r.name}
									<span class="text-xs text-[#999]">{r.name}</span>
								{/if}
							</button>
						{/each}
					</div>
				{:else if query.trim().length >= 2 && !searching}
					<div
						class="absolute top-full right-0 left-0 z-20 mt-1 rounded-xl border border-white bg-[#111]/95 px-3 py-2 text-xs text-[#999] backdrop-blur-md"
					>
						No matching participants found
					</div>
				{/if}
			</div>
		</div>

		<div class="mt-4 flex flex-col gap-2">
			{#each members as m (m.participantId)}
				<div
					class="group relative rounded-xl border border-white p-3 transition-all duration-150 hover:bg-white/10 hover:shadow-[inset_0_0_0_1px_white]"
				>
					<p class="text-base font-medium text-white">
						{m.displayName || m.name}{m.participantId === self.participantId ? ' (you)' : ''}
					</p>
					{#if m.displayName && m.name}
						<p class="text-xs text-[#999]">{m.name}</p>
					{/if}
					{#if m.participantId !== self.participantId}
						<button
							type="button"
							onclick={() => remove(m.participantId)}
							aria-label="Remove {m.name}"
							class="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-white opacity-0 transition-opacity group-hover:opacity-100"
						>
							<X size={24} />
						</button>
					{/if}
				</div>
			{/each}
		</div>

		{#if form?.message}
			<p class="mt-3 text-sm text-red-400">{form.message}</p>
		{/if}

		<input type="hidden" name="memberIds" value={memberIdsJson} />
		<div class="mt-auto pt-4">
			<CardButton>Next →</CardButton>
		</div>
	</form>
</FlowCard>
