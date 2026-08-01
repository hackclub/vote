<script lang="ts">
	import { pageTitle } from '$lib/branding';
	import ProjectCard from '$lib/components/participant/ProjectCard.svelte';

	let { data } = $props();

	const votingOpen = $derived(data.stage === 'VOTING');
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
	<div class="flex items-center justify-center gap-2.5 font-bricolage">
		{#if votingOpen}
			<span
				class="{buttonClasses} cursor-not-allowed border-[#9b9b9b] text-[#9b9b9b]"
				title="Submissions are locked while voting is open"
			>
				Edit
			</span>
		{:else}
			<a
				href="/e/{data.slug}/submit/team"
				class="{buttonClasses} border-cream text-white hover:bg-white/10"
			>
				Edit
			</a>
		{/if}
		{#if votingOpen}
			<a href="/e/{data.slug}/vote" class="{buttonClasses} border-cream text-white hover:bg-white/10">
				Begin Voting
			</a>
		{:else}
			<span
				class="{buttonClasses} cursor-not-allowed border-[#9b9b9b] text-[#9b9b9b]"
				title="Voting hasn't started yet"
			>
				Begin Voting
			</span>
		{/if}
	</div>
</div>
