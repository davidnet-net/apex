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
		patchFetch,
		postFetch,
		Icon,
		Modal,
		navigateBack,
		Skeleton,
		toast,
		whenAuthReady,
		type iconType,
		Tab,
		Tabs,
		TabPanel,
		Field,
		TextArea
	} from "@davidnet-net/svelte-ui";

	import { token } from "@davidnet-net/svelte-ui/tokens";
	import HorizontalCard from "$lib/components/HorizontalCard/HorizontalCard.svelte";
	import type { ModeratorQueueReport } from "$lib/moderationTypes";

	// Data State
	let reportsQueue = $state<ModeratorQueueReport[]>([]);
	let loading = $state(true);
	let filterStatus = $state<"pending" | "resolved" | "dismissed">("pending");

	// Modal State
	let openReport = $state<ModeratorQueueReport | undefined>(undefined);
	let modalTab = $state<"details" | "actions">("details");
	let isActioning = $state(false);

	// Form State for actions
	let modReason = $state("");

	$effect(() => {
		const currentFilter = filterStatus;
		(async () => {
			await whenAuthReady();
			if (!authState.isLoggedIn && !authState.loading) return;
			loadData(currentFilter);
		})();
	});

	async function loadData(status: string) {
		loading = true;
		const res = await getFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/reports?status=${status}`,
			undefined,
			undefined,
			true
		);

		if (res && res.reports) {
			reportsQueue = res.reports;
		} else {
			reportsQueue = [];
		}
		loading = false;
	}

	// --- MODERATION ACTIONS ---

	async function updateReportStatus(newStatus: "resolved" | "dismissed" | "pending") {
		if (!openReport) return;
		isActioning = true;
		const res = await patchFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/reports/${openReport.id}/status`,
			{ status: newStatus },
			undefined,
			true
		);

		if (res && res.success) {
			toast(`Report marked as ${newStatus}`, undefined, undefined, 2000, "success");
			reportsQueue = reportsQueue.map((r) =>
				r.id === openReport!.id ? { ...r, status: newStatus } : r
			);
			openReport.status = newStatus;
		} else {
			toast("Failed to update report status", undefined, undefined, 2000, "danger");
		}
		isActioning = false;
	}

	async function toggleContentModeration(hide: boolean) {
		if (!openReport) return;
		isActioning = true;
		const res = await patchFetch(
			`${PUBLIC_BACKEND_URL}/social/shorts/${openReport.reportedId}/moderate`,
			{ isModerated: hide },
			undefined,
			true
		);

		if (res && res.success) {
			toast(
				hide ? "Content hidden from feed" : "Content unmoderated",
				undefined,
				undefined,
				2000,
				"success"
			);
		} else {
			toast("Failed to moderate content", undefined, undefined, 2000, "danger");
		}
		isActioning = false;
	}

	async function clearProfileUGC() {
		if (!openReport) return;
		isActioning = true;

		const res = await patchFetch(
			`${PUBLIC_BACKEND_URL}/profile/${openReport.reportedId}/clear-ugc`,
			{},
			undefined,
			true
		);

		if (res && res.success) {
			toast("Profile UGC cleared and reset", undefined, undefined, 2000, "success");
		} else {
			toast("Failed to clear profile UGC", undefined, undefined, 2000, "danger");
		}
		isActioning = false;
	}

	async function issueViolation() {
		if (!openReport) return;
		if (!modReason.trim()) {
			toast(
				"You must provide a moderator reason for the violation.",
				undefined,
				undefined,
				3000,
				"warning"
			);
			return;
		}

		isActioning = true;
		const res = await postFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/violations`,
			{
				userId: openReport.reportedUserId,
				reportedType: openReport.reportType,
				reportedId: openReport.reportedId,
				reason: openReport.reason,
				moderatorReason: modReason.trim()
			},
			undefined,
			true
		);

		if (res && res.success) {
			toast("Violation strike issued to user", undefined, undefined, 2000, "success");
			modReason = "";
		} else {
			toast("Failed to issue violation", undefined, undefined, 2000, "danger");
		}
		isActioning = false;
	}

	const statusIcons: Record<string, string> = {
		pending: "schedule",
		resolved: "check_circle",
		dismissed: "cancel"
	};

	function getContentUrl(report: ModeratorQueueReport): string {
		if (report.reportType === "short") {
			return `https://social.davidnet.net/shorts/${report.reportedId}`;
		}
		return `https://account.davidnet.net/profile/${report.reportedId}`;
	}
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" alignItems="center" height="fit-content">
			<h2>Moderation Queue</h2>
			<Button
				iconbefore="arrow_back"
				onclick={() => {
					navigateBack("/moderation");
				}}>
				Back
			</Button>
		</Flex>

		<!-- Main Queue Navigation -->
		<Tabs bind:selected={filterStatus}>
			<Flex gap="small" marginBottom="small">
				<Tab value="pending">Pending</Tab>
				<Tab value="resolved">Resolved</Tab>
				<Tab value="dismissed">Dismissed</Tab>
			</Flex>
		</Tabs>

		<Flex gap="medium" height="fit-content" marginBottom="giant" flexWrap="wrap">
			{#if loading}
				<Skeleton height="4rem" width="18rem" />
				<Skeleton height="4rem" width="18rem" />
				<Skeleton height="4rem" width="18rem" />
			{:else if reportsQueue.length === 0}
				<Flex
					direction="column"
					alignItems="center"
					justifyContent="center"
					width="100%"
					marginTop="medium">
					<Icon icon="verified" size="giant" color="success" />
					<p style="color: {token.theme.color.text.secondary}">Queue is empty! Great job.</p>
				</Flex>
			{:else}
				{#each reportsQueue as report (report.id)}
					<HorizontalCard
						icon={(statusIcons[report.status] as iconType) || ("help" as iconType)}
						onclick={() => {
							openReport = report;
							modalTab = "details";
							modReason = "";
						}}
						title={`[${report.reportType.toUpperCase()}] @${report.reporterUsername}`}
						description={`Reported: ${formatIsoToPreferred(report.createdAt, true)}`} />
				{/each}
			{/if}
		</Flex>
	</Flex>
</Flex>

<!-- Review & Moderation Modal -->
{#if openReport}
	<Modal
		title={`Review ${openReport.reportType.toUpperCase()} Report`}
		onclose={() => {
			openReport = undefined;
		}}>
		<!-- Modal Tabs -->
		<Tabs bind:selected={modalTab}>
			<Flex
				gap="small"
				marginBottom="medium"
				style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
				<Tab value="details">Details & Content</Tab>
				<Tab value="actions">Enforcement Actions</Tab>
			</Flex>

			<!-- 1. DETAILS PANEL -->
			<TabPanel value="details">
				<Flex direction="column" gap="medium" width="100%">
					<div class="iframe-container">
						<iframe
							src={getContentUrl(openReport)}
							title="Reported Content Preview"
							sandbox="allow-scripts allow-same-origin"
							loading="lazy">
						</iframe>
					</div>

					<Flex height="fit-content" gap="small" direction="column">
						<Flex alignItems="center" gap="small" height="fit-content">
							<Icon icon={(statusIcons[openReport.status] as iconType) || ("help" as iconType)} />
							<span>
								<strong>Current Status:</strong>
								{openReport.status}
							</span>
						</Flex>

						<p>
							<strong>Report ID:</strong>
							{openReport.id}
						</p>
						<p>
							<strong>Reporter:</strong>
							@{openReport.reporterUsername}
						</p>
						<p>
							<strong>Target User ID:</strong>
							{openReport.reportedUserId}
						</p>
						<p>
							<strong>Submitted:</strong>
							{formatIsoToPreferred(openReport.createdAt, true)}
						</p>

						<Divider color="tertiary" />
						<p><strong>Reason for Report:</strong></p>
						<div class="reason-box">{openReport.reason}</div>
					</Flex>
				</Flex>
			</TabPanel>

			<!-- 2. ENFORCEMENT ACTIONS PANEL -->
			<TabPanel value="actions">
				<Flex direction="column" gap="large" width="100%">
					<!-- Content Moderation Section -->
					<div class="action-section">
						<h4>Content Controls</h4>
						<p style="font-size: 0.9em; opacity: 0.7; margin-bottom: 12px;">
							Remove or moderate the offending content from the platform.
						</p>
						<Flex gap="small">
							{#if openReport.reportType === "short"}
								<Button
									appearance="danger"
									disabled={isActioning}
									onclick={() => toggleContentModeration(true)}>
									Hide Short from Feed
								</Button>
								<Button
									appearance="subtle"
									disabled={isActioning}
									onclick={() => toggleContentModeration(false)}>
									Restore / Unhide Short
								</Button>
							{:else if openReport.reportType === "profile"}
								<Button appearance="danger" disabled={isActioning} onclick={clearProfileUGC}>
									Clear Profile & Reset Username
								</Button>
							{/if}
						</Flex>
					</div>

					<!-- Strike / User Enforcement Section -->
					<div class="action-section">
						<h4>Issue Violation Strike</h4>
						<p style="font-size: 0.9em; opacity: 0.7; margin-bottom: 12px;">
							Penalize the user. Add an internal note regarding why this action was taken.
						</p>

						<Field label="Moderator Note (Internal & User Visible)" name="modReason" required>
							<TextArea
								bind:value={modReason}
								maxlength={1000}
								placeholder="Explain the violation for future record..."
								disabled={isActioning} />
						</Field>

						<Flex gap="small" marginTop="medium">
							<Button appearance="danger" disabled={isActioning} onclick={issueViolation}>
								Issue Strike to User
							</Button>
						</Flex>
					</div>
				</Flex>
			</TabPanel>
		</Tabs>

		{#snippet actions()}
			<Flex gap="small" justifyContent="spaceBetween" width="100%">
				<Button disabled={isActioning} onclick={() => (openReport = undefined)}>Close</Button>

				<!-- Right-side queue status actions -->
				<Flex gap="small">
					<Button
						appearance={openReport?.status === "dismissed" ? "primary" : "subtle"}
						disabled={isActioning}
						onclick={() => updateReportStatus("dismissed")}>
						Mark Dismissed
					</Button>
					<Button
						appearance={openReport?.status === "resolved" ? "primary" : "subtle"}
						disabled={isActioning}
						onclick={() => updateReportStatus("resolved")}>
						Mark Resolved
					</Button>
				</Flex>
			</Flex>
		{/snippet}
	</Modal>
{/if}

<style>
	.iframe-container {
		width: 100%;
		height: 380px;
		border-radius: 8px;
		overflow: hidden;
		background: #000;
		border: 1px solid rgba(255, 255, 255, 0.12);
		margin-bottom: 16px;
	}

	iframe {
		width: 100%;
		height: 100%;
		border: none;
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

	.action-section {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.08);
		padding: 16px;
		border-radius: 8px;
	}

	.action-section h4 {
		margin: 0 0 4px 0;
		font-size: 1.05rem;
	}
</style>
