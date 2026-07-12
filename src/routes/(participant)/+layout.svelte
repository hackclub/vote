<script lang="ts">
	import { page } from '$app/state';

	let { children, data } = $props();

	const showCruxLogo = $derived(!page.url.pathname.startsWith('/login'));
</script>

<div class="relative min-h-screen overflow-hidden bg-[#111] font-bricolage text-white">
	<!-- Tiled sliding bg pattern (same treatment as hackclub/horizons), rotated per the Figma -->
	<div
		class="pointer-events-none fixed -inset-[50%] flex -rotate-[19.54deg] items-center justify-center"
		aria-hidden="true"
	>
		<div class="pattern-slide h-[300%] w-[300%] bg-repeat"></div>
	</div>

	<div class="absolute top-4 left-4 z-10">
		<img
			src="/brand/votelogo.svg"
			alt="Hack Club Horizons — VOTE!"
			class="h-[79px] w-[194px] object-contain object-left"
		/>
	</div>
	{#if showCruxLogo}
		<img
			src={data.logoUrl}
			alt="Event logo"
			class="absolute top-4 right-4 z-10 h-20 w-[137px] object-contain"
		/>
	{/if}
	<main class="relative z-10 flex min-h-screen items-center justify-center px-4 py-28 lg:py-10">
		{@render children()}
	</main>
	{#if data.signedIn}
		<div class="fixed right-4 bottom-4 z-10 flex items-center gap-1.5 text-xs text-[#999]">
			<form method="POST" action="/auth/logout">
				<button type="submit" class="cursor-pointer transition-colors hover:text-white">
					Sign out
				</button>
			</form>
			{#if data.isAdmin}
				<span aria-hidden="true">•</span>
				<a href="/admin" class="transition-colors hover:text-white">Admin</a>
			{/if}
		</div>
	{/if}
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
