import 'dotenv/config';
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
			airtableBaseId: 'app2wgVgZnozM92TT',
			airtableTableId: 'tblc2ZbkLmfNRXmJf',
			checklistItems: [
				'My project has a working, playable demo',
				'My code is in a public GitHub repository',
				'Everyone on my team is signed up and added to the team',
				'My screenshot shows the project in action'
			]
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

	console.log(`Seeded event "${event.name}" (${event.id}) with ${testParticipants.length} participants.`);
}

main()
	.then(() => prisma.$disconnect())
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
