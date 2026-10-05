<script lang="ts">
	import { authState, Flex, getFetch, whenAuthReady } from "@davidnet-net/svelte-ui";
	import HorizontalCard from "$lib/components/HorizontalCard/HorizontalCard.svelte";
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import { onMount } from "svelte";

	interface InternalAccessResult {
		userId: string;
		internalAccess: boolean;
		vpnAccess: boolean;
		dbsAccess: boolean;
		supportAccess: boolean;
		monitoringAccess: boolean;
		developerAccess: boolean;
	}
	let internalAccessResult: undefined | InternalAccessResult = $state(undefined);

	$effect(() => {
		(async () => {
			await whenAuthReady();
			if (!authState.isLoggedIn && !authState.loading) {
				return;
			}

			loadData();
		})();
	});

	async function loadData() {
		if (!authState.isLoggedIn && !authState.loading) {
			return;
		}

		const accessResult = await getFetch(
			PUBLIC_BACKEND_URL + "/auth/internal",
			undefined,
			undefined,
			true
		);

		if (accessResult.success) {
			internalAccessResult = accessResult.access;
		}
	}

	onMount(() => {
		document.addEventListener("visibilitychange", async () => {
			if (document.visibilityState === "visible") {
				await loadData();
			}
		});
	});
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" height="fit-content">
			<h2>Davidnet helpcenter</h2>
		</Flex>
		<Flex gap="medium" height="fit-content" marginBottom="giant" flexWrap="wrap">
			<HorizontalCard title="Privacy & policies" description="" icon="policy" href="/legal" />
			<HorizontalCard
				title="Tickets"
				icon="contact_support"
				href="/help/tickets"
				description="Contact us." />
			<HorizontalCard icon="person_alert" title="Moderation & reports" href="/moderation" />
		</Flex>
		{#if internalAccessResult?.supportAccess}
			<Flex justifyContent="spaceBetween" height="fit-content">
				<h2>Internal</h2>
			</Flex>
			<Flex gap="medium" height="fit-content" marginBottom="giant" flexWrap="wrap">
				<HorizontalCard title="Feedback" icon="feedback" href="/feedback" />
			</Flex>
		{/if}
	</Flex>
</Flex>
