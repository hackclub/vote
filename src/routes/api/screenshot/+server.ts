import { error, json } from '@sveltejs/kit';
import { uploadToCdn } from '$lib/server/cdn';
import { requireProjectCtx } from '$lib/server/submit-guard';
import type { RequestHandler } from './$types';

// Matches Airtable's per-attachment ceiling for URL-based attachments (5 GB).
const MAX_SIZE = 5 * 1024 * 1024 * 1024;

// Hosts uploadToCdn can return URLs on. Keep in sync with $lib/server/cdn.
const CDN_HOSTS = ['cdn.hackclub.com', 'hc-cdn.hel1.your-objectstorage.com'];

// Proxies a stored screenshot back to the browser so FilePond can restore it —
// the CDN doesn't serve CORS headers, so the client can't fetch it directly.
export const GET: RequestHandler = async ({ locals, url }) => {
	await requireProjectCtx(locals, url.searchParams.get('event') ?? '');

	const src = url.searchParams.get('src') ?? '';
	let parsed: URL;
	try {
		parsed = new URL(src);
	} catch {
		error(400, 'Invalid screenshot URL');
	}
	if (parsed.protocol !== 'https:' || !CDN_HOSTS.includes(parsed.hostname)) {
		error(400, 'Screenshot URL not allowed');
	}

	const res = await fetch(parsed).catch(() => null);
	if (!res?.ok || !res.body) error(502, 'Could not load screenshot');

	return new Response(res.body, {
		headers: {
			'Content-Type': res.headers.get('Content-Type') ?? 'image/png',
			'Content-Disposition': 'inline',
			'Cache-Control': 'private, max-age=3600'
		}
	});
};

export const POST: RequestHandler = async ({ locals, request, url }) => {
	await requireProjectCtx(locals, url.searchParams.get('event') ?? '');

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) error(400, 'No file provided');
	if (!file.type.startsWith('image/')) error(400, 'Screenshot must be an image');
	if (file.size > MAX_SIZE) error(400, 'Screenshot must be under 5 GB');

	try {
		const url = await uploadToCdn(file);
		return json({ url });
	} catch (e) {
		console.error('[screenshot] upload failed:', e);
		error(502, 'Upload failed — please try again');
	}
};
