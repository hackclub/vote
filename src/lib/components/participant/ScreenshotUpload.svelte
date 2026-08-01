<script lang="ts">
	import { onMount } from 'svelte';
	import type { FilePond } from 'filepond';
	import 'filepond/dist/filepond.min.css';
	import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.min.css';

	let {
		value = $bindable(''),
		uploading = $bindable(false),
		endpoint
	}: {
		value?: string;
		uploading?: boolean;
		endpoint: string;
	} = $props();

	let input: HTMLInputElement;

	onMount(() => {
		let pond: FilePond | undefined;
		let destroyed = false;

		(async () => {
			const [filepond, preview, validateType, exif] = await Promise.all([
				import('filepond'),
				import('filepond-plugin-image-preview'),
				import('filepond-plugin-file-validate-type'),
				import('filepond-plugin-image-exif-orientation')
			]);
			if (destroyed) return;

			// exif before preview so mobile photos render upright.
			filepond.registerPlugin(exif.default, preview.default, validateType.default);

			pond = filepond.create(input, {
				name: 'file',
				allowMultiple: false,
				acceptedFileTypes: ['image/*'],
				credits: false,
				labelIdle: 'Drag and drop a screenshot',
				labelFileTypeNotAllowed: 'Screenshot must be an image',
				labelTapToUndo: 'tap to remove',
				// Default layout with a fixed preview height — the docs' standard
				// image-preview setup. The exotic 'integrated' layout breaks preview
				// rendering when combined with restored files and fixed heights.
				imagePreviewHeight: 118,
				// Restore an existing screenshot the documented way: a 'local' file
				// whose data server.load fetches back, so image-preview renders it
				// exactly like a fresh drop.
				files: value ? [{ source: value, options: { type: 'local' } }] : [],
				server: {
					process: (fieldName, file, metadata, load, error, progress, abort) => {
						const xhr = new XMLHttpRequest();
						const body = new FormData();
						body.append('file', file);

						uploading = true;
						xhr.open('POST', endpoint);
						xhr.responseType = 'json';
						xhr.upload.onprogress = (e) => progress(e.lengthComputable, e.loaded, e.total);
						xhr.onload = () => {
							uploading = false;
							if (xhr.status >= 200 && xhr.status < 300) {
								value = xhr.response?.url ?? '';
								load(value);
							} else {
								error(xhr.response?.message ?? 'Upload failed');
							}
						};
						xhr.onerror = () => {
							uploading = false;
							error('Upload failed');
						};
						xhr.onabort = () => (uploading = false);
						xhr.send(body);

						return {
							abort: () => {
								xhr.abort();
								abort();
							}
						};
					},
					load: (source, load, error, progress, abort) => {
						// The CDN doesn't serve CORS headers, so cross-origin screenshots
						// are fetched through our own endpoint instead of directly.
						const direct = source.startsWith('/') || source.startsWith(location.origin);
						const url = direct
							? source
							: `${endpoint}${endpoint.includes('?') ? '&' : '?'}src=${encodeURIComponent(source)}`;
						const controller = new AbortController();
						fetch(url, { signal: controller.signal })
							.then((res) => (res.ok ? res.blob() : Promise.reject(new Error(`${res.status}`))))
							.then(load)
							.catch(() => error('Could not load screenshot'));
						return { abort: () => controller.abort() };
					},
					revert: (uniqueFileId, load) => {
						value = '';
						load();
					},
					remove: (source, load) => {
						value = '';
						load();
					}
				}
			});
		})();

		return () => {
			destroyed = true;
			pond?.destroy();
		};
	});
</script>

<div class="screenshot-pond">
	<input bind:this={input} type="file" accept="image/*" />
</div>

<style>
	/* Border lives on the root, not the panel: the preview covers the panel
	   exactly, and the old field kept its dashed outline after upload. */
	.screenshot-pond :global(.filepond--root) {
		margin: 0;
		font-family: inherit;
		cursor: pointer;
		border: 1px dashed #fff;
		border-radius: 0.75rem;
	}

	/* Empty state matches the old 120px drop strip; once a file is in the
	   pond the label reverts to its natural size so it hides cleanly. */
	.screenshot-pond :global(.filepond--root:not(:has(.filepond--item)) .filepond--drop-label) {
		min-height: 118px;
	}

	.screenshot-pond :global(.filepond--panel-root) {
		background: transparent;
		border: none;
	}

	.screenshot-pond :global(.filepond--drop-label) {
		color: #ccc;
	}

	.screenshot-pond :global(.filepond--drop-label label) {
		font-size: 1rem;
	}

	/* FilePond's per-state greens and reds are far too loud for this card. */
	.screenshot-pond :global(.filepond--item-panel),
	.screenshot-pond :global([data-filepond-item-state='processing-complete'] .filepond--item-panel) {
		background: rgba(255, 255, 255, 0.08);
		border-radius: 0.75rem;
	}

	.screenshot-pond :global([data-filepond-item-state*='invalid'] .filepond--item-panel),
	.screenshot-pond :global([data-filepond-item-state*='error'] .filepond--item-panel) {
		background: rgba(248, 113, 113, 0.3);
	}

	/* The preview fills the panel edge to edge, so it has to carry the same
	   rounding or the field turns into a hard-cornered box once a file lands. */
	.screenshot-pond :global(.filepond--image-preview-wrapper),
	.screenshot-pond :global(.filepond--image-preview),
	.screenshot-pond :global(.filepond--image-preview-overlay) {
		border-radius: calc(0.75rem - 1px);
		overflow: hidden;
	}

	/* The preview plugin's green success wash fights the card; the failure
	   tint stays, just muted. */
	.screenshot-pond :global(.filepond--image-preview-overlay-success) {
		display: none;
	}

	.screenshot-pond :global(.filepond--image-preview-overlay-failure) {
		color: rgb(185, 75, 75);
	}

	/* Name + size are noise here — the preview and status say enough. */
	.screenshot-pond :global(.filepond--file-info) {
		display: none;
	}

	/* Drag-over wash — the drip itself stays hidden until FilePond fades it in. */
	.screenshot-pond :global(.filepond--drip-blob) {
		background: #fff;
	}
</style>
