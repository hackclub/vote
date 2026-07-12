<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { Badge } from '$lib/components/ui/badge';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';

	let { data, children } = $props();

	const activeEventId = $derived(page.params.id);

	let theme = $state<'light' | 'dark'>('light');

	onMount(() => {
		const stored = localStorage.getItem('admin-theme');
		theme =
			stored === 'dark' || stored === 'light'
				? stored
				: window.matchMedia('(prefers-color-scheme: dark)').matches
					? 'dark'
					: 'light';
	});

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		localStorage.setItem('admin-theme', theme);
	}

	function eventSubLinks(id: string) {
		return [
			{ href: `/admin/events/${id}`, label: 'Overview', exact: true },
			{ href: `/admin/events/${id}/participants`, label: 'Participants' },
			{ href: `/admin/events/${id}/projects`, label: 'Projects' },
			{ href: `/admin/events/${id}/results`, label: 'Results' },
			{ href: `/admin/events/${id}/admins`, label: 'Admins' }
		];
	}

	function isActive(href: string, exact = false): boolean {
		return exact ? page.url.pathname === href : page.url.pathname.startsWith(href);
	}
</script>

<svelte:head>
	<title>Admin · Votes</title>
</svelte:head>

<div class:dark={theme === 'dark'} class="flex min-h-screen bg-background font-sans text-foreground">
	<aside class="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r bg-sidebar">
		<div class="flex items-center justify-between border-b px-5 py-4">
			<a href="/admin" class="text-sm font-semibold tracking-tight">Votes Admin</a>
			{#if data.superadmin}
				<Badge variant="secondary" class="text-[10px]">Superadmin</Badge>
			{/if}
		</div>

		<nav class="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
			<a
				href="/admin"
				class="rounded-md px-3 py-2 text-sm font-medium transition-colors {page.url.pathname ===
				'/admin'
					? 'bg-sidebar-accent text-sidebar-accent-foreground'
					: 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'}"
			>
				All events
			</a>

			<p class="mt-3 px-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
				Events
			</p>
			{#each data.events as event (event.id)}
				<a
					href="/admin/events/{event.id}"
					class="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors {activeEventId ===
					event.id
						? 'bg-sidebar-accent text-sidebar-accent-foreground'
						: 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'}"
				>
					<span class="truncate">{event.name}</span>
					<span class="ml-2 shrink-0 text-[10px] text-muted-foreground uppercase">{event.stage}</span>
				</a>
				{#if activeEventId === event.id}
					<div class="mb-1 ml-3 flex flex-col gap-0.5 border-l pl-3">
						{#each eventSubLinks(event.id) as link (link.href)}
							<a
								href={link.href}
								class="rounded-md px-3 py-1.5 text-sm transition-colors {isActive(link.href, link.exact)
									? 'font-medium text-foreground'
									: 'text-muted-foreground hover:text-foreground'}"
							>
								{link.label}
							</a>
						{/each}
					</div>
				{/if}
			{:else}
				<p class="px-3 py-2 text-sm text-muted-foreground">No events yet</p>
			{/each}
		</nav>

		<div class="border-t p-4">
			<div class="flex items-center justify-between gap-2">
				<p class="truncate text-xs text-muted-foreground">{data.adminEmail}</p>
				<button
					type="button"
					onclick={toggleTheme}
					title="Toggle theme"
					aria-label="Toggle theme"
					class="flex shrink-0 cursor-pointer items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
				>
					{#if theme === 'dark'}
						<Sun class="size-4" />
					{:else}
						<Moon class="size-4" />
					{/if}
				</button>
			</div>
			<form method="POST" action="/auth/logout" class="mt-1">
				<button type="submit" class="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
					Sign out
				</button>
			</form>
		</div>
	</aside>
	<main class="min-w-0 flex-1 px-8 py-8">
		{@render children()}
	</main>
</div>
