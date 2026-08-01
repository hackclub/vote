<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';

	let { children, dim = false }: { children: Snippet; dim?: boolean } = $props();
</script>

<!-- Grid (not block+height) so the card can grow past 609px when content
     needs it — e.g. the screenshot pond expands once a file is added — while
     the stretched grid item keeps a definite height for h-full children. -->
<div class="relative grid min-h-[609px] w-[461px] max-w-full overflow-hidden rounded-2xl">
	<div class="absolute inset-0" aria-hidden="true">
		<!-- Cover the card itself rather than a fixed 1242×699 box: at the card's
		     461px width that box only ever showed the middle third of the art,
		     which reads as a heavy crop on whatever an event uploads. The slight
		     overscan keeps the blur from feathering the card's edges. -->
		<img
			src={page.data.backgroundUrl ?? '/brand/card-art.webp'}
			alt=""
			class="absolute inset-0 h-full w-full scale-110 object-cover blur-[3px]"
		/>
		<div class="absolute inset-0 {dim ? 'bg-black/70' : 'bg-black/50'}"></div>
	</div>
	<div class="relative z-10">
		{@render children()}
	</div>
</div>
