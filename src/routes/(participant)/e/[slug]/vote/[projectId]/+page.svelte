<script lang="ts">
	import { enhance } from '$app/forms';
	import { pageTitle } from '$lib/branding';
	import ProjectCard from '$lib/components/participant/ProjectCard.svelte';

	let { data, form } = $props();

	const outOfVotes = $derived(!data.voted && data.votesUsed >= data.voteLimit);
	const buttonClasses =
		'flex h-[52px] w-[160px] items-center justify-center overflow-clip rounded-2xl border-2 px-6 text-base font-medium backdrop-blur-[15px] transition-colors';
</script>

<svelte:head>
	<title>{pageTitle(data.project.name, data.eventName)}</title>
</svelte:head>

<div class="flex w-[440px] max-w-full flex-col gap-6">
	<div class="h-[616px]">
		<ProjectCard
			name={data.project.name}
			description={data.project.description}
			screenshotUrl={data.project.screenshotUrl}
			demoUrl={data.project.demoUrl}
			repoUrl={data.project.repoUrl}
			makers={data.makers}
			size="lg"
		/>
	</div>
	{#if form?.message}
		<p class="text-center font-bricolage text-sm text-red-400">{form.message}</p>
	{/if}
	<form method="POST" action="?/vote" use:enhance class="flex items-center justify-center gap-2.5 font-bricolage">
		<a href="/e/{data.slug}/vote" class="{buttonClasses} border-cream text-white hover:bg-white/10"
			>Back</a
		>
		{#if outOfVotes}
			<span class="{buttonClasses} cursor-not-allowed border-[#9b9b9b] text-[#9b9b9b]" title="No votes left">
				Vote
			</span>
		{:else}
			<button
				type="submit"
				class="{buttonClasses} cursor-pointer {data.voted
					? 'border-cream bg-cream/90 text-[#141414] hover:bg-cream'
					: 'border-cream text-white hover:bg-white/10'}"
			>
				{data.voted ? 'Remove Vote' : 'Vote'}
			</button>
		{/if}
	</form>
</div>
