<script lang="ts">
	import { page } from '$app/state';
	import { pageTitle } from '$lib/branding';
	import EventLogo from '$lib/components/participant/EventLogo.svelte';
	import FlowCard from '$lib/components/participant/FlowCard.svelte';

	const eventName = $derived(page.data.eventName as string | null);
</script>

<svelte:head>
	<title>{pageTitle('Sign in', eventName)}</title>
</svelte:head>

<FlowCard>
	<div class="flex h-full flex-col items-center px-6">
		<EventLogo
			class="mt-16 h-[190px] w-[327px] object-contain drop-shadow-sm"
			textClass="mt-16 flex h-[190px] w-[327px] items-center justify-center text-center text-4xl font-bold"
		/>
		<p class="mt-auto text-xl font-semibold">
			{eventName ? `Vote for ${eventName}!` : 'Sign in to get started'}
		</p>
		<a
			href="/auth/login"
			class="mt-3 mb-6 flex w-[413px] max-w-full items-center justify-center gap-4 rounded-2xl border-2 border-cream px-6 py-4 backdrop-blur-[15px] transition-colors hover:bg-white/10"
		>
			<img src="/brand/hc-icon.svg" alt="" class="h-[38px] w-9" />
			<span class="text-xl font-semibold text-white">Sign in to Hack Club →</span>
		</a>
	</div>
</FlowCard>
