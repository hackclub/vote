<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { X } from '@lucide/svelte';

	let { data, form } = $props();

	// Someone alone on a draft team shows up in `addable`; don't offer to add a
	// team's own members back to it.
	function addableFor(memberIds: string[]) {
		return data.addable.filter((a) => !memberIds.includes(a.id));
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1.5">
		<h2 class="text-lg font-semibold">Teams ({data.teams.length})</h2>
		<p class="text-sm text-muted-foreground">
			Every team formed for this event, including solo and draft teams. Add or remove members on
			draft teams; submitted teams are locked.
		</p>
		{#if form?.message}
			<p class="text-sm text-destructive">{form.message}</p>
		{/if}
	</div>

	{#each data.teams as t (t.id)}
		{@const options = addableFor(t.members.map((m) => m.participantId))}
		<Card.Root>
			<Card.Header>
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="flex items-center gap-2">
						<Card.Title class="text-base">
							{t.project ? t.project.name : 'No project'}
						</Card.Title>
						{#if t.project}
							<Badge variant={t.project.submitted ? 'default' : 'outline'}>
								{t.project.submitted ? 'submitted' : 'draft'}
							</Badge>
						{:else}
							<Badge variant="secondary">no project</Badge>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<span class="text-sm text-muted-foreground">{t.size} {t.size === 1 ? 'member' : 'members'}</span>
						{#if t.project}
							<Button
								href="/admin/events/{page.params.id}/projects/{t.project.id}"
								variant="ghost"
								size="sm"
							>
								Edit project
							</Button>
						{/if}
					</div>
				</div>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3">
				<div class="flex flex-wrap gap-2">
					{#each t.members as m (m.participantId)}
						<span class="inline-flex items-center gap-1.5 rounded-full border py-1 pr-1.5 pl-3 text-sm">
							{m.name}
							{#if t.editable}
								<form method="POST" action="?/removeMember" use:enhance class="inline-flex">
									<input type="hidden" name="teamId" value={t.id} />
									<input type="hidden" name="participantId" value={m.participantId} />
									<button
										type="submit"
										aria-label="Remove {m.name}"
										class="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
									>
										<X size={14} />
									</button>
								</form>
							{/if}
						</span>
					{:else}
						<span class="text-sm text-muted-foreground">No members</span>
					{/each}
				</div>

				{#if t.editable}
					{#if t.atCapacity}
						<p class="text-xs text-muted-foreground">Team is at the max size.</p>
					{:else if options.length === 0}
						<p class="text-xs text-muted-foreground">No free participants to add.</p>
					{:else}
						<form
							method="POST"
							action="?/addMember"
							use:enhance
							class="flex flex-wrap items-center gap-2"
						>
							<input type="hidden" name="teamId" value={t.id} />
							<select
								name="participantId"
								required
								class="h-9 rounded-md border bg-background px-2 text-sm"
							>
								<option value="" disabled selected>Add member…</option>
								{#each options as o (o.id)}
									<option value={o.id}>{o.name}</option>
								{/each}
							</select>
							<Button type="submit" variant="outline" size="sm">Add</Button>
						</form>
					{/if}
				{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<p class="text-sm text-muted-foreground">No teams yet.</p>
	{/each}
</div>
