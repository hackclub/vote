<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';

	let { data, form } = $props();
</script>

<Card.Root>
	<Card.Header>
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="flex flex-col gap-1.5">
				<Card.Title>Projects ({data.projects.length})</Card.Title>
				<Card.Description>
					Submitted projects are mirrored to Airtable — one record per team member.
				</Card.Description>
			</div>
			<form method="POST" action="?/resyncAll" use:enhance>
				<Button type="submit" variant="outline">Resync all to Airtable</Button>
			</form>
		</div>
		{#if form?.resyncedAll != null}
			<p class="text-sm text-muted-foreground">
				Resynced {form.resyncedAll} submitted {form.resyncedAll === 1 ? 'project' : 'projects'}.
			</p>
		{/if}
	</Card.Header>
	<Card.Content>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-16"></Table.Head>
					<Table.Head>Project</Table.Head>
					<Table.Head>Team</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head>Airtable</Table.Head>
					<Table.Head class="text-right">Votes</Table.Head>
					<Table.Head class="w-24"></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.projects as p (p.id)}
					<Table.Row>
						<Table.Cell>
							{#if p.screenshotUrl}
								<a href={p.screenshotUrl} target="_blank" rel="noopener noreferrer">
									<img
										src={p.screenshotUrl}
										alt="Screenshot of {p.name}"
										class="h-10 w-14 rounded border object-cover"
										loading="lazy"
									/>
								</a>
							{:else}
								<div class="flex h-10 w-14 items-center justify-center rounded border bg-muted text-[10px] text-muted-foreground">
									none
								</div>
							{/if}
						</Table.Cell>
						<Table.Cell>
							<span class="font-medium">{p.name}</span>
							<div class="mt-0.5 flex flex-col text-xs text-muted-foreground">
								{#if p.demoUrl}<a href={p.demoUrl} target="_blank" rel="noopener noreferrer" class="hover:underline">{p.demoUrl}</a>{/if}
								{#if p.repoUrl}<a href={p.repoUrl} target="_blank" rel="noopener noreferrer" class="hover:underline">{p.repoUrl}</a>{/if}
							</div>
						</Table.Cell>
						<Table.Cell class="text-sm">{p.members.join(', ')}</Table.Cell>
						<Table.Cell>
							<Badge variant={p.submitted ? 'default' : 'outline'}>
								{p.submitted ? 'submitted' : 'draft'}
							</Badge>
						</Table.Cell>
						<Table.Cell>
							{#if p.sync.state === 'synced'}
								<Badge variant="secondary">synced · {p.sync.detail}</Badge>
							{:else if p.sync.state === 'pending'}
								<Badge variant="outline">pending · {p.sync.detail}</Badge>
							{:else if p.sync.state === 'error'}
								<Badge variant="destructive" title={p.sync.detail}>error</Badge>
							{:else}
								<span class="text-xs text-muted-foreground">—</span>
							{/if}
						</Table.Cell>
						<Table.Cell class="text-right font-medium">{p.votes}</Table.Cell>
						<Table.Cell>
							<div class="flex justify-end gap-2">
								<Button href="/admin/events/{page.params.id}/projects/{p.id}" variant="ghost" size="sm">
									Edit
								</Button>
								{#if p.submitted}
									<form method="POST" action="?/resync" use:enhance>
										<input type="hidden" name="projectId" value={p.id} />
										<Button type="submit" variant="outline" size="sm">Resync</Button>
									</form>
								{/if}
							</div>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={7} class="text-center text-muted-foreground">No projects yet</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</Card.Content>
</Card.Root>
