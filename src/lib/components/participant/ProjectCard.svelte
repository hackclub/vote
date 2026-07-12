<script lang="ts">
	// Trading-card treatment per the Figma design: a "Lava Lamp Mesh" shader
	// backdrop tinted by the project's screenshot, a "Card Foil" shader layer,
	// and a pointer-tracked 3D tilt.
	import { Spring } from 'svelte/motion';
	import { page } from '$app/state';
	import { Play, ExternalLink } from '@lucide/svelte';
	import LavaLampMesh, { DEFAULT_PALETTE, type Palette } from './LavaLampMesh.svelte';
	import CardFoil from './CardFoil.svelte';

	let {
		name,
		description,
		screenshotUrl,
		demoUrl = null,
		repoUrl = null,
		makers,
		size = 'lg',
		showLinks = true,
		voted = false
	}: {
		name: string;
		description: string;
		screenshotUrl: string | null;
		demoUrl?: string | null;
		repoUrl?: string | null;
		makers: string[];
		size?: 'lg' | 'sm';
		showLinks?: boolean;
		voted?: boolean;
	} = $props();

	let card = $state<HTMLDivElement>();

	// The Card Foil shader's light rests centered and follows the cursor on
	// hover — the foil is always visible (constant intensity), never fades out.
	const FOIL_REST = { x: 0.5, y: 0.5 };

	// `pointer` (rests centred) drives the 3D tilt; `hover` (0 at rest, 1 on
	// hover) blends the foil light from its resting spot toward the cursor.
	const pointer = new Spring({ x: 0.5, y: 0.5 }, { stiffness: 0.2, damping: 0.8 });
	const hover = new Spring(0, { stiffness: 0.2, damping: 0.8 });

	const tilt = $derived({
		rx: (0.5 - pointer.current.y) * 14,
		ry: (pointer.current.x - 0.5) * 14
	});

	// Lerp light from rest → cursor by hover amount; at rest it sits at FOIL_REST.
	const foilLight = $derived({
		x: FOIL_REST.x + (pointer.current.x - FOIL_REST.x) * hover.current,
		y: FOIL_REST.y + (pointer.current.y - FOIL_REST.y) * hover.current
	});

	function onMove(e: PointerEvent) {
		if (!card) return;
		const rect = card.getBoundingClientRect();
		pointer.target = {
			x: (e.clientX - rect.left) / rect.width,
			y: (e.clientY - rect.top) / rect.height
		};
		hover.target = 1;
	}

	function onLeave() {
		pointer.target = { x: 0.5, y: 0.5 };
		hover.target = 0;
	}

	// Derive the mesh gradient stops from the screenshot: sample it small,
	// sort by luminance, and take a chroma-weighted average per quartile into
	// a dark→light 4-stop ramp that leans toward the image's colorful pixels.
	let meshPalette = $state<Palette>(DEFAULT_PALETTE);

	$effect(() => {
		const url = screenshotUrl;
		if (!url) {
			meshPalette = DEFAULT_PALETTE;
			return;
		}
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => {
			try {
				const N = 16;
				const ctx = document.createElement('canvas').getContext('2d', {
					willReadFrequently: true
				})!;
				ctx.canvas.width = N;
				ctx.canvas.height = N;
				ctx.drawImage(img, 0, 0, N, N);
				const { data } = ctx.getImageData(0, 0, N, N);
				const px: [number, number, number][] = [];
				for (let i = 0; i < data.length; i += 4) {
					px.push([data[i] / 255, data[i + 1] / 255, data[i + 2] / 255]);
				}
				px.sort(
					(a, b) =>
						a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722 -
						(b[0] * 0.2126 + b[1] * 0.7152 + b[2] * 0.0722)
				);
				const quartile = (from: number, to: number): [number, number, number] => {
					const slice = px.slice(Math.floor(px.length * from), Math.ceil(px.length * to));
					// Weight each pixel by chroma² so saturated colors dominate the
					// stop and the ramp stays colorful; grays still contribute (the
					// epsilon also keeps grayscale screenshots working) but a plain
					// average would wash every stop toward gray.
					const sum = [0, 0, 0];
					let wsum = 0;
					for (const p of slice) {
						const chroma = Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]);
						const w = 0.02 + chroma * chroma;
						sum[0] += p[0] * w;
						sum[1] += p[1] * w;
						sum[2] += p[2] * w;
						wsum += w;
					}
					return [sum[0] / wsum, sum[1] / wsum, sum[2] / wsum];
				};
				meshPalette = [quartile(0, 0.25), quartile(0.25, 0.5), quartile(0.5, 0.75), quartile(0.75, 1)];
			} catch {
				// Canvas tainted (no CORS on the image host) — keep the default palette.
				meshPalette = DEFAULT_PALETTE;
			}
		};
		img.src = url;
	});
</script>

<div class="tilt-scene h-full w-full">
	<div
		bind:this={card}
		onpointermove={onMove}
		onpointerleave={onLeave}
		role="presentation"
		class="foil-card relative h-full w-full overflow-hidden font-phantom {size === 'lg'
			? 'rounded-[22px]'
			: 'rounded-2xl'}"
		style="transform: rotateX({tilt.rx}deg) rotateY({tilt.ry}deg);"
	>
		<!-- Backdrop: the Figma "Lava Lamp Mesh" shader fill, ported to WebGL -->
		<div class="absolute inset-0" aria-hidden="true">
			<LavaLampMesh palette={meshPalette} />
			<div class="absolute inset-0 bg-black/20"></div>
			<div
				class="absolute inset-0 bg-gradient-to-b from-black/10 via-black/45 to-black/80 {size === 'lg'
					? 'top-1/3'
					: 'top-1/4'}"
			></div>
		</div>

		<!-- Foil is a post-effect over the whole card, same as the Figma shader
		     effect (node 144:60). Constant intensity so it's always visible;
		     the light tracks the cursor on hover. -->
		<CardFoil lightX={foilLight.x} lightY={foilLight.y} />

		{#if voted}
			<!-- Diagonal "VOTED" stamp (Figma node 184:113): centered horizontally,
			     ~87% of card width, sitting across the mid/description area. -->
			<img
				src="/brand/voted-stamp.svg"
				alt="Voted"
				class="pointer-events-none absolute top-[72%] left-1/2 z-30 w-[87%] -translate-x-1/2 -translate-y-1/2"
			/>
		{/if}

		<div class="relative z-10 flex h-full flex-col p-4">
			<img
				src={page.data.logoUrl ?? '/brand/crux-logo.webp'}
				alt="Event logo"
				class="{size === 'lg'
					? 'h-11'
					: 'h-7'} w-auto self-start object-contain brightness-0 invert"
			/>
			<div
				class="mt-2 w-full overflow-hidden rounded-md bg-black/40 {size === 'lg'
					? 'h-[240px]'
					: 'h-[159px]'}"
			>
				{#if screenshotUrl}
					<img src={screenshotUrl} alt="Screenshot of {name}" class="h-full w-full object-cover" />
				{/if}
			</div>
			<h2
				class="truncate font-medium text-white {size === 'lg'
					? 'mt-2 text-[32px]'
					: 'mt-1.5 text-[22px]'}"
			>
				{name}
			</h2>
			<p
				class="mt-1 overflow-hidden text-white transition-opacity {voted
					? 'opacity-0'
					: ''} {size === 'lg' ? 'line-clamp-4 text-xl leading-snug' : 'line-clamp-4 text-base leading-snug'}"
			>
				{description}
			</p>
			{#if showLinks && (demoUrl || repoUrl)}
				<div class="mt-4 flex flex-col gap-1.5">
					{#if demoUrl}
						<a
							href={demoUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-2 text-base text-white"
						>
							<Play size={16} class="shrink-0" />
							<span class="min-w-0 flex-1 truncate">{demoUrl}</span>
							<ExternalLink size={15} class="shrink-0 opacity-70" />
						</a>
					{/if}
					{#if repoUrl}
						<a
							href={repoUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-2 text-base text-white"
						>
							<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" class="shrink-0" aria-hidden="true">
								<path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
							</svg>
							<span class="min-w-0 flex-1 truncate">{repoUrl}</span>
							<ExternalLink size={15} class="shrink-0 opacity-70" />
						</a>
					{/if}
				</div>
			{/if}
			<p class="mt-auto truncate pt-3 text-[#ccc] {size === 'lg' ? 'text-base' : 'text-[15px]'}">
				Made by {makers.join(', ')}
			</p>
		</div>
	</div>
</div>

<style>
	.tilt-scene {
		perspective: 900px;
	}
	.foil-card {
		transform-style: preserve-3d;
		will-change: transform;
	}
</style>
