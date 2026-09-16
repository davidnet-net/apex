<script lang="ts">
	import { onMount } from "svelte";
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import {
		authState,
		Button,
		Divider,
		Flex,
		formatIsoToPreferred,
		getFetch,
		Icon,
		Link,
		Modal,
		navigateBack,
		Skeleton,
		whenAuthReady,
		type iconType
	} from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";
	import HorizontalCard from "$lib/components/HorizontalCard/HorizontalCard.svelte";
	import type { UserReport } from "$lib/moderationTypes";
	let myReports = $state<UserReport[]>([]);
	let loading = $state(true);
	let openReport = $state<UserReport | undefined>(undefined);

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

		const res = await getFetch(
			PUBLIC_BACKEND_URL + "/support/moderation/reports/me",
			undefined,
			undefined,
			true
		);

		if (res && res.reports) {
			myReports = res.reports;
		} else if (Array.isArray(res)) {
			myReports = res;
		}

		loading = false;
	}

	onMount(() => {
		const handleVisibilityChange = async () => {
			if (document.visibilityState === "visible") {
				await loadData();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
	});

	const statusIcons: Record<string, string> = {
		pending: "schedule",
		resolved: "check_circle",
		dismissed: "cancel"
	};
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" height="fit-content">
			<h2>Davidnet moderation</h2>
			<Button
				iconbefore="arrow_back"
				onclick={() => {
					navigateBack("/moderation");
				}}>
				Back
			</Button>
		</Flex>
		<Flex gap="medium" height="fit-content" marginBottom="giant" flexWrap="wrap">
			{#if loading}
				<Skeleton height="4rem" width="18rem" />
				<Skeleton height="4rem" width="18rem" />
				<Skeleton height="4rem" width="18rem" />
				<Skeleton height="4rem" width="18rem" />
			{:else if myReports.length === 0}
				<Flex
					direction="column"
					alignItems="center"
					justifyContent="center"
					width="100%"
					marginTop="medium">
					<Icon icon="inbox" size="giant" />
					<p style="color: {token.theme.color.text.secondary}">
						You have not submitted any reports yet.
					</p>
				</Flex>
			{:else}
				{#each myReports as report (report.id)}
					<HorizontalCard
						icon={(statusIcons[report.status] as iconType) || ("help" as iconType)}
						onclick={() => {
							openReport = report;
						}}
						title={`Report: ${report.reportType}`}
						description={`${formatIsoToPreferred(report.updatedAt, true)}`} />
				{/each}
			{/if}
		</Flex>
	</Flex>
</Flex>

{#if openReport}
	<Modal
		title="Report Details"
		onclose={() => {
			openReport = undefined;
		}}>
		<Flex direction="column" gap="medium" width="100%">
			<!-- Status Badge Header -->
			<Flex alignItems="center" gap="small" height="fit-content">
				<Icon icon={(statusIcons[openReport.status] as iconType) || ("help" as iconType)} />
				<span>
					Status: {openReport.status}
				</span>
			</Flex>

			<!-- Report Details List -->
			<Flex height="fit-content" gap="small" direction="column">
				<p>
					<strong>Report ID:</strong>
					<span>{openReport.id}</span>
				</p>
				<p>
					<strong>Type:</strong>
					{openReport.reportType}
				</p>
				<p>
					<strong>Target Content ID:</strong>
					<span>{openReport.reportedId}</span>
				</p>
				<p>
					{#if openReport.status !== "resolved"}
						{#if openReport.reportType === "short"}
							<span>
								<strong>Content:</strong>
								<Link opennewtab href="https://social.davidnet.net/shorts/{openReport.reportedId}">
									View content
								</Link>.
							</span>
						{:else if openReport.reportType === "profile"}
							<span>
								<strong>Content:</strong>
								<Link
									opennewtab
									href="https://account.davidnet.net/profile/{openReport.reportedId}">
									View content
								</Link>.
							</span>
						{:else}
							<span>
								<strong>Content:</strong>
								Report type does not support having a direct link.
							</span>
						{/if}
					{:else}
						<span>
							<strong>Content:</strong>
							Content deleted.
						</span>
					{/if}
				</p>
				<p>
					<strong>Submitted:</strong>
					{formatIsoToPreferred(openReport.createdAt, true)}
				</p>
				<p>
					<strong>Last Updated:</strong>
					{formatIsoToPreferred(openReport.updatedAt, true)}
				</p>

				<Divider color="tertiary" />

				<p><strong>Reason Provided:</strong></p>
				<div>
					{openReport.reason}
				</div>
			</Flex>
		</Flex>

		{#snippet actions()}
			<Button
				appearance="primary"
				onclick={() => {
					openReport = undefined;
				}}>
				Close
			</Button>
		{/snippet}
	</Modal>
{/if}
