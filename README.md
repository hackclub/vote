# Vote

Hackathon voting platform for **Hack Club Horizons Crux**. Participants sign in
with Hack Club Auth, form teams, submit projects (mirrored into Airtable — one
record per team member), and vote on each other's projects with holographic
trading-card UI faithful to the [Figma design](https://www.figma.com/design/RW0SS1Fy72M9tLil5nk400/Podium-UI2).

Built with SvelteKit (Svelte 5) · Prisma Postgres · Tailwind v4 · shadcn-svelte (admin).

## How it works

1. An **admin** uploads a CSV of participants (the allowlist) and drives the
   event through stages: `Draft → Submission → Voting → Closed`.
2. **Participants** sign in with Hack Club (must match an allowlisted email),
   add up to `maxTeamSize` teammates, complete the pre-submission checklist,
   fill in project details/links/hour estimates, and submit. Submission creates
   one Airtable record **per team member** with their individual hours and
   Hackatime projects.
3. During **Voting**, participants who submitted a project get `voteLimit`
   votes to spend on other teams' projects (self-votes are blocked, limits are
   enforced transactionally).
4. **Closed** freezes everything; results live in the admin.

## Setup

```sh
bun install
cp .env.example .env    # then fill it in — see comments in the file
```

Manual steps you need to do once:

- **Prisma Postgres**: provision a database at console.prisma.io (or run
  `bunx prisma dev` for a local one) and set `DATABASE_URL`.
- **Hack Club Auth**: register an app at auth.hackclub.com/developer/apps with
  redirect URI `{APP_ORIGIN}/oauth/callback`, set client id/secret.
- **Airtable**: create a PAT with `data.records:read/write` on the event base.
- **Hack Club CDN**: create an API key at cdn.hackclub.com (screenshot hosting).
- Set `ADMIN_EMAILS` to your email, then sign in to get the `/admin` area.

Then:

```sh
bunx prisma migrate deploy   # apply schema
bunx prisma db seed          # seeds the Horizons Crux event + test participants
bun run dev
```

### Dev conveniences

- `/auth/dev-login?email=someone@example.com` — dev-only sign-in bypass
  (disabled in production builds).
- Without `HACKCLUB_CDN_TOKEN`, screenshot uploads fall back to
  `static/uploads/` in dev (Airtable attachments need the real CDN).
- `bunx tsx prisma/dev-seed-voting.ts` — creates two extra submitted projects
  and opens the Voting stage, handy for testing the voting flow.

## Structure

- `src/routes/(participant)` — the themed participant flow (login → team →
  checklist → details → links → hours → project → vote), 1:1 with the Figma.
- `src/routes/admin` — shadcn-svelte admin: events, stage control, participant
  CSV upload, project editing + Airtable resync, results.
- `src/lib/server` — Prisma client, sessions, Hack Club OAuth, Airtable sync,
  Hack Club CDN uploads, flow/state-machine guards.
- `src/lib/components/participant` — FlowCard, ProjectCard (3D tilt +
  WebGL "Card Foil" and "Lava Lamp Mesh" ports of the Figma shaders).
