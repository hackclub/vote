<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';

	let { children, dim = false }: { children: Snippet; dim?: boolean } = $props();
</script>

<div class="relative h-[609px] w-[461px] max-w-full overflow-hidden rounded-2xl">
	<div class="absolute inset-0" aria-hidden="true">
		<img
			src={page.data.backgroundUrl ?? '/brand/card-art.webp'}
			alt=""
			class="absolute top-1/2 left-1/2 h-[699px] w-[1242px] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover blur-[3px]"
		/>
		<div class="absolute inset-0 {dim ? 'bg-black/70' : 'bg-black/50'}"></div>
	</div>
	<div class="relative z-10 h-full">
		{@render children()}
	</div>
</div>
