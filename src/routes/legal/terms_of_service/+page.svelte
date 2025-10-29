<script lang="ts">
	import { onMount } from "svelte";
	import { Button, FlexWrapper, IconButton, Space, formatDateWithUTCOffset } from "@davidnet/svelte-ui";
	import { marked } from "marked";
	import document from "$lib/legal/terms_of_service.md?raw";

    const githubpath = "src/lib/legal/terms_of_service.md";
	let html = $state("Loading...");
	let lastUpdated: Date | null = $state(null);

	const loadMarkdown = async () => {
		html = await marked.parse(document);
	};

	// Download logic
	const downloadMarkdown = () => {
		const blob = new Blob([document], { type: "text/markdown" });
		const url = URL.createObjectURL(blob);
		const a = globalThis.document.createElement("a");
		a.href = url;
		a.download = "document.md";
		a.click();
		URL.revokeObjectURL(url);
	};

	// Hash logic
	let hash = $state("Loading");
	let hashExpanded = $state(false);

	const hashSHA256 = async () => {
		const encoder = new TextEncoder();
		const data = encoder.encode(document);
		const hashBuffer = await crypto.subtle.digest("SHA-256", data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
	};

	const displayHash = () => hashExpanded ? hash : hash.slice(0, 32);

	let showraw = $state(false);

	const fetchLastUpdated = async () => {
		try {
			const res = await fetch(
				`https://api.github.com/repos/davidnet-net/apex/commits?path=${githubpath}&per_page=1`
			);
			const data = await res.json();
			lastUpdated = new Date(data[0].commit.committer.date);
		} catch (err) {
			console.error("Failed to fetch last updated from GitHub:", err);
			lastUpdated = new Date();
		}
	};

	// Run everything on mount
	onMount(async () => {
		await loadMarkdown();
		await hashSHA256();
		await fetchLastUpdated();
	});
</script>

<FlexWrapper height="100%" width="100%">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<FlexWrapper height="50%" width="100%" justifycontent="flex-start" gap="var(--token-space-1);">
		<h1 style="font-size: 3rem">Terms of Service</h1>
		<span style="color: var(--token-color-text-default-tertiary);">
			Last updated: {lastUpdated ? formatDateWithUTCOffset(lastUpdated) : "Loading..."}
		</span>

		<Space height="var(--token-space-0)" />
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore event_directive_deprecated -->
		<span 
			style="color: var(--token-color-text-default-tertiary); cursor: pointer;" 
			on:click={() => hashExpanded = !hashExpanded}
			title="Click to toggle full hash"
		>
			Hash: {displayHash()}{!hashExpanded ? "..." : ""}
		</span>

		<Space height="var(--token-space-4)" />

		{#if showraw}
			<pre style="overflow-x: auto;"><code>{document}</code></pre>
		{:else}
			{@html html}
		{/if}

		<Space height="var(--token-space-2)" />

		<FlexWrapper direction="row">
			<Button iconbefore="arrow_back" onClick={() => history.back()}>Back</Button>
			<IconButton onClick={() => showraw = !showraw} icon={showraw ? "raw_off" : "raw_on"} alt="View raw version" />
			<IconButton onClick={() => downloadMarkdown()} icon="download" alt="Download" />
		</FlexWrapper>
	</FlexWrapper>
</FlexWrapper>
