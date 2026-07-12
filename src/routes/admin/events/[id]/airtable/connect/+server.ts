import { error, redirect } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import { requireEventAdmin } from '$lib/server/admin';
import { authorizeUrl, oauthConfigured, pkcePair } from '$lib/server/airtable-oauth';
import type { RequestHandler } from './$types';

/** Opened in a popup by the Airtable sync dialog; sends the admin to Airtable. */
export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	await requireEventAdmin(locals.user, params.id);
	if (!oauthConfigured()) {
		error(503, 'Airtable OAuth is not configured — set AIRTABLE_CLIENT_ID.');
	}

	const state = randomBytes(16).toString('base64url');
	const { verifier, challenge } = pkcePair();
	// The callback needs the CSRF state, the PKCE verifier, and which event the
	// tokens belong to; the state cookie carries all three.
	cookies.set('airtable_oauth', JSON.stringify({ state, verifier, eventId: params.id }), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 600
	});
	redirect(302, authorizeUrl(state, challenge));
};
