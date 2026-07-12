import { env } from '$env/dynamic/private';
import { prisma } from './db';
import type { User } from '../../generated/prisma/client';

const AUTH_BASE = 'https://auth.hackclub.com';
export const OAUTH_SCOPES = 'openid profile email slack_id';

/** Must match the redirect URI registered in the Hack Club Auth dashboard. */
export const redirectUri = () => `${env.APP_ORIGIN.trim().replace(/\/+$/, '')}/oauth/callback`;

export function authorizeUrl(state: string): string {
	const params = new URLSearchParams({
		client_id: env.HACKCLUB_CLIENT_ID,
		redirect_uri: redirectUri(),
		response_type: 'code',
		scope: OAUTH_SCOPES,
		state
	});
	return `${AUTH_BASE}/oauth/authorize?${params}`;
}

interface TokenResponse {
	access_token: string;
	refresh_token?: string;
	expires_in?: number;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
	const res = await fetch(`${AUTH_BASE}/oauth/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: env.HACKCLUB_CLIENT_ID,
			client_secret: env.HACKCLUB_CLIENT_SECRET,
			redirect_uri: redirectUri(),
			code,
			grant_type: 'authorization_code'
		})
	});
	if (!res.ok) {
		throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
	}
	return res.json();
}

interface HackClubIdentity {
	id: string;
	email: string;
	name: string | null;
	slackId: string | null;
}

/** Normalizes /api/v1/me, which nests fields differently depending on scopes. */
export async function fetchIdentity(accessToken: string): Promise<HackClubIdentity> {
	const res = await fetch(`${AUTH_BASE}/api/v1/me`, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) {
		throw new Error(`Fetching identity failed (${res.status}): ${await res.text()}`);
	}
	const data = await res.json();
	// Real shape: { identity: { id, primary_email, slack_id, ... }, scopes: [...] }.
	// Fall back to a flatter shape in case the API changes.
	const src = data.identity ?? data.user ?? data;
	const id = src.id ?? src.sub;
	const email = src.email ?? src.primary_email ?? src.email_address;
	if (!id || !email) {
		throw new Error(`Unexpected /api/v1/me response shape: ${JSON.stringify(data).slice(0, 500)}`);
	}
	const name =
		src.name ??
		src.full_name ??
		([src.first_name, src.last_name].filter(Boolean).join(' ') || null);
	return {
		id: String(id),
		email: String(email).toLowerCase().trim(),
		name: name || null,
		slackId: src.slack_id ?? src.slackId ?? null
	};
}

/**
 * Upserts the user and links any whitelisted Participant rows that match their
 * email. Participants are NOT created here — a user must already be on the
 * event whitelist (populated by the admin "Sync from Attend" roster import).
 * Signing in only claims a pre-existing row; unknown users get no access.
 */
export async function signIn(identity: HackClubIdentity, tokens: TokenResponse): Promise<User> {
	const fields = {
		email: identity.email,
		name: identity.name,
		slackId: identity.slackId,
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token,
		tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
	};

	// Reconcile by hackclubId first, then by email. Email is unique and is the
	// link to participant allowlists, so a prior login (or a dev-login) may
	// already own this email under a different hackclubId — adopt that row
	// rather than colliding on the unique email constraint.
	const existing =
		(await prisma.user.findUnique({ where: { hackclubId: identity.id } })) ??
		(await prisma.user.findUnique({ where: { email: identity.email } }));

	const user = existing
		? await prisma.user.update({
				where: { id: existing.id },
				data: { hackclubId: identity.id, ...fields }
			})
		: await prisma.user.create({
				data: { hackclubId: identity.id, ...fields }
			});

	await prisma.participant.updateMany({
		where: { email: user.email, userId: null },
		data: { userId: user.id }
	});
	if (user.slackId) {
		await prisma.participant.updateMany({
			where: { email: user.email, slackId: null },
			data: { slackId: user.slackId }
		});
	}

	return user;
}
