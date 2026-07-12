<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { AIRTABLE_SYNC_FIELDS, type AirtableFieldMap } from '$lib/airtable-sync-fields';

	interface AirtableBase {
		id: string;
		name: string;
	}
	interface AirtableTable {
		id: string;
		name: string;
		fields: { id: string; name: string; type: string }[];
	}

	let {
		event
	}: {
		event: {
			id: string;
			airtableConnected: boolean;
			airtableBaseId: string | null;
			airtableTableId: string | null;
			airtableFieldMap: unknown;
		};
	} = $props();

	/** Sentinel Select value for "don't sync this field". */
	const NONE = 'none';

	let open = $state(false);
	let step = $state<'connect' | 'base' | 'table'>('connect');
	// Set by the OAuth popup's postMessage so the wizard advances immediately,
	// before invalidateAll() refreshes event.airtableConnected.
	let justConnected = $state(false);
	let bases = $state<AirtableBase[] | null>(null);
	let tables = $state<AirtableTable[] | null>(null);
	let selectedBaseId = $state('');
	let selectedTableId = $state('');
	/** App field key → Airtable field id ('' = not synced). */
	let mapping = $state<Record<string, string>>({});
	let loadingBases = $state(false);
	let loadingTables = $state(false);
	let errorMessage = $state<string | null>(null);

	const connected = $derived(event.airtableConnected || justConnected);
	const selectedBase = $derived(bases?.find((b) => b.id === selectedBaseId) ?? null);
	const selectedTable = $derived(tables?.find((t) => t.id === selectedTableId) ?? null);
	const mappedCount = $derived(Object.values(mapping).filter(Boolean).length);
	const fieldMapJson = $derived(
		selectedTable
			? JSON.stringify(
					Object.fromEntries(
						Object.entries(mapping)
							.filter(([, id]) => id)
							.map(([key, id]) => [
								key,
								{ id, name: selectedTable.fields.find((tf) => tf.id === id)?.name ?? '' }
							])
					)
				)
			: '{}'
	);

	export function start() {
		open = true;
		errorMessage = null;
		if (!connected) {
			step = 'connect';
			return;
		}
		step = 'base';
		if (!bases && !loadingBases) void loadBases();
	}

	function connect() {
		errorMessage = null;
		window.open(
			`/admin/events/${event.id}/airtable/connect`,
			'airtable-oauth',
			'width=600,height=760'
		);
	}

	onMount(() => {
		function onMessage(e: MessageEvent) {
			if (e.origin !== window.location.origin) return;
			const msg = e.data as { type?: string; ok?: boolean; message?: string | null };
			if (msg?.type !== 'airtable-oauth') return;
			if (msg.ok) {
				justConnected = true;
				errorMessage = null;
				step = 'base';
				void invalidateAll();
				void loadBases();
			} else {
				errorMessage = msg.message || 'Connecting to Airtable failed.';
			}
		}
		window.addEventListener('message', onMessage);
		return () => window.removeEventListener('message', onMessage);
	});

	async function loadBases() {
		loadingBases = true;
		errorMessage = null;
		try {
			const res = await fetch(`/admin/events/${event.id}/airtable/bases`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const payload: { connected: boolean; bases: AirtableBase[] } = await res.json();
			if (!payload.connected) {
				justConnected = false;
				step = 'connect';
				errorMessage = 'The Airtable connection expired — connect again.';
				void invalidateAll();
				return;
			}
			bases = payload.bases;
			if (event.airtableBaseId && payload.bases.some((b) => b.id === event.airtableBaseId)) {
				selectBase(event.airtableBaseId);
			} else if (payload.bases.length === 1) {
				// The grant covers a single base — skip the base step entirely.
				selectBase(payload.bases[0].id);
				step = 'table';
			}
		} catch {
			errorMessage = 'Loading your Airtable bases failed. Try again.';
		} finally {
			loadingBases = false;
		}
	}

	function selectBase(baseId: string) {
		selectedBaseId = baseId;
		selectedTableId = '';
		tables = null;
		mapping = {};
		void loadTables(baseId);
	}

	async function loadTables(baseId: string) {
		loadingTables = true;
		errorMessage = null;
		try {
			const res = await fetch(`/admin/events/${event.id}/airtable/tables?baseId=${baseId}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const payload: { connected: boolean; tables: AirtableTable[] } = await res.json();
			tables = payload.tables;
			if (event.airtableTableId && payload.tables.some((t) => t.id === event.airtableTableId)) {
				selectTable(event.airtableTableId);
			}
		} catch {
			errorMessage = 'Loading tables failed. Try again.';
		} finally {
			loadingTables = false;
		}
	}

	function selectTable(tableId: string) {
		selectedTableId = tableId;
		const table = tables?.find((t) => t.id === tableId);
		if (!table) return;

		// Editing the already-configured table starts from the stored mapping;
		// otherwise default to matching field names. Either way a field only
		// qualifies if its type can hold the value.
		const stored = (event.airtableFieldMap ?? null) as AirtableFieldMap | null;
		const useStored = !!stored && tableId === event.airtableTableId;
		mapping = Object.fromEntries(
			AIRTABLE_SYNC_FIELDS.map((f) => {
				const ok = (tf: { type: string }) => f.compatibleTypes.includes(tf.type);
				if (useStored) {
					const target = stored[f.key];
					const valid = target && table.fields.some((tf) => tf.id === target.id && ok(tf));
					return [f.key, valid ? target.id : ''];
				}
				const byName = table.fields.find((tf) => tf.name === f.defaultName && ok(tf));
				return [f.key, byName?.id ?? ''];
			})
		);
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			{#if step === 'connect'}
				<Dialog.Title>Connect Airtable</Dialog.Title>
				<Dialog.Description>
					Submitted projects mirror into Airtable — one record per team member. Syncing runs with
					the account you connect.
				</Dialog.Description>
			{:else if step === 'base'}
				<Dialog.Title>Choose a base</Dialog.Title>
				<Dialog.Description>The base this event syncs into.</Dialog.Description>
			{:else}
				<Dialog.Title>Choose a table and fields</Dialog.Title>
				<Dialog.Description>
					Pick the table in {selectedBase?.name ?? 'the base'} and map each synced value to one of its
					fields.
				</Dialog.Description>
			{/if}
		</Dialog.Header>

		{#if step === 'connect'}
			<div class="flex flex-col items-start gap-3">
				<p class="text-sm text-muted-foreground">
					A popup will ask you to authorize access. When Airtable asks which resources to share,
					grant only this event's base.
				</p>
				<Button onclick={connect}>Connect Airtable</Button>
			</div>
		{:else if step === 'base'}
			<div class="flex flex-col gap-1.5">
				{#if loadingBases}
					<p class="text-sm text-muted-foreground">Loading bases…</p>
				{:else if bases?.length === 0}
					<p class="text-sm text-muted-foreground">
						The connected account granted access to no bases. Reconnect and pick this event's base
						on the Airtable authorization screen.
					</p>
				{:else}
					<Label>Base</Label>
					<Select.Root type="single" value={selectedBaseId} onValueChange={(v) => selectBase(v)}>
						<Select.Trigger class="w-full">
							{selectedBase?.name ?? 'Choose a base'}
						</Select.Trigger>
						<Select.Content>
							{#each bases ?? [] as b (b.id)}
								<Select.Item value={b.id} label={b.name} />
							{/each}
						</Select.Content>
					</Select.Root>
				{/if}
			</div>
		{:else}
			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-1.5">
					<Label>Table</Label>
					{#if loadingTables}
						<p class="text-sm text-muted-foreground">Loading tables…</p>
					{:else}
						<Select.Root
							type="single"
							value={selectedTableId}
							onValueChange={(v) => selectTable(v)}
						>
							<Select.Trigger class="w-full">
								{selectedTable?.name ?? 'Choose a table'}
							</Select.Trigger>
							<Select.Content>
								{#each tables ?? [] as t (t.id)}
									<Select.Item value={t.id} label={t.name} />
								{/each}
							</Select.Content>
						</Select.Root>
					{/if}
				</div>

				{#if selectedTable}
					<div class="flex flex-col gap-1.5">
						<Label>Synced fields</Label>
						<div class="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-lg border p-3">
							{#each AIRTABLE_SYNC_FIELDS as f (f.key)}
								{@const options = selectedTable.fields.filter((tf) =>
									f.compatibleTypes.includes(tf.type)
								)}
								{@const target = options.find((tf) => tf.id === mapping[f.key])}
								<div class="grid grid-cols-2 items-center gap-2">
									<div>
										<p class="text-sm">{f.label}</p>
										{#if f.note}
											<p class="text-xs text-muted-foreground">{f.note}</p>
										{/if}
									</div>
									<Select.Root
										type="single"
										value={mapping[f.key] || NONE}
										onValueChange={(v) => (mapping[f.key] = v === NONE ? '' : v)}
									>
										<Select.Trigger class="w-full" size="sm">
											{#if target}
												<span class="truncate">
													{target.name}
													<span class="text-muted-foreground">· {target.type}</span>
												</span>
											{:else}
												Not synced
											{/if}
										</Select.Trigger>
										<Select.Content>
											<Select.Item value={NONE} label="Not synced" />
											{#each options as tf (tf.id)}
												<Select.Item value={tf.id} label={`${tf.name} · ${tf.type}`} />
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
							{/each}
						</div>
						{#if mappedCount === 0}
							<p class="text-xs text-amber-600">Map at least one field to save.</p>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		{#if errorMessage}
			<p class="text-sm text-destructive">{errorMessage}</p>
		{/if}

		<Dialog.Footer>
			{#if step === 'base'}
				<Button
					variant="ghost"
					class="sm:mr-auto"
					title="Reopen the Airtable authorization to grant more or different bases"
					onclick={connect}
				>
					Reauthorize
				</Button>
				<Button variant="outline" disabled={!selectedBaseId} onclick={() => (step = 'table')}>
					Next
				</Button>
			{:else if step === 'table'}
				{#if (bases?.length ?? 0) > 1}
					<Button variant="ghost" onclick={() => (step = 'base')}>Back</Button>
				{/if}
				<form
					method="POST"
					action="?/select"
					use:enhance={() =>
						async ({ result, update }) => {
							await update();
							if (result.type === 'success') open = false;
						}}
				>
					<input type="hidden" name="baseId" value={selectedBaseId} />
					<input type="hidden" name="tableId" value={selectedTableId} />
					<input type="hidden" name="baseName" value={selectedBase?.name ?? ''} />
					<input type="hidden" name="tableName" value={selectedTable?.name ?? ''} />
					<input type="hidden" name="fieldMap" value={fieldMapJson} />
					<Button type="submit" disabled={!selectedTableId || mappedCount === 0}>
						Save sync settings
					</Button>
				</form>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
