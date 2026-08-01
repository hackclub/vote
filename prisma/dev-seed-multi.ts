// Dev-only helper: seeds two events at different stages so the multi-event
// paths (stage-priority routing, per-event branding, submit flow, voting) are
// all reachable from one login. Run: bunx tsx prisma/dev-seed-multi.ts
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const YOU = 'anson@hackclub.com';
const checklistItems: string[] = parseYaml(
	readFileSync(new URL('../checklist.yaml', import.meta.url), 'utf8')
);

async function upsertEvent(data: {
	slug: string;
	name: string;
	stage: 'DRAFT' | 'SUBMISSION' | 'VOTING' | 'CLOSED';
	logoUrl?: string;
	tagline: string;
}) {
	const { slug, ...rest } = data;
	return prisma.event.upsert({
		where: { slug },
		update: rest,
		create: { slug, ...rest, voteLimit: 3, maxTeamSize: 3, checklistItems }
	});
}

async function addParticipant(eventId: string, email: string, firstName: string, lastName: string) {
	return prisma.participant.upsert({
		where: { eventId_email: { eventId, email } },
		update: {},
		create: { eventId, email, firstName, lastName, attendCompleted: true }
	});
}

/** A one-person team with a fully submitted project, for voting/gallery views. */
async function addSubmittedProject(
	eventId: string,
	participantId: string,
	project: { name: string; description: string; demoUrl: string; repoUrl: string }
) {
	const existing = await prisma.teamMember.findUnique({ where: { participantId } });
	if (existing) return;
	await prisma.team.create({
		data: {
			eventId,
			createdByParticipantId: participantId,
			members: { create: { participantId, hoursEstimate: 12, hackatimeProjects: ['demo'] } },
			project: {
				create: {
					eventId,
					...project,
					screenshotUrl: '/brand/card-art.webp',
					currentStep: 5,
					checklistCompletedAt: new Date(),
					submittedAt: new Date()
				}
			}
		}
	});
}

async function main() {
	// Older event, still taking submissions, with its own logo.
	const crux = await upsertEvent({
		slug: 'horizons-crux',
		name: 'Horizons Crux',
		stage: 'SUBMISSION',
		logoUrl: '/brand/crux-logo.webp',
		tagline: 'Build something at the edge of the map'
	});

	// Newer event, mid-voting, deliberately WITHOUT a logo so the name-as-text
	// fallback gets exercised. Voting outranks submission, so this is the event
	// `/` routes into and the one the login screen features.
	const arcana = await upsertEvent({
		slug: 'horizons-arcana',
		name: 'Horizons Arcana',
		stage: 'VOTING',
		tagline: 'Sixty hours, one deck of ideas'
	});

	const roster = [
		{ email: YOU, firstName: 'Anson', lastName: 'Chung' },
		{ email: 'persona@example.com', firstName: 'Person', lastName: 'A' },
		{ email: 'personb@example.com', firstName: 'Person', lastName: 'B' },
		{ email: 'personc@example.com', firstName: 'Person', lastName: 'C' },
		{ email: 'persond@example.com', firstName: 'Person', lastName: 'D' }
	];

	for (const event of [crux, arcana]) {
		for (const p of roster) {
			await addParticipant(event.id, p.email, p.firstName, p.lastName);
		}
	}

	// Crux: a draft that's reached the last step, so every step of the submit
	// flow (and its back controls) is reachable — guardStepOrder only blocks
	// jumping ahead of currentStep.
	const youOnCrux = await prisma.participant.findUniqueOrThrow({
		where: { eventId_email: { eventId: crux.id, email: YOU } }
	});
	if (!(await prisma.teamMember.findUnique({ where: { participantId: youOnCrux.id } }))) {
		await prisma.team.create({
			data: {
				eventId: crux.id,
				createdByParticipantId: youOnCrux.id,
				members: { create: { participantId: youOnCrux.id } },
				project: {
					create: {
						eventId: crux.id,
						name: 'Draft Project',
						description: 'A half-finished submission, parked on the last step.',
						screenshotUrl: '/brand/card-art.webp',
						demoUrl: 'https://draft.example.com',
						repoUrl: 'https://github.com/you/draft',
						currentStep: 4,
						checklistCompletedAt: new Date()
					}
				}
			}
		});
	}

	// Arcana: you're submitted, so voting is open to you against three others.
	const arcanaProjects = [
		{
			email: YOU,
			name: 'Podium',
			description: 'A holographic trading-card gallery for hackathon projects.',
			demoUrl: 'https://podium.example.com',
			repoUrl: 'https://github.com/you/podium'
		},
		{
			email: 'persona@example.com',
			name: 'Waveform',
			description: 'A synthesizer in the browser that turns your typing rhythm into music.',
			demoUrl: 'https://waveform.example.com',
			repoUrl: 'https://github.com/persona/waveform'
		},
		{
			email: 'personb@example.com',
			name: 'Trailhead',
			description: 'Offline-first hiking maps with hand-drawn trail art and stamp collecting.',
			demoUrl: 'https://trailhead.example.com',
			repoUrl: 'https://github.com/personb/trailhead'
		},
		{
			email: 'personc@example.com',
			name: 'Lanternfish',
			description:
				'A tiny database that swims: append-only storage with a very silly query language.',
			demoUrl: 'https://lanternfish.example.com',
			repoUrl: 'https://github.com/personc/lanternfish'
		}
	];

	for (const p of arcanaProjects) {
		const participant = await prisma.participant.findUniqueOrThrow({
			where: { eventId_email: { eventId: arcana.id, email: p.email } }
		});
		const { email, ...project } = p;
		await addSubmittedProject(arcana.id, participant.id, project);
	}

	console.log(`Seeded "${crux.name}" (SUBMISSION) and "${arcana.name}" (VOTING).`);
	console.log(`Sign in at /auth/dev-login?email=${YOU}`);
}

main()
	.then(() => prisma.$disconnect())
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
