<script lang="ts">
	import { page } from '$app/state';
	import { pageTitle } from '$lib/branding';
	import EventLogo from '$lib/components/participant/EventLogo.svelte';
	import FlowCard from '$lib/components/participant/FlowCard.svelte';
</script>

<svelte:head>
	<title>{pageTitle('Coming soon', page.data.eventName)}</title>
</svelte:head>

<FlowCard>
	<div class="flex h-full flex-col items-center justify-center gap-4 px-10 text-center">
		<EventLogo class="h-[140px] w-auto object-contain" textClass="text-3xl font-bold text-white" />
		<h1 class="text-2xl font-bold">Hang tight!</h1>
		<p class="text-sm text-white/80">
			Submissions haven't opened yet. Check back when the event kicks off.
		</p>
	</div>
</FlowCard>
