<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';

	let { data, form } = $props();

	const stages = [
		{ value: 'DRAFT', label: 'Draft', description: 'Hidden from participants' },
		{ value: 'SUBMISSION', label: 'Submission', description: 'Teams form and submit projects' },
		{
			value: 'VOTING',
			label: 'Voting',
			description: 'Participants vote on projects. Submissions lock — no new or edited projects.'
		},
		{ value: 'CLOSED', label: 'Closed', description: 'Voting has ended' }
	];
</script>

<div class="flex flex-col gap-6">
	<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
		{#each [['Participants', data.event.counts.participants], ['Teams', data.event.counts.teams], ['Projects', data.event.counts.projects], ['Votes', data.event.counts.votes]] as [label, count] (label)}
			<Card.Root>
				<Card.Content>
					<p class="text-3xl font-semibold">{count}</p>
					<p class="text-sm text-muted-foreground">{label}</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Event stage</Card.Title>
			<Card.Description>
				Participants see the platform according to the current stage.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
				{#each stages as s (s.value)}
					<form method="POST" action="?/stage" use:enhance class="h-full">
						<input type="hidden" name="stage" value={s.value} />
						<button
							type="submit"
							class="h-full w-full cursor-pointer rounded-lg border p-3 text-left transition-colors {data
								.event.stage === s.value
								? 'border-foreground bg-accent'
								: 'hover:bg-accent/50'}"
						>
							<p class="text-sm font-semibold">{s.label}</p>
							<p class="text-xs text-muted-foreground">{s.description}</p>
						</button>
					</form>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Settings</Card.Title>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/settings" use:enhance class="flex flex-col gap-4">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="flex flex-col gap-1.5">
						<Label for="name">Event name</Label>
						<Input id="name" name="name" value={data.event.name} />
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="slug">Event slug</Label>
						<Input id="slug" name="slug" placeholder="horizons-crux" value={data.event.slug} />
						<p class="text-xs text-muted-foreground">
							Must match the Attend event slug — participation checks and roster sync use it.
						</p>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="flex flex-col gap-1.5">
							<Label for="voteLimit">Votes per person</Label>
							<Input
								id="voteLimit"
								name="voteLimit"
								type="number"
								min="1"
								value={data.event.voteLimit}
							/>
						</div>
						<div class="flex flex-col gap-1.5">
							<Label for="maxTeamSize">Max team size</Label>
							<Input
								id="maxTeamSize"
								name="maxTeamSize"
								type="number"
								min="1"
								value={data.event.maxTeamSize}
							/>
						</div>
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="logoUrl">Logo URL</Label>
						<Input
							id="logoUrl"
							name="logoUrl"
							type="url"
							placeholder="https://cdn.example.com/logo.webp"
							value={data.event.logoUrl ?? ''}
						/>
						<p class="text-xs text-muted-foreground">
							CDN link to the event logo shown to participants. Leave blank for the default.
						</p>
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="backgroundUrl">Background URL</Label>
						<Input
							id="backgroundUrl"
							name="backgroundUrl"
							type="url"
							placeholder="https://cdn.example.com/card-art.webp"
							value={data.event.backgroundUrl ?? ''}
						/>
						<p class="text-xs text-muted-foreground">
							CDN link to the art shown behind the flow cards. Leave blank for the default.
						</p>
					</div>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="tagline">Tagline</Label>
					<Input
						id="tagline"
						name="tagline"
						placeholder="A hackathon in Europe's techno capital"
						value={data.event.tagline ?? ''}
					/>
					<p class="text-xs text-muted-foreground">
						Short caption shown under the event name on the picker card. Leave blank to omit.
					</p>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="checklistItems">Pre-submission checklist (one item per line)</Label>
					<Textarea
						id="checklistItems"
						name="checklistItems"
						rows={4}
						value={data.event.checklistItems.join('\n')}
					/>
				</div>
				<div class="flex items-center gap-3">
					<Button type="submit">Save settings</Button>
					{#if form?.saved}
						<span class="text-sm text-muted-foreground">Saved.</span>
					{/if}
					{#if form?.message}
						<span class="text-sm text-destructive">{form.message}</span>
					{/if}
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
