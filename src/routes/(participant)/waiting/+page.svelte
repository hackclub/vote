<script lang="ts">
	import { page } from '$app/state';
	import FlowCard from '$lib/components/participant/FlowCard.svelte';
</script>

<svelte:head>
	<title>Coming soon · Horizons Crux</title>
</svelte:head>

<FlowCard>
	<div class="flex h-full flex-col items-center justify-center gap-4 px-10 text-center">
		<img src={page.data.logoUrl} alt="Event logo" class="h-[140px] w-auto object-contain" />
		<h1 class="text-2xl font-bold">Hang tight!</h1>
		<p class="text-sm text-white/80">
			Submissions haven't opened yet. Check back when the event kicks off.
		</p>
	</div>
</FlowCard>
