<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';

	let { data, form } = $props();
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center gap-3">
		<a href="/admin/events/{page.params.id}/projects" class="text-sm text-muted-foreground hover:underline">
			← Projects
		</a>
		<Badge variant={data.project.submitted ? 'default' : 'outline'}>
			{data.project.submitted ? 'submitted' : 'draft'}
		</Badge>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Edit project</Card.Title>
			<Card.Description>
				Changes to a submitted project are re-synced to Airtable automatically.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/save" use:enhance class="flex flex-col gap-4">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="flex flex-col gap-1.5">
						<Label for="name">Name</Label>
						<Input id="name" name="name" value={data.project.name} maxlength={50} />
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="screenshotUrl">Screenshot URL</Label>
						<Input id="screenshotUrl" name="screenshotUrl" value={data.project.screenshotUrl ?? ''} />
						{#if data.project.screenshotUrl}
							<a href={data.project.screenshotUrl} target="_blank" rel="noopener noreferrer" class="mt-1">
								<img
									src={data.project.screenshotUrl}
									alt="Screenshot of {data.project.name}"
									class="max-h-48 w-full rounded-md border object-contain"
								/>
							</a>
						{/if}
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="demoUrl">Demo URL</Label>
						<Input id="demoUrl" name="demoUrl" value={data.project.demoUrl ?? ''} />
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="repoUrl">Repository URL</Label>
						<Input id="repoUrl" name="repoUrl" value={data.project.repoUrl ?? ''} />
					</div>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="description">Description</Label>
					<Textarea id="description" name="description" rows={4} maxlength={500} value={data.project.description} />
				</div>

				<h3 class="mt-2 text-sm font-semibold">Team members</h3>
				<div class="flex flex-col gap-4">
					{#each data.members as m (m.id)}
						<div class="grid grid-cols-1 items-end gap-3 rounded-lg border p-3 sm:grid-cols-3">
							<div>
								<p class="text-sm font-medium">{m.name}</p>
								<p class="text-xs text-muted-foreground">{m.email}</p>
								{#if m.airtableRecordId}
									<p class="mt-1 font-mono text-xs text-muted-foreground">{m.airtableRecordId}</p>
								{/if}
							</div>
							<div class="flex flex-col gap-1.5">
								<Label for="hours-{m.id}">Hours</Label>
								<Input id="hours-{m.id}" name="hours:{m.id}" type="number" min="0" step="0.5" value={m.hoursEstimate ?? ''} />
							</div>
							<div class="flex flex-col gap-1.5">
								<Label for="hackatime-{m.id}">Hackatime projects</Label>
								<Input id="hackatime-{m.id}" name="hackatime:{m.id}" value={m.hackatimeProjects} />
							</div>
						</div>
					{/each}
				</div>

				<div class="flex items-center gap-3">
					<Button type="submit">Save</Button>
					{#if form?.saved}<span class="text-sm text-muted-foreground">Saved.</span>{/if}
					{#if form?.message}<span class="text-sm text-destructive">{form.message}</span>{/if}
				</div>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root class="border-destructive/50">
		<Card.Header>
			<Card.Title class="text-destructive">Danger zone</Card.Title>
		</Card.Header>
		<Card.Content>
			<form
				method="POST"
				action="?/delete"
				use:enhance
				onsubmit={(e) => {
					if (!confirm('Delete this project, its team, and its votes? This cannot be undone.')) {
						e.preventDefault();
					}
				}}
			>
				<Button type="submit" variant="destructive">Delete project & team</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
