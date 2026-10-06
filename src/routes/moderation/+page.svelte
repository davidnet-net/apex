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
	import * as m from "$lib/paraglide/messages.js";

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
			<h2>{m.page_moderation_heading()}</h2>
			<Flex width="fit-content" height="fit-content" gap="small">
				<LinkButton href="/help">{m.page_help_center_link()}</LinkButton>
				<Button
					iconbefore="arrow_back"
					onclick={() => {
						navigateBack("/help");
					}}>
					{m.common_back()}
				</Button>
			</Flex>
		</Flex>
		<Flex gap="medium" height="fit-content" marginBottom="giant" flexWrap="wrap">
			<HorizontalCard
				title={m.page_moderation_card_violations_title()}
				description={m.page_moderation_card_violations_description()}
				icon="person_alert"
				href="/moderation/violations" />
			<HorizontalCard
				title={m.page_moderation_card_reports_title()}
				description={m.page_moderation_card_reports_description()}
				icon="lab_profile"
				href="/moderation/reports" />
		</Flex>
		{#if internalAccessResult?.supportAccess}
			<Flex justifyContent="spaceBetween" height="fit-content">
				<h2>{m.page_help_internal_heading()}</h2>
			</Flex>
			<Flex gap="medium" height="fit-content" marginBottom="giant" flexWrap="wrap">
				<HorizontalCard
					title={m.page_moderation_card_manage_reports_title()}
					icon="balance"
					href="/moderation/moderate" />
				<HorizontalCard
					title={m.page_moderation_card_manage_violations_title()}
					icon="plagiarism"
					href="/moderation/moderate/violations" />
				<HorizontalCard
					title={m.page_moderation_card_manage_bans_title()}
					icon="gavel"
					href="/moderation/moderate/bans" />
				<HorizontalCard
					title={m.page_moderation_card_all_shorts_title()}
					icon="movie"
					href="/moderation/moderate/shorts" />
				<HorizontalCard
					title="All community games"
					icon="stadia_controller"
					href="/moderation/moderate/games" />
				<HorizontalCard
					title={m.page_moderation_card_all_accounts_title()}
					icon="group"
					href="/moderation/moderate/accounts" />
				<HorizontalCard title="IP bans" icon="wifi_off" href="/moderation/moderate/ips" />
			</Flex>
		{/if}
	</Flex>
</Flex>
