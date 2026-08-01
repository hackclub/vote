<script lang="ts">
	import { enhance } from '$app/forms';
	import { pageTitle } from '$lib/branding';
	import { backHref, stepNumber, SUBMIT_STEPS } from '$lib/submit-steps';
	import FlowCard from '$lib/components/participant/FlowCard.svelte';
	import SectionHeader from '$lib/components/participant/SectionHeader.svelte';
	import CardButton from '$lib/components/participant/CardButton.svelte';
	import ScreenshotUpload from '$lib/components/participant/ScreenshotUpload.svelte';

	let { data, form } = $props();

	const back = backHref(data.slug, 'details');

	let name = $state(form?.values?.name ?? data.project?.name ?? '');
	let description = $state(form?.values?.description ?? data.project?.description ?? '');
	let screenshotUrl = $state(form?.values?.screenshotUrl ?? data.project?.screenshotUrl ?? '');
	let uploading = $state(false);
</script>

<svelte:head>
	<title>{pageTitle('Project details', data.eventName)}</title>
</svelte:head>

<FlowCard dim>
	<form method="POST" use:enhance class="flex h-full flex-col px-6 pt-9 pb-6">
		<SectionHeader
			backHref={back}
			step={stepNumber('details')}
			totalSteps={SUBMIT_STEPS.length}
			title="Project Details"
			subtitle="Put down details about your project. What's your project about?"
		/>

		<div class="mt-7 flex flex-col gap-4">
			<div class="flex flex-col gap-1.5">
				<label for="name" class="text-xs text-[#ccc]">Project Name ({name.length}/50)</label>
				<input
					id="name"
					name="name"
					type="text"
					bind:value={name}
					maxlength={50}
					placeholder="Podium 3 Ultra"
					class="h-10 w-full rounded-xl border border-white bg-transparent px-3 text-base text-white placeholder-[#999] transition-shadow duration-150 focus:ring-1 focus:ring-inset focus:ring-white"
				/>
			</div>

			<div class="flex flex-col gap-1.5">
				<span class="text-xs text-[#ccc]">Screenshot</span>
				<ScreenshotUpload
					bind:value={screenshotUrl}
					bind:uploading
					endpoint="/api/screenshot?event={data.slug}"
				/>
			</div>

			<div class="flex flex-col gap-1.5">
				<label for="description" class="text-xs text-[#ccc]">
					Description ({description.length}/500)
				</label>
				<textarea
					id="description"
					name="description"
					bind:value={description}
					maxlength={500}
					rows={3}
					placeholder="This is a multiline"
					class="w-full resize-none rounded-xl border border-white bg-transparent px-3 py-3 text-base text-white placeholder-[#999] transition-shadow duration-150 focus:ring-1 focus:ring-inset focus:ring-white"
				></textarea>
			</div>
		</div>

		{#if form?.message}
			<p class="mt-3 text-sm text-red-400">{form.message}</p>
		{/if}

		<input type="hidden" name="screenshotUrl" value={screenshotUrl} />
		<div class="mt-auto pt-4">
			<CardButton disabled={uploading}>Next →</CardButton>
		</div>
	</form>
</FlowCard>
