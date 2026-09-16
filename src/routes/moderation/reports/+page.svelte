<script lang="ts">
	import { page } from "$app/state";
	import { onMount } from "svelte";
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import {
		appState,
		authState,
		Button,
		Flex,
		formatIsoToPreferred,
		getFetch,
		Icon,
		Modal,
		navigateBack,
		Skeleton,
		whenAuthReady
	} from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";
	import HorizontalCard from "$lib/components/HorizontalCard/HorizontalCard.svelte";
	import type { UserReport } from "$lib/reportTypes";

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

	const statusColors: Record<string, string> = {
		pending: token.theme.color.text.warning || "#e6a23c",
		resolved: token.theme.color.text.success || "#67c23a",
		dismissed: token.theme.color.text.secondary || "#909399"
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
						icon={statusIcons[report.status] || "help"}
						onclick={() => {
							openReport = report;
						}}
						title={report.reportType.toUpperCase() + " Report"}
						description={`Updated ${formatIsoToPreferred(report.updatedAt, true)}`} />
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
			<Flex alignItems="center" gap="small">
				<Icon
					icon={statusIcons[openReport.status] || "help"}
					style="color: {statusColors[openReport.status] || 'inherit'}" />
				<span
					style="font-weight: bold; text-transform: capitalize; color: {statusColors[
						openReport.status
					] || 'inherit'}">
					Status: {openReport.status}
				</span>
			</Flex>

			<!-- Report Details List -->
			<div class="report-details">
				<p>
					<strong>Report ID:</strong>
					<span class="code-text">{openReport.id}</span>
				</p>
				<p>
					<strong>Type:</strong>
					{openReport.reportType}
				</p>
				<p>
					<strong>Target Content ID:</strong>
					<span class="code-text">{openReport.reportedId}</span>
				</p>
				<p>
					<strong>Submitted:</strong>
					{formatIsoToPreferred(openReport.createdAt, true)}
				</p>
				<p>
					<strong>Last Updated:</strong>
					{formatIsoToPreferred(openReport.updatedAt, true)}
				</p>

				<hr class="divider" />

				<p><strong>Reason Provided:</strong></p>
				<div class="reason-box">
					{openReport.reason}
				</div>
			</div>
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

<style>
	.report-details {
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 0.95rem;
	}

	.report-details p {
		margin: 0;
	}

	.code-text {
		font-family: monospace;
		font-size: 0.85em;
		opacity: 0.8;
	}

	.divider {
		border: 0;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		margin: 12px 0;
	}

	.reason-box {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 6px;
		padding: 12px;
		white-space: pre-wrap;
		word-break: break-word;
		font-size: 0.9rem;
		line-height: 1.4;
	}
</style>
