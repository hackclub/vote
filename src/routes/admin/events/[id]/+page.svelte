<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';

	let { data, form } = $props();

	// Logo/background can be pasted as a URL or uploaded straight to the CDN.
	// The text inputs stay bound to these so the settings action persists an
	// uploaded URL exactly like a pasted one.
	let logoUrl = $state(data.event.logoUrl ?? '');
	let backgroundUrl = $state(data.event.backgroundUrl ?? '');
	let uploading = $state({ logo: false, background: false });
	let uploadError = $state('');
	let logoInput: HTMLInputElement;
	let backgroundInput: HTMLInputElement;

	async function uploadAsset(kind: 'logo' | 'background', input: HTMLInputElement) {
		const file = input.files?.[0];
		if (!file) return;
		uploading = { ...uploading, [kind]: true };
		uploadError = '';
		try {
			const body = new FormData();
			body.append('file', file);
			const res = await fetch(`/admin/events/${page.params.id}/assets`, { method: 'POST', body });
			const payload = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(payload.message ?? 'Upload failed');
			if (kind === 'logo') logoUrl = payload.url;
			else backgroundUrl = payload.url;
		} catch (e) {
			uploadError = e instanceof Error ? e.message : 'Upload failed';
		} finally {
			uploading = { ...uploading, [kind]: false };
			input.value = '';
		}
	}

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
		<Card.Content>
			<p class="text-3xl font-semibold">{data.shipRate.percent}%</p>
			<p class="text-sm text-muted-foreground">
				Ship rate — {data.shipRate.shipped} of {data.shipRate.total} participants on a team that submitted
				a project
			</p>
		</Card.Content>
	</Card.Root>

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
						<Input id="slug" name="slug" placeholder="summer-hackathon" value={data.event.slug} />
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
						<Label for="logoUrl">Logo</Label>
						<div class="flex items-center gap-2">
							{#if logoUrl}
								<img
									src={logoUrl}
									alt="Logo preview"
									class="size-10 shrink-0 rounded border bg-white/60 object-contain p-0.5"
								/>
							{/if}
							<Input
								id="logoUrl"
								name="logoUrl"
								type="url"
								placeholder="https://cdn.example.com/logo.webp"
								bind:value={logoUrl}
								class="flex-1"
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={uploading.logo}
								onclick={() => logoInput.click()}
							>
								{uploading.logo ? 'Uploading…' : 'Upload'}
							</Button>
							<input
								bind:this={logoInput}
								type="file"
								accept="image/*"
								class="hidden"
								onchange={(e) => uploadAsset('logo', e.currentTarget)}
							/>
						</div>
						<p class="text-xs text-muted-foreground">
							Upload an image or paste a CDN link. Shown to participants; leave blank for the
							default.
						</p>
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="backgroundUrl">Background</Label>
						<div class="flex items-center gap-2">
							{#if backgroundUrl}
								<img
									src={backgroundUrl}
									alt="Background preview"
									class="size-10 shrink-0 rounded border object-cover"
								/>
							{/if}
							<Input
								id="backgroundUrl"
								name="backgroundUrl"
								type="url"
								placeholder="https://cdn.example.com/card-art.webp"
								bind:value={backgroundUrl}
								class="flex-1"
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={uploading.background}
								onclick={() => backgroundInput.click()}
							>
								{uploading.background ? 'Uploading…' : 'Upload'}
							</Button>
							<input
								bind:this={backgroundInput}
								type="file"
								accept="image/*"
								class="hidden"
								onchange={(e) => uploadAsset('background', e.currentTarget)}
							/>
						</div>
						<p class="text-xs text-muted-foreground">
							Upload an image or paste a CDN link for the art behind the flow cards. Leave blank for
							the default.
						</p>
					</div>
				</div>
				{#if uploadError}
					<p class="text-sm text-destructive">{uploadError}</p>
				{/if}
				<div class="flex flex-col gap-1.5">
					<Label for="tagline">Tagline</Label>
					<Input
						id="tagline"
						name="tagline"
						placeholder="A hackathon in Europe's techno capital"
						value={data.event.tagline ?? ''}
					/>
					<p class="text-xs text-muted-foreground">
						Short caption shown under the event name. Leave blank to omit.
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
				<div class="flex items-start gap-2.5 rounded-lg border p-3">
					<!-- Hidden "off" keeps the field present when unticked so the action
					     can tell "unchecked" from "not submitted at all". -->
					<input type="hidden" name="submissionsLocked" value="off" />
					<input
						id="submissionsLocked"
						name="submissionsLocked"
						type="checkbox"
						checked={data.event.submissionsLocked}
						class="mt-0.5 size-4 shrink-0 rounded border-input accent-foreground"
					/>
					<div class="flex flex-col gap-1">
						<Label for="submissionsLocked">Lock submissions</Label>
						<p class="text-xs text-muted-foreground">
							Freeze submissions without moving to Voting: teams can no longer create or edit
							projects, but work that's already submitted stays visible. Only affects the Submission
							stage.
						</p>
					</div>
				</div>
				<details class="rounded-lg border px-3 py-2">
					<summary class="cursor-pointer text-sm font-medium select-none">Advanced</summary>
					<div class="mt-3 flex flex-col gap-3">
						<div class="flex items-start gap-2.5">
							<!-- Keeps the field present when unticked, so the action can tell
							     "unchecked" apart from "not submitted at all". -->
							<input type="hidden" name="cardLogoMonochrome" value="off" />
							<input
								id="cardLogoMonochrome"
								name="cardLogoMonochrome"
								type="checkbox"
								checked={data.event.cardLogoMonochrome}
								class="mt-0.5 size-4 shrink-0 rounded border-input accent-foreground"
							/>
							<div class="flex flex-col gap-1">
								<Label for="cardLogoMonochrome">Flatten logo to white on project cards</Label>
								<p class="text-xs text-muted-foreground">
									Project cards render the event logo as a solid white silhouette so it stays
									legible over the shader backdrop. Uncheck to keep the logo's own colours.
								</p>
							</div>
						</div>
					</div>
				</details>
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
