<script lang="ts">
	import { pageTitle } from '$lib/branding';
	import ProjectCard from '$lib/components/participant/ProjectCard.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{pageTitle('Gallery', data.eventName)}</title>
</svelte:head>

<div class="w-[590px] max-w-full py-6">
	<div class="flex flex-col gap-1.5">
		<h1 class="text-2xl font-semibold text-white">Gallery</h1>
		<p class="text-base text-[#e6e6e6]">
			Projects submitted to {data.eventName}. Click on a project to take a closer look.
		</p>
	</div>

	{#if data.projects.length === 0}
		<p class="mt-10 text-base text-[#999]">No projects have been submitted yet. Check back soon!</p>
	{:else}
		<div class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
			{#each data.projects as p (p.id)}
				<a href="/gallery/{data.slug}/{p.id}" class="block h-[396px]">
					<ProjectCard
						name={p.name}
						description={p.description}
						screenshotUrl={p.screenshotUrl}
						makers={p.makers}
						size="sm"
						showLinks={false}
					/>
				</a>
			{/each}
		</div>
	{/if}
</div>
