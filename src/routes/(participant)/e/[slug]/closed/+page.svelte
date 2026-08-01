<script lang="ts">
	import { page } from '$app/state';
	import { pageTitle, PLATFORM_NAME } from '$lib/branding';
	import EventLogo from '$lib/components/participant/EventLogo.svelte';
	import FlowCard from '$lib/components/participant/FlowCard.svelte';

	const eventName = $derived((page.data.eventName as string | null) ?? PLATFORM_NAME);
</script>

<svelte:head>
	<title>{pageTitle('Voting closed', page.data.eventName)}</title>
</svelte:head>

<FlowCard>
	<div class="flex h-full flex-col items-center justify-center gap-4 px-10 text-center">
		<EventLogo class="h-[140px] w-auto object-contain" textClass="text-3xl font-bold text-white" />
		<h1 class="text-2xl font-bold">Voting has closed</h1>
		<p class="text-sm text-white/80">
			Thanks for participating in {eventName}! Results are on their way.
		</p>
	</div>
</FlowCard>
