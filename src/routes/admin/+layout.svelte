<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';

	let { data, children } = $props();

	const activeEventId = $derived(page.params.id);

	let theme = $state<'light' | 'dark'>('light');
	let mobileNavOpen = $state(false);

	onMount(() => {
		const stored = localStorage.getItem('admin-theme');
		theme =
			stored === 'dark' || stored === 'light'
				? stored
				: window.matchMedia('(prefers-color-scheme: dark)').matches
					? 'dark'
					: 'light';
	});

	afterNavigate(() => {
		mobileNavOpen = false;
	});

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		localStorage.setItem('admin-theme', theme);
	}

	// Dialogs and dropdowns portal to <body>, outside this layout's wrapper div,
	// so the theme class must live on <html> for portaled UI to inherit it.
	$effect(() => {
		document.documentElement.classList.toggle('dark', theme === 'dark');
		return () => document.documentElement.classList.remove('dark');
	});

	function eventSubLinks(id: string) {
		return [
			{ href: `/admin/events/${id}`, label: 'Overview', exact: true },
			{ href: `/admin/events/${id}/participants`, label: 'Participants' },
			{ href: `/admin/events/${id}/projects`, label: 'Projects' },
			{ href: `/admin/events/${id}/airtable`, label: 'Airtable Sync' },
			{ href: `/admin/events/${id}/results`, label: 'Results' },
			{ href: `/admin/events/${id}/admins`, label: 'Admins' }
		];
	}

	function isActive(href: string, exact = false): boolean {
		return exact ? page.url.pathname === href : page.url.pathname.startsWith(href);
	}
</script>

<svelte:head>
	<title>Admin · Vote</title>
</svelte:head>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') mobileNavOpen = false;
	}}
/>

{#snippet sidebarNav()}
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
		{#if data.superadmin}
			<a
				href="/admin/api-docs"
				class="rounded-md px-3 py-2 text-sm font-medium transition-colors {page.url.pathname ===
				'/admin/api-docs'
					? 'bg-sidebar-accent text-sidebar-accent-foreground'
					: 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'}"
			>
				API
			</a>
		{/if}

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
				<span class="ml-2 shrink-0 text-[10px] text-muted-foreground uppercase"
					>{event.stage}</span
				>
			</a>
			{#if activeEventId === event.id}
				<div class="mb-1 ml-3 flex flex-col gap-0.5 border-l pl-3">
					{#each eventSubLinks(event.id) as link (link.href)}
						<a
							href={link.href}
							class="rounded-md px-3 py-1.5 text-sm transition-colors {isActive(
								link.href,
								link.exact
							)
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
			<div class="flex min-w-0 items-center gap-2">
				<p class="truncate text-xs text-muted-foreground">{data.adminEmail}</p>
				<Badge variant="secondary" class="shrink-0 text-[10px]">
					{data.superadmin ? 'Superadmin' : 'Admin'}
				</Badge>
			</div>
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
			<button
				type="submit"
				class="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
			>
				Sign out
			</button>
		</form>
	</div>
{/snippet}

<div class="min-h-screen bg-background font-sans text-foreground md:flex">
	<header
		class="sticky top-0 z-40 flex items-center justify-between border-b bg-sidebar px-4 py-3 md:hidden"
	>
		<a href="/admin">
			<img
				src={theme === 'dark' ? '/brand/logo-dm.svg' : '/brand/logo-lm.svg'}
				alt="Vote"
				class="h-8"
			/>
		</a>
		<button
			type="button"
			onclick={() => (mobileNavOpen = true)}
			aria-label="Open menu"
			class="flex cursor-pointer items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
		>
			<Menu class="size-5" />
		</button>
	</header>

	<aside class="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
		<div class="flex items-center border-b px-5 py-4">
			<a href="/admin">
				<img
					src={theme === 'dark' ? '/brand/logo-dm.svg' : '/brand/logo-lm.svg'}
					alt="Vote"
					class="h-10"
				/>
			</a>
		</div>
		{@render sidebarNav()}
	</aside>

	{#if mobileNavOpen}
		<div class="fixed inset-0 z-50 md:hidden">
			<button
				type="button"
				onclick={() => (mobileNavOpen = false)}
				aria-label="Close menu"
				class="absolute inset-0 bg-black/50"
			></button>
			<aside
				class="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r bg-sidebar shadow-lg"
			>
				<div class="flex items-center justify-between border-b px-4 py-3">
					<a href="/admin">
						<img
							src={theme === 'dark' ? '/brand/logo-dm.svg' : '/brand/logo-lm.svg'}
							alt="Vote"
							class="h-8"
						/>
					</a>
					<button
						type="button"
						onclick={() => (mobileNavOpen = false)}
						aria-label="Close menu"
						class="flex cursor-pointer items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
					>
						<X class="size-5" />
					</button>
				</div>
				{@render sidebarNav()}
			</aside>
		</div>
	{/if}

	<main class="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
		{@render children()}
	</main>
</div>
