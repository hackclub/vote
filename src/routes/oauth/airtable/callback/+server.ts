import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server/db';
import { canAccessEvent } from '$lib/server/admin';
import { exchangeCode, listBases, tokenData } from '$lib/server/airtable-oauth';
import type { RequestHandler } from './$types';

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * The flow runs in a popup opened by the Airtable sync dialog — report the
 * result to the opener via postMessage and close, instead of redirecting.
 */
function popupResponse(ok: boolean, message?: string): Response {
	const origin = env.APP_ORIGIN.trim().replace(/\/+$/, '');
	const payload = JSON.stringify({ type: 'airtable-oauth', ok, message: message ?? null });
	const html = `<!doctype html>
<meta charset="utf-8">
<title>Airtable ${ok ? 'connected' : 'connection failed'}</title>
<p style="font-family: system-ui; padding: 2rem">
	${ok ? 'Airtable connected — you can close this window.' : `Connection failed: ${escapeHtml(message ?? 'unknown error')}`}
</p>
<script>
	if (window.opener) {
		window.opener.postMessage(${payload}, ${JSON.stringify(origin)});
		window.close();
	}
</script>`;
	return new Response(html, {
		status: ok ? 200 : 400,
		headers: { 'Content-Type': 'text/html; charset=utf-8' }
	});
}

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	const raw = cookies.get('airtable_oauth');
	cookies.delete('airtable_oauth', { path: '/' });

	let saved: { state: string; verifier: string; eventId: string } | null = null;
	try {
		saved = raw ? JSON.parse(raw) : null;
	} catch {
		saved = null;
	}

	const oauthError = url.searchParams.get('error');
	if (oauthError) {
		return popupResponse(false, url.searchParams.get('error_description') ?? oauthError);
	}

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	if (
		!saved?.state ||
		!saved.verifier ||
		!saved.eventId ||
		!code ||
		!state ||
		state !== saved.state
	) {
		return popupResponse(false, 'Invalid OAuth state — please try connecting again.');
	}
	if (!(await canAccessEvent(locals.user, saved.eventId))) {
		return popupResponse(false, 'You are not an admin of this event.');
	}

	try {
		const tokens = await exchangeCode(code, saved.verifier);

		// A grant with no bases can't sync anything — reject it with a hint
		// instead of storing a useless connection.
		const granted = await listBases(tokens.access_token);
		if (granted.length === 0) {
			return popupResponse(
				false,
				"No bases were granted — pick your event's base on the Airtable authorization screen."
			);
		}

		await prisma.event.update({
			where: { id: saved.eventId },
			data: { ...tokenData(tokens), airtableConnectedBy: locals.user!.email }
		});
	} catch (e) {
		console.error('[airtable] oauth code exchange failed:', e);
		return popupResponse(false, 'Connecting to Airtable failed — please try again.');
	}
	return popupResponse(true);
};
