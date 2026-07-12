<script lang="ts">
	import { page } from '$app/state';

	const isNotFound = $derived(page.status === 404);
	const heading = $derived(isNotFound ? 'Page not found' : 'Something went wrong');
	const detail = $derived(
		isNotFound
			? "That page doesn't exist — it may have moved, or the link was mistyped."
			: (page.error?.message ?? 'An unexpected error occurred.')
	);
</script>

<svelte:head>
	<title>{page.status} · Horizons Crux</title>
</svelte:head>

<div class="relative min-h-screen overflow-hidden bg-[#111] font-bricolage text-white">
	<!-- Same tiled sliding pattern as the participant flow -->
	<div
		class="pointer-events-none fixed -inset-[50%] flex -rotate-[19.54deg] items-center justify-center"
		aria-hidden="true"
	>
		<div class="pattern-slide h-[300%] w-[300%] bg-repeat"></div>
	</div>

	<div class="absolute top-4 left-4 z-10">
		<img
			src="/brand/logo-lm.svg"
			alt="Hack Club Horizons — VOTE!"
			class="h-[79px] w-[194px] object-contain object-left"
		/>
	</div>

	<main class="relative z-10 flex min-h-screen items-center justify-center px-4 py-28 lg:py-10">
		<div class="flex flex-col items-center gap-4 text-center">
			<p class="text-7xl font-bold tracking-tight text-white/90">{page.status}</p>
			<h1 class="text-2xl font-bold">{heading}</h1>
			<p class="max-w-sm text-sm text-white/80">{detail}</p>
			<a
				href="/"
				class="mt-2 rounded-full bg-white px-6 py-2 text-sm font-semibold text-[#111] transition hover:bg-white/90"
			>
				Back to safety
			</a>
		</div>
	</main>
</div>

<style>
	.pattern-slide {
		background-image: url('/brand/bg-pattern.svg');
		background-size: 1600px;
		opacity: 0.06;
		animation: slide 40s linear infinite;
	}

	@keyframes slide {
		from {
			background-position: 0 0;
		}
		to {
			background-position: -1600px 1600px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pattern-slide {
			animation: none;
		}
	}
</style>
