<script lang="ts">
	import { enhance } from '$app/forms';
	import FlowCard from '$lib/components/participant/FlowCard.svelte';
	import SectionHeader from '$lib/components/participant/SectionHeader.svelte';
	import CardButton from '$lib/components/participant/CardButton.svelte';

	let { data, form } = $props();

	let demoUrl = $state(form?.values?.demoUrl ?? data.project?.demoUrl ?? '');
	let repoUrl = $state(form?.values?.repoUrl ?? data.project?.repoUrl ?? '');
</script>

<svelte:head>
	<title>Project links · Horizons Crux</title>
</svelte:head>

<FlowCard dim>
	<form method="POST" use:enhance class="flex h-full flex-col px-6 pt-9 pb-6">
		<SectionHeader
			title="Project Details"
			subtitle="Put down details about your project. What's your project about?"
		/>

		<div class="mt-12 flex flex-col gap-4">
			<div class="flex flex-col gap-1.5">
				<label for="demoUrl" class="text-xs text-[#ccc]">Demo link to your project</label>
				<input
					id="demoUrl"
					name="demoUrl"
					type="url"
					bind:value={demoUrl}
					placeholder="https://my-project.example.com"
					class="h-10 w-full rounded-xl border border-white bg-transparent px-3 text-base text-white placeholder-[#999] transition-shadow duration-150 focus:ring-1 focus:ring-inset focus:ring-white"
				/>
				<p class="text-[10px] leading-tight text-[#999]">
					Everyone should be able to use your project from this link. This can be a URL to your
					site, a link to a GitHub release, an itch.io page, etc.
				</p>
			</div>

			<div class="flex flex-col gap-1.5">
				<label for="repoUrl" class="text-xs text-[#ccc]"
					>Git repository (GitHub) link to your project</label
				>
				<input
					id="repoUrl"
					name="repoUrl"
					type="url"
					bind:value={repoUrl}
					placeholder="https://github.com/you/project"
					class="h-10 w-full rounded-xl border border-white bg-transparent px-3 text-base text-white placeholder-[#999] transition-shadow duration-150 focus:ring-1 focus:ring-inset focus:ring-white"
				/>
				<p class="text-[10px] leading-tight text-[#999]">
					Should be a valid and working, accessible git repository — GitHub, GitLab, Codeberg,
					Bitbucket, etc.
				</p>
			</div>
		</div>

		{#if form?.message}
			<p class="mt-3 text-sm text-red-400">{form.message}</p>
		{/if}

		<div class="mt-auto pt-4">
			<CardButton>Next →</CardButton>
		</div>
	</form>
</FlowCard>
