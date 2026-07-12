import { createHash, randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { prisma } from './db';

const OAUTH_BASE = 'https://airtable.com/oauth2/v1';
const META_BASE = 'https://api.airtable.com/v0/meta';

/** Record read/write for syncing; schema read for the base/table pickers. */
export const OAUTH_SCOPES = 'data.records:read data.records:write schema.bases:read';

export const oauthConfigured = () => !!env.AIRTABLE_CLIENT_ID;

/** Callers check oauthConfigured() first; empty string only feeds error paths. */
const clientId = () => env.AIRTABLE_CLIENT_ID ?? '';

/** Must match the redirect URI registered on the Airtable OAuth integration. */
export const redirectUri = () =>
	`${env.APP_ORIGIN.trim().replace(/\/+$/, '')}/oauth/airtable/callback`;

/** Airtable requires PKCE (S256) on the authorization-code flow. */
export function pkcePair(): { verifier: string; challenge: string } {
	const verifier = randomBytes(48).toString('base64url');
	const challenge = createHash('sha256').update(verifier).digest('base64url');
	return { verifier, challenge };
}

export function authorizeUrl(state: string, codeChallenge: string): string {
	const params = new URLSearchParams({
		client_id: clientId(),
		redirect_uri: redirectUri(),
		response_type: 'code',
		scope: OAUTH_SCOPES,
		state,
		code_challenge: codeChallenge,
		code_challenge_method: 'S256'
	});
	// Airtable expects %20 (not +) between scopes in the query string.
	return `${OAUTH_BASE}/authorize?${params.toString().replace(/\+/g, '%20')}`;
}

interface TokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
}

class OAuthError extends Error {
	constructor(
		message: string,
		readonly code: string | null
	) {
		super(message);
	}
}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
	const body = new URLSearchParams(params);
	const headers: Record<string, string> = {
		'Content-Type': 'application/x-www-form-urlencoded'
	};
	// Confidential clients authenticate with HTTP basic auth; public clients
	// (no secret) pass client_id in the body instead.
	if (env.AIRTABLE_CLIENT_SECRET) {
		const credentials = `${clientId()}:${env.AIRTABLE_CLIENT_SECRET}`;
		headers.Authorization = `Basic ${Buffer.from(credentials).toString('base64')}`;
	} else {
		body.set('client_id', clientId());
	}
	const res = await fetch(`${OAUTH_BASE}/token`, { method: 'POST', headers, body });
	const text = await res.text();
	if (!res.ok) {
		let code: string | null = null;
		try {
			code = JSON.parse(text).error ?? null;
		} catch {
			// Non-JSON error body — no machine-readable code.
		}
		throw new OAuthError(
			`Airtable token request failed (${res.status}): ${text.slice(0, 300)}`,
			code
		);
	}
	return JSON.parse(text);
}

export const exchangeCode = (code: string, codeVerifier: string) =>
	tokenRequest({
		grant_type: 'authorization_code',
		code,
		redirect_uri: redirectUri(),
		code_verifier: codeVerifier
	});

const refreshTokens = (refreshToken: string) =>
	tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken });

/** Maps a token response onto the Event columns that store the connection. */
export function tokenData(tokens: TokenResponse) {
	return {
		airtableAccessToken: tokens.access_token,
		airtableRefreshToken: tokens.refresh_token,
		airtableTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000)
	};
}

interface EventTokens {
	id: string;
	airtableAccessToken: string | null;
	airtableRefreshToken: string | null;
	airtableTokenExpiresAt: Date | null;
}

// Airtable rotates the refresh token on every refresh, so two concurrent
// refreshes would invalidate each other — dedupe in-flight refreshes per event.
const inflightRefresh = new Map<string, Promise<string | null>>();

/**
 * Returns a valid access token for the event's Airtable connection, refreshing
 * (and persisting the rotated refresh token) when near expiry. Returns null
 * when the event isn't connected or the grant was revoked.
 */
export async function getEventAccessToken(event: EventTokens): Promise<string | null> {
	if (!event.airtableRefreshToken) return null;
	if (
		event.airtableAccessToken &&
		event.airtableTokenExpiresAt &&
		event.airtableTokenExpiresAt.getTime() > Date.now() + 60_000
	) {
		return event.airtableAccessToken;
	}

	const pending = inflightRefresh.get(event.id);
	if (pending) return pending;

	const refresh = (async () => {
		try {
			const tokens = await refreshTokens(event.airtableRefreshToken!);
			await prisma.event.update({ where: { id: event.id }, data: tokenData(tokens) });
			return tokens.access_token;
		} catch (e) {
			// A revoked or expired grant is permanent — drop the connection so
			// the admin sees "not connected" instead of endlessly failing syncs.
			if (e instanceof OAuthError && (e.code === 'invalid_grant' || e.code === 'invalid_client')) {
				await prisma.event.update({
					where: { id: event.id },
					data: {
						airtableAccessToken: null,
						airtableRefreshToken: null,
						airtableTokenExpiresAt: null
					}
				});
			}
			console.error('[airtable] token refresh failed:', e);
			return null;
		} finally {
			inflightRefresh.delete(event.id);
		}
	})();
	inflightRefresh.set(event.id, refresh);
	return refresh;
}

export interface AirtableBase {
	id: string;
	name: string;
}

export interface AirtableTable {
	id: string;
	name: string;
	fields: { id: string; name: string; type: string }[];
}

async function metaRequest(token: string, path: string): Promise<Record<string, unknown>> {
	const res = await fetch(`${META_BASE}${path}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) {
		throw new Error(
			`Airtable meta request failed (${res.status}): ${(await res.text()).slice(0, 300)}`
		);
	}
	return res.json();
}

/** Bases the connected account granted this integration access to. */
export async function listBases(token: string): Promise<AirtableBase[]> {
	const bases: AirtableBase[] = [];
	let offset: string | undefined;
	do {
		const page = (await metaRequest(
			token,
			`/bases${offset ? `?offset=${encodeURIComponent(offset)}` : ''}`
		)) as { bases?: AirtableBase[]; offset?: string };
		bases.push(...(page.bases ?? []).map((b) => ({ id: b.id, name: b.name })));
		offset = page.offset;
	} while (offset);
	return bases;
}

export async function listTables(token: string, baseId: string): Promise<AirtableTable[]> {
	const page = (await metaRequest(token, `/bases/${baseId}/tables`)) as {
		tables?: AirtableTable[];
	};
	return (page.tables ?? []).map((t) => ({
		id: t.id,
		name: t.name,
		fields: (t.fields ?? []).map((f) => ({ id: f.id, name: f.name, type: f.type }))
	}));
}
