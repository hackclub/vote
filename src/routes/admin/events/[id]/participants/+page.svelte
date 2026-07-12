<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';

	let { data, form } = $props();
</script>

<div class="flex flex-col gap-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Sync participants from Attend</Card.Title>
			<Card.Description>
				Pulls the roster for <code>{data.event.slug}</code> from Attend (the event slug must match
				the Attend event slug). Only confirmed registrations who have checked in on-site are
				imported; existing emails are updated in place. Participants also get added automatically
				when they sign in.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/sync" use:enhance>
				<Button type="submit">Sync from Attend</Button>
			</form>
			{#if form?.synced}
				<p class="mt-3 text-sm">
					Added <strong>{form.synced.added}</strong>,
					<strong>{form.synced.alreadyPresent}</strong> already present, skipped
					<strong>{form.synced.skipped}</strong> not confirmed / not checked in ({form.synced.total}
					on the Attend roster).
				</p>
			{/if}
			{#if form?.message}
				<p class="mt-3 text-sm text-destructive">{form.message}</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Participants ({data.participants.length})</Card.Title>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<form method="POST" action="?/add" use:enhance class="flex flex-wrap items-end gap-3">
				<div class="flex flex-col gap-1.5">
					<Label for="email">Email</Label>
					<Input id="email" name="email" type="email" placeholder="orpheus@hackclub.com" class="w-64" required />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="firstName">First name</Label>
					<Input id="firstName" name="firstName" class="w-36" />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="lastName">Last name</Label>
					<Input id="lastName" name="lastName" class="w-36" />
				</div>
				<Button type="submit" variant="outline">Add participant</Button>
			</form>

			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Email</Table.Head>
						<Table.Head>Name</Table.Head>
						<Table.Head>Slack ID</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="w-20"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.participants as p (p.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{p.email}</Table.Cell>
							<Table.Cell>{p.name || '—'}</Table.Cell>
							<Table.Cell>
								{#if p.slackId}
									<code class="text-xs">{p.slackId}</code>
								{:else}
									<span class="text-xs text-muted-foreground">—</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<div class="flex gap-1.5">
									{#if p.attendCompleted}
										<Badge>Completed</Badge>
									{:else}
										<Badge variant="outline">In Progress</Badge>
									{/if}
									{#if p.signedUp}<Badge variant="secondary">signed up</Badge>{/if}
									{#if p.onTeam}<Badge variant="secondary">on a team</Badge>{/if}
									{#if p.votesCast > 0}<Badge variant="secondary">voted ({p.votesCast})</Badge>{/if}
								</div>
							</Table.Cell>
							<Table.Cell>
								<form
									method="POST"
									action="?/remove"
									use:enhance
									onsubmit={(e) => {
										if (p.onTeam && !confirm(`${p.email} is on a team — removing them also removes their team membership. Continue?`)) {
											e.preventDefault();
										}
									}}
								>
									<input type="hidden" name="id" value={p.id} />
									<Button type="submit" variant="ghost" size="sm" class="text-destructive">
										Remove
									</Button>
								</form>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={5} class="text-center text-muted-foreground">
								No participants yet — sync from Attend to get started
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
