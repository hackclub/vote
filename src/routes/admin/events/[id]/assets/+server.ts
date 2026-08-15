import { error, json } from '@sveltejs/kit';
import { uploadToCdn } from '$lib/server/cdn';
import { requireEventAdmin } from '$lib/server/admin';
import type { RequestHandler } from './$types';

// Event branding (logo / background) is small imagery — no need for the 5 GB
// screenshot ceiling.
const MAX_SIZE = 25 * 1024 * 1024;

// Uploads an event branding image to the CDN and returns its URL, for the logo
// and background fields on the settings page. Admin-guarded — the participant
// screenshot endpoint can't be reused because it runs the project-context guard.
export const POST: RequestHandler = async ({ params, locals, request }) => {
	await requireEventAdmin(locals.user, params.id);

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) error(400, 'No file provided');
	if (!file.type.startsWith('image/')) error(400, 'Asset must be an image');
	if (file.size > MAX_SIZE) error(400, 'Image must be under 25 MB');

	try {
		const url = await uploadToCdn(file);
		return json({ url });
	} catch (e) {
		console.error('[event-assets] upload failed:', e);
		error(502, 'Upload failed — please try again');
	}
};
