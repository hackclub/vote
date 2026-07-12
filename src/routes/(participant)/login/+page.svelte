<script lang="ts">
	import { page } from '$app/state';
	import FlowCard from '$lib/components/participant/FlowCard.svelte';
</script>

<svelte:head>
	<title>Sign in · Horizons Crux</title>
</svelte:head>

<FlowCard>
	<div class="flex h-full flex-col items-center px-6">
		<img
			src={page.data.logoUrl}
			alt="Event logo"
			class="mt-16 h-[190px] w-[327px] object-contain drop-shadow-sm"
		/>
		<p class="mt-auto text-xl font-semibold">Vote for Horizons Crux!</p>
		<a
			href="/auth/login"
			class="mt-3 mb-6 flex w-[413px] max-w-full items-center justify-center gap-4 rounded-2xl border-2 border-cream px-6 py-4 backdrop-blur-[15px] transition-colors hover:bg-white/10"
		>
			<img src="/brand/hc-icon.svg" alt="" class="h-[38px] w-9" />
			<span class="text-xl font-semibold text-white">Sign in to Hack Club →</span>
		</a>
	</div>
</FlowCard>
