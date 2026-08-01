<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';

	let { data, form } = $props();

	const stageVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
		DRAFT: 'outline',
		SUBMISSION: 'default',
		VOTING: 'default',
		CLOSED: 'secondary'
	};
</script>

<div class="flex flex-col gap-8">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Events</h1>
		<p class="text-sm text-muted-foreground">
			{data.superadmin
				? 'Manage every hackathon voting event.'
				: 'Events you have admin access to.'}
		</p>
	</div>

	<Card.Root>
		<Card.Content>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head>Stage</Table.Head>
						<Table.Head class="text-right">Participants</Table.Head>
						<Table.Head class="text-right">Projects</Table.Head>
						<Table.Head class="text-right">Votes</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.events as event (event.id)}
						<Table.Row>
							<Table.Cell>
								<a href="/admin/events/{event.id}" class="font-medium hover:underline">
									{event.name}
								</a>
								<span class="ml-2 text-xs text-muted-foreground">{event.slug}</span>
							</Table.Cell>
							<Table.Cell>
								<Badge variant={stageVariant[event.stage]}>{event.stage}</Badge>
							</Table.Cell>
							<Table.Cell class="text-right">{event.participants}</Table.Cell>
							<Table.Cell class="text-right">{event.projects}</Table.Cell>
							<Table.Cell class="text-right">{event.votes}</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={5} class="text-center text-muted-foreground">
								No events yet
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>

	{#if data.superadmin}
		<Card.Root>
			<Card.Header>
				<Card.Title>Create event</Card.Title>
				<Card.Description>Set up a new event. You can configure everything else after.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="POST" action="?/create" use:enhance class="flex flex-wrap items-end gap-4">
				<div class="flex flex-col gap-1.5">
					<Label for="name">Name</Label>
					<Input id="name" name="name" placeholder="Summer Hackathon" class="w-56" required />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="slug">Slug (optional)</Label>
					<Input id="slug" name="slug" placeholder="summer-hackathon" class="w-44" />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="voteLimit">Votes per person</Label>
					<Input id="voteLimit" name="voteLimit" type="number" value="3" min="1" class="w-32" />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="maxTeamSize">Max team size</Label>
					<Input id="maxTeamSize" name="maxTeamSize" type="number" value="3" min="1" class="w-32" />
				</div>
				<Button type="submit">Create</Button>
				</form>
				{#if form?.message}
					<p class="mt-3 text-sm text-destructive">{form.message}</p>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
