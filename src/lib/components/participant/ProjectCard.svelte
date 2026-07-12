<script lang="ts">
	// Trading-card treatment per the Figma design: a "Lava Lamp Mesh" shader
	// backdrop tinted by the project's screenshot, a "Card Foil" shader layer,
	// and a pointer-tracked 3D tilt.
	import { Spring } from 'svelte/motion';
	import { page } from '$app/state';
	import { Play, ExternalLink } from '@lucide/svelte';
	import LavaLampMesh, { type Palette } from './LavaLampMesh.svelte';
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

	// Per-card randomness, hashed from the project name so it's stable across
	// re-renders and the same project matches between the list and detail
	// pages. Without a seed every card renders the identical mesh field.
	function hash01(s: string) {
		let h = 2166136261;
		for (let i = 0; i < s.length; i++) {
			h ^= s.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return (h >>> 0) / 4294967296;
	}
	const meshSeed = $derived(hash01(name));
	const meshBlobScale = $derived(1.6 + hash01(name + '/scale') * 1.1);
	const meshWarp = $derived(0.55 + hash01(name + '/warp') * 0.6);
	const meshSoftness = $derived(0.4 + hash01(name + '/soft') * 0.3);

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

	// Derive the mesh gradient stops from the screenshot's dominant hue
	// (chroma²-weighted so saturated accents outvote washed-out backgrounds).
	// Null means "no usable screenshot" and falls back to the seed-hued ramp
	// below. Blob lightness/saturation sit slightly below where the raw
	// screenshot colors would land — the white card text renders directly
	// over the mesh, and brighter stops cost legibility.
	let meshPalette = $state<Palette | null>(null);

	// The ramp is one analogous sweep around an anchor hue: a dark base at
	// the anchor and blobs at anchor−spread / anchor / anchor+spread. Each
	// card stays a single color family, but the family spans a broad arc —
	// turquoise→blue→purple rather than blue at three lightnesses.
	const meshSpread = $derived(0.85 + hash01(name + '/spread') * 0.3); // hue/60° units
	function sweepPalette(h: number, s: number): Palette {
		return [
			hsl(h, sat(s, 0.3, 0.65), 0.16),
			hsl((h - meshSpread + 6) % 6, sat(s, 0.42, 0.68), 0.44),
			hsl(h, sat(s, 0.42, 0.68), 0.5),
			hsl((h + meshSpread) % 6, sat(s, 0.42, 0.68), 0.55)
		];
	}

	// Cards without a usable screenshot pick their anchor hue from the seed,
	// so each fallback card lands in its own color family.
	const fallbackPalette = $derived(sweepPalette(hash01(name + '/hue') * 6, 0.55));

	// h is HSL hue / 60°, in [0, 6).
	function hueSat(r: number, g: number, b: number) {
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const c = max - min;
		let h = 0;
		if (c > 0) {
			if (max === r) h = ((g - b) / c + 6) % 6;
			else if (max === g) h = (b - r) / c + 2;
			else h = (r - g) / c + 4;
		}
		const l = (max + min) / 2;
		return { h, s: c === 0 ? 0 : c / (1 - Math.abs(2 * l - 1)) };
	}

	function hsl(h: number, s: number, l: number): [number, number, number] {
		const a = s * Math.min(l, 1 - l);
		const f = (n: number) => {
			const k = (n + h * 2) % 12;
			return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
		};
		return [f(0), f(8), f(4)];
	}

	// Clamp saturation into a vivid range — but only for genuinely colorful
	// sources. Below the knee the boost is proportional (lo * s/KNEE, meeting
	// the clamp exactly at the knee), so near-gray screenshots keep a muted
	// ramp instead of having a faint tint yanked up to the floor.
	const SAT_KNEE = 0.25;
	const sat = (s: number, lo: number, hi: number) =>
		s < SAT_KNEE ? lo * (s / SAT_KNEE) : Math.min(hi, Math.max(lo, s));

	$effect(() => {
		const url = screenshotUrl;
		meshPalette = null;
		if (!url) return;
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => {
			try {
				const N = 24;
				const ctx = document.createElement('canvas').getContext('2d', {
					willReadFrequently: true
				})!;
				ctx.canvas.width = N;
				ctx.canvas.height = N;
				ctx.drawImage(img, 0, 0, N, N);
				const { data } = ctx.getImageData(0, 0, N, N);

				const BINS = 12;
				const weight = new Array(BINS).fill(0);
				const sums = Array.from({ length: BINS }, () => [0, 0, 0]);
				for (let i = 0; i < data.length; i += 4) {
					const r = data[i] / 255;
					const g = data[i + 1] / 255;
					const b = data[i + 2] / 255;
					const c = Math.max(r, g, b) - Math.min(r, g, b);
					// True grays carry no hue vote; lightly tinted grays still count
					// but keep their low saturation through the proportional boost,
					// so they read as tinted gray rather than vivid color.
					if (c < 0.03) continue;
					const bin = Math.min(BINS - 1, Math.floor((hueSat(r, g, b).h / 6) * BINS));
					const w = c * c;
					weight[bin] += w;
					sums[bin][0] += r * w;
					sums[bin][1] += g * w;
					sums[bin][2] += b * w;
				}

				// Only the strongest hue matters: the whole ramp is an analogous
				// sweep around it. A grayscale screenshot has no hue vote and
				// gets a neutral gray ramp (zero saturation survives the sweep).
				const best = weight.indexOf(Math.max(...weight));
				const dom =
					weight[best] > 0
						? hueSat(
								sums[best][0] / weight[best],
								sums[best][1] / weight[best],
								sums[best][2] / weight[best]
							)
						: { h: 0, s: 0 };
				meshPalette = sweepPalette(dom.h, dom.s);
			} catch {
				// Canvas tainted (no CORS on the image host) — fall back to the
				// seed-hued ramp.
				meshPalette = null;
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
			<LavaLampMesh
				palette={meshPalette ?? fallbackPalette}
				seed={meshSeed}
				blobScale={meshBlobScale}
				warp={meshWarp}
				softness={meshSoftness}
			/>
			<div class="absolute inset-0 bg-black/20"></div>
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
