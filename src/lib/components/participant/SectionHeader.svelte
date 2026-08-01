<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';

	// `backHref` is null on the first reachable step, where there's nowhere to
	// go back to — the control disappears rather than dead-ending.
	let {
		title,
		subtitle,
		backHref = null,
		step,
		totalSteps
	}: {
		title: string;
		subtitle?: string;
		backHref?: string | null;
		step?: number;
		totalSteps?: number;
	} = $props();
</script>

<div class="flex flex-col gap-2">
	{#if backHref}
		<div class="flex items-center gap-2">
			<a
				href={backHref}
				aria-label="Back"
				title="Back"
				class="-ml-1 flex size-7 shrink-0 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10"
			>
				<ArrowLeft size={20} />
			</a>
			{#if step && totalSteps}
				<span class="text-xs font-medium text-[#ccc] tabular-nums">
					{step}/{totalSteps}
				</span>
			{/if}
		</div>
	{/if}
	<div class="flex items-start gap-4">
		<div class="flex min-w-0 flex-1 flex-col gap-1.5">
			<h1 class="text-2xl font-semibold text-white">{title}</h1>
			{#if subtitle}
				<p class="text-base text-[#e6e6e6]">{subtitle}</p>
			{/if}
		</div>
		{#if step && totalSteps && !backHref}
			<span class="shrink-0 pt-2 text-xs font-medium text-[#ccc] tabular-nums">
				{step}/{totalSteps}
			</span>
		{/if}
	</div>
</div>
