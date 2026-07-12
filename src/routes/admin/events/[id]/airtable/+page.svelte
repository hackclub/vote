<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import { AIRTABLE_SYNC_FIELDS, type AirtableFieldMap } from '$lib/airtable-sync-fields';
	import AirtableSetupWizard from './AirtableSetupWizard.svelte';

	let { data, form } = $props();

	let wizard: AirtableSetupWizard | undefined = $state();

	const configured = $derived(!!data.event.airtableBaseId && !!data.event.airtableTableId);
	const fieldMap = $derived((data.event.airtableFieldMap ?? null) as AirtableFieldMap | null);
	// Events configured before field mapping existed sync the default names.
	const mappedFields = $derived(
		AIRTABLE_SYNC_FIELDS.flatMap((f) => {
			const target = fieldMap ? (fieldMap[f.key]?.name ?? null) : f.defaultName;
			return target ? [{ label: f.label, target }] : [];
		})
	);
</script>

<div class="flex flex-col gap-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Airtable connection</Card.Title>
			<Card.Description>
				Submitted projects mirror into Airtable — one record per team member. An event admin
				connects their own Airtable account; syncing runs with that account's access.
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-3">
			<div class="text-sm">
				{#if data.event.airtableConnected}
					<p>
						Connected{data.event.airtableConnectedBy
							? ` by ${data.event.airtableConnectedBy}`
							: ''}.
					</p>
				{:else}
					<p class="text-muted-foreground">Not connected — projects aren't syncing.</p>
				{/if}
			</div>
			{#if data.event.airtableConnected}
				<div class="flex items-center gap-2">
					<form
						method="POST"
						action="?/disconnect"
						use:enhance={({ cancel }) => {
							if (!confirm('Disconnect Airtable? Syncing stops until an admin reconnects.')) {
								cancel();
							}
						}}
					>
						<Button type="submit" variant="outline">Disconnect</Button>
					</form>
					{#if form?.disconnected}
						<span class="text-sm text-muted-foreground">Disconnected.</span>
					{/if}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Sync target</Card.Title>
			<Card.Description>The base, table, and field mapping this event syncs to.</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			{#if configured}
				<p class="text-sm">
					{data.event.airtableBaseName ?? data.event.airtableBaseId}
					<span class="text-muted-foreground">›</span>
					{data.event.airtableTableName ?? data.event.airtableTableId}
				</p>
				<div class="flex max-w-md flex-col gap-1 rounded-lg border p-3">
					{#each mappedFields as f (f.label)}
						<div class="flex items-center gap-2 text-sm">
							<span class="w-40 shrink-0 text-muted-foreground">{f.label}</span>
							<ArrowRightIcon class="size-3.5 shrink-0 text-muted-foreground" />
							<span class="truncate">{f.target}</span>
						</div>
					{/each}
				</div>
				{#if !fieldMap}
					<p class="text-xs text-muted-foreground">
						Using the default field names — edit the sync to map fields explicitly.
					</p>
				{/if}
			{:else}
				<p class="text-sm text-muted-foreground">Not set up yet.</p>
			{/if}
			<div class="flex items-center gap-3">
				<Button onclick={() => wizard?.start()}>
					{configured ? 'Edit sync' : 'Set up sync'}
				</Button>
				{#if form?.saved}
					<span class="text-sm text-muted-foreground">Saved.</span>
				{/if}
				{#if form?.message}
					<span class="text-sm text-destructive">{form.message}</span>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>
</div>

<AirtableSetupWizard bind:this={wizard} event={data.event} />
