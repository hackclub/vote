<script lang="ts">
	import { page } from '$app/state';
	import { pageTitle } from '$lib/branding';
	import FlowCard from '$lib/components/participant/FlowCard.svelte';
	import CardButton from '$lib/components/participant/CardButton.svelte';

	let { data } = $props();

	const eventName = $derived((page.data.eventName as string | null) ?? 'this event');
</script>

<svelte:head>
	<title>{pageTitle('Not registered', page.data.eventName)}</title>
</svelte:head>

<FlowCard>
	<div class="flex h-full flex-col items-center justify-center gap-4 px-10 text-center">
		<h1 class="text-2xl font-bold">You're not on the list… yet!</h1>
		<p class="text-sm text-white/80">
			<span class="font-semibold">{data.email}</span> isn't registered for {eventName}. Make sure you
			sign in with the email you registered with, or ask an organizer to add you.
		</p>
		<form method="POST" action="/auth/logout" class="mt-4 w-full">
			<CardButton>Sign out</CardButton>
		</form>
	</div>
</FlowCard>
