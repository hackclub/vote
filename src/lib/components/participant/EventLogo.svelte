<script lang="ts">
	import { page } from '$app/state';
	import { PLATFORM_NAME } from '$lib/branding';

	// Branding comes from layout/page data so every surface follows whichever
	// event is in context. Events that haven't uploaded a logo fall back to
	// their name as text rather than to another event's artwork.
	let { class: className = '', textClass = '' }: { class?: string; textClass?: string } = $props();

	const name = $derived(page.data.eventName ?? PLATFORM_NAME);
</script>

{#if page.data.logoUrl}
	<img src={page.data.logoUrl} alt="{name} logo" class={className} />
{:else}
	<span class={textClass}>{name}</span>
{/if}
