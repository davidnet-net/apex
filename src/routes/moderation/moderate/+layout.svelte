<script lang="ts">
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import {
		authState,
		Button,
		Flex,
		getFetch,
		LinkButton,
		navigateBack,
		whenAuthReady
	} from "@davidnet-net/svelte-ui";

	let { children } = $props();

	// Every page under /moderation/moderate drives /support/moderation/* endpoints the backend
	// itself gates on internalAccess + supportAccess - this used to be copy-pasted into 5+ separate
	// pages, now it's checked once here. Matches the original per-page behavior: render immediately,
	// only redirect away if the check comes back denied - never hide the UI while the check is in
	// flight, since that would turn any slow/failed check into a blank section.
	$effect(() => {
		(async () => {
			await whenAuthReady();
			if (!authState.isLoggedIn && !authState.loading) return;

			const accessResult = await getFetch(
				`${PUBLIC_BACKEND_URL}/auth/internal`,
				undefined,
				undefined,
				true
			);

			if (
				!accessResult.success ||
				!accessResult.access?.internalAccess ||
				!accessResult.access?.supportAccess
			) {
				window.location.href = "https://account.davidnet.net/internal/access_denied";
			}
		})();
	});

	const tabs = [
		{ href: "/moderation/moderate", label: "Reports" },
		{ href: "/moderation/moderate/violations", label: "Violations" },
		{ href: "/moderation/moderate/bans", label: "Bans" },
		{ href: "/moderation/moderate/ips", label: "IP bans" },
		{ href: "/moderation/moderate/shorts", label: "Shorts" },
		{ href: "/moderation/moderate/games", label: "Games" },
		{ href: "/moderation/moderate/accounts", label: "Accounts" }
	];
</script>

<Flex alignItems="center" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex gap="small" flexWrap="wrap" alignItems="center" justifyContent="spaceBetween">
			<Flex gap="small" flexWrap="wrap">
				{#each tabs as tab (tab.href)}
					<LinkButton href={tab.href}>{tab.label}</LinkButton>
				{/each}
			</Flex>
			<Button
				iconbefore="arrow_back"
				onclick={() => {
					navigateBack("/moderation");
				}}>
				Exit
			</Button>
		</Flex>
	</Flex>
</Flex>
{@render children()}
