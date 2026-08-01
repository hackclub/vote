<script lang="ts">
	import { pageTitle } from '$lib/branding';
	import ProjectCard from '$lib/components/participant/ProjectCard.svelte';

	let { data } = $props();

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
	<div class="flex items-center justify-center font-bricolage">
		<a
			href="/gallery/{data.slug}"
			class="{buttonClasses} border-cream text-white hover:bg-white/10"
		>
			Back
		</a>
	</div>
</div>
