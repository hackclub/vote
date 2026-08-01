import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
	const event = await prisma.event.upsert({
		where: { slug: 'horizons-crux' },
		update: {},
		create: {
			name: 'Horizons Crux',
			slug: 'horizons-crux',
			stage: 'SUBMISSION',
			voteLimit: 3,
			maxTeamSize: 3,
			// Branding lives on the event, not in the app — every event brings its own.
			logoUrl: '/brand/crux-logo.webp',
			airtableBaseId: 'app2wgVgZnozM92TT',
			airtableTableId: 'tblc2ZbkLmfNRXmJf',
			checklistItems: parseYaml(readFileSync(new URL('../checklist.yaml', import.meta.url), 'utf8'))
		}
	});

	// Replace these with your own admin/test emails (or upload a participant CSV
	// from the admin UI). ADMIN_EMAILS in .env controls who gets admin access.
	const testParticipants = [
		{ email: 'persona@example.com', firstName: 'Person', lastName: 'A' },
		{ email: 'personb@example.com', firstName: 'Person', lastName: 'B' },
		{ email: 'personc@example.com', firstName: 'Person', lastName: 'C' }
	];

	for (const p of testParticipants) {
		await prisma.participant.upsert({
			where: { eventId_email: { eventId: event.id, email: p.email } },
			update: {},
			create: { eventId: event.id, ...p }
		});
	}

	console.log(
		`Seeded event "${event.name}" (${event.id}) with ${testParticipants.length} participants.`
	);
}

main()
	.then(() => prisma.$disconnect())
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
