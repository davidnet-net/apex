<script lang="ts">
	import {
		authState,
		Button,
		Flex,
		getFetch,
		LinkButton,
		navigateBack,
		whenAuthReady
	} from "@davidnet-net/svelte-ui";
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
			<h2>Davidnet moderation</h2>
			<Button
				iconbefore="arrow_back"
				onclick={() => {
					navigateBack("/help");
				}}>
				Back
			</Button>
		</Flex>
		<Flex gap="medium" height="fit-content" marginBottom="giant" flexWrap="wrap">
			<HorizontalCard
				title="Violations"
				description="View your violations."
				icon="person_alert"
				href="/moderation/violations" />
			<HorizontalCard
				title="Reports"
				description="View your reports."
				icon="lab_profile"
				href="/moderation/reports" />
		</Flex>
		{#if internalAccessResult?.supportAccess}
			<Flex justifyContent="spaceBetween" height="fit-content">
				<h2>Internal</h2>
			</Flex>
			<Flex gap="medium" height="fit-content" marginBottom="giant" flexWrap="wrap">
				<HorizontalCard title="Manage reports" icon="balance" href="/moderation/moderate" />
				<HorizontalCard
					title="Manage violations"
					icon="plagiarism"
					href="/moderation/moderate/violations" />
				<HorizontalCard title="Manage bans" icon="gavel" href="/moderation/moderate/bans" />
			</Flex>
		{/if}
	</Flex>
</Flex>
