<script lang="ts">
	import { page } from '$app/state';
	import { pageTitle } from '$lib/branding';
	import EventLogo from '$lib/components/participant/EventLogo.svelte';
	import FlowCard from '$lib/components/participant/FlowCard.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{pageTitle('Submissions closed', page.data.eventName)}</title>
</svelte:head>

<FlowCard>
	<div class="flex h-full flex-col items-center justify-center gap-4 px-10 text-center">
		<EventLogo class="h-[140px] w-auto object-contain" textClass="text-3xl font-bold text-white" />
		<h1 class="text-2xl font-bold">Submissions have closed</h1>
		<p class="text-sm text-white/80">
			{#if data.votingStarted}
				Voting is underway, and submissions locked when it began. Since your project wasn't
				submitted in time, sit tight — results are on their way.
			{:else}
				Submissions have been locked by the organizers. Since your project wasn't submitted in
				time, sit tight — hang in there for what's next.
			{/if}
		</p>
	</div>
</FlowCard>
