<script lang="ts">
	import { onMount, onDestroy } from "svelte";
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
		TextArea,
		Spinner,
		Dropdown,
		Anchor
	} from "@davidnet-net/svelte-ui";

	import { token } from "@davidnet-net/svelte-ui/tokens";
	import HorizontalCard from "$lib/components/HorizontalCard/HorizontalCard.svelte";

	import type { ModeratorQueueReport as BaseModeratorQueueReport } from "$lib/moderationTypes";

	type ModeratorQueueReport = Omit<BaseModeratorQueueReport, "reportType"> & {
		reportType: "profile" | "short" | "game";
		reporterUsername: string;
		reporterDisplayName?: string;
		reportedUsername: string;
		reportedDisplayName?: string;
	};

	let reportsQueue = $state<ModeratorQueueReport[]>([]);
	let loading = $state(true);
	let filterStatus = $state<"pending" | "resolved" | "dismissed">("pending");

	let openReport = $state<ModeratorQueueReport | undefined>(undefined);
	let modalTab = $state<"details" | "actions" | "violations" | "ban" | "files">("details");
	let isActioning = $state(false);

	let shortIsModerated = $state(false);
	let shortVideoUrl = $state<string | null>(null);

	let gameIsModerated = $state(false);
	let gameFiles = $state<string[]>([]);
	let selectedFileContent = $state<string | null>(null);
	let selectedFilePath = $state<string | null>(null);
	let loadingFile = $state(false);

	let modReason = $state("");
	let targetUserViolations = $state<any[]>([]);

	let banDropdownOpen = $state(false);
	let selectedBanOption = $state<"1day" | "7days" | "30days" | "1year" | "forever">("1day");
	let currentBanStatus = $state<{ isBanned: boolean; bannedUntil: string | null } | null>(null);

	let refreshInterval: ReturnType<typeof setInterval>;
	let handleVisibilityChange: () => void;

	$effect(() => {
		const currentFilter = filterStatus;
		(async () => {
			await whenAuthReady();
			if (!authState.isLoggedIn && !authState.loading) return;
			loadData(currentFilter);
		})();
	});

	onMount(() => {
		refreshInterval = setInterval(async () => {
			await whenAuthReady();
			if (authState.isLoggedIn && !loading) {
				const res = await getFetch(
					`${PUBLIC_BACKEND_URL}/support/moderation/reports?status=${filterStatus}`,
					undefined,
					undefined,
					true
				);
				if (res && res.reports) {
					reportsQueue = res.reports;
				}
			}
		}, 30000);

		handleVisibilityChange = async () => {
			if (document.visibilityState === "visible") {
				await whenAuthReady();
				if (authState.isLoggedIn) {
					loadData(filterStatus);
				}
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
	});

	onDestroy(() => {
		if (refreshInterval) clearInterval(refreshInterval);
		if (handleVisibilityChange) {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		}
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

	async function fetchShortDetails(shortId: string) {
		const res = await getFetch(
			`${PUBLIC_BACKEND_URL}/social/shorts/${shortId}`,
			undefined,
			undefined,
			true
		);
		if (res && res.success && res.short) {
			shortIsModerated = res.short.isModerated;
			shortVideoUrl = res.short.videoUrl;
		} else {
			shortIsModerated = false;
			shortVideoUrl = null;
		}
	}

	async function fetchGameDetails(gameId: string) {
		const res = await getFetch(
			`${PUBLIC_BACKEND_URL}/social/community-games/${gameId}`,
			undefined,
			undefined,
			true
		);
		if (res && res.success && res.game) {
			gameIsModerated = res.game.isModerated;
		} else {
			gameIsModerated = false;
		}

		const filesRes = await getFetch(
			`${PUBLIC_BACKEND_URL}/social/community-games/${gameId}/files`,
			undefined,
			undefined,
			true
		);
		if (filesRes && filesRes.success) {
			gameFiles = filesRes.files;
			if (gameFiles.length > 0) {
				loadGameFile(gameId, gameFiles[0]);
			}
		} else {
			gameFiles = [];
		}
	}

	async function loadGameFile(gameId: string, filePath: string) {
		selectedFilePath = filePath;
		loadingFile = true;
		selectedFileContent = null;
		try {
			const response = await fetch(
				`${PUBLIC_BACKEND_URL}/social/community-games/${gameId}/file/${filePath}`
			);
			if (response.ok) {
				selectedFileContent = await response.text();
			} else {
				selectedFileContent = "Failed to load file content.";
			}
		} catch (err) {
			selectedFileContent = "Network error loading file.";
		} finally {
			loadingFile = false;
		}
	}

	async function fetchUserBanStatus(userId: string) {
		const res = await getFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/users/${userId}/ban-status`,
			undefined,
			undefined,
			true
		);
		if (res && res.success) {
			currentBanStatus = { isBanned: res.isBanned, bannedUntil: res.bannedUntil };
		} else {
			currentBanStatus = null;
		}
	}

	async function fetchUserViolations(userId: string) {
		const res = await getFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/users/${userId}/violations`,
			undefined,
			undefined,
			true
		);
		if (res && res.success) {
			targetUserViolations = res.violations;
		} else {
			targetUserViolations = [];
		}
	}

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
			toast(`Reports marked as ${newStatus}`, undefined, undefined, 2000, "success");
			reportsQueue = reportsQueue.map((r) =>
				r.reportedId === openReport!.reportedId && r.reportType === openReport!.reportType
					? { ...r, status: newStatus }
					: r
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
			shortIsModerated = hide;
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

	async function toggleGameModeration(hide: boolean) {
		if (!openReport) return;
		isActioning = true;
		const res = await patchFetch(
			`${PUBLIC_BACKEND_URL}/social/community-games/${openReport.reportedId}/moderate`,
			{ isModerated: hide },
			undefined,
			true
		);

		if (res && res.success) {
			gameIsModerated = hide;
			toast(
				hide ? "Game hidden from feed" : "Game unmoderated",
				undefined,
				undefined,
				2000,
				"success"
			);
		} else {
			toast("Failed to moderate game", undefined, undefined, 2000, "danger");
		}
		isActioning = false;
	}

	async function clearProfileUGC() {
		if (!openReport) return;
		isActioning = true;

		const res = await patchFetch(
			`${PUBLIC_BACKEND_URL}/auth/profile/${openReport.reportedId}/clear-ugc`,
			{},
			undefined,
			true
		);

		if (res && res.success) {
			toast("Profile UGC cleared", undefined, undefined, 2000, "success");
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
			await fetchUserViolations(openReport.reportedUserId);
		} else {
			toast("Failed to issue violation", undefined, undefined, 2000, "danger");
		}
		isActioning = false;
	}

	async function executeBanUser(bannedUntil: string | null) {
		if (!openReport) return;
		isActioning = true;

		const res = await patchFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/users/${openReport.reportedUserId}/ban`,
			{ bannedUntil },
			undefined,
			true
		);

		if (res && res.success) {
			toast(
				bannedUntil ? "User banned successfully" : "User unbanned successfully",
				undefined,
				undefined,
				2000,
				"success"
			);
			await fetchUserBanStatus(openReport.reportedUserId);
		} else {
			toast("Failed to update user ban status", undefined, undefined, 2000, "danger");
		}
		isActioning = false;
	}

	function handleBanSubmit() {
		let targetDate: string | null = null;
		const now = Date.now();

		switch (selectedBanOption) {
			case "1day":
				targetDate = new Date(now + 24 * 60 * 60 * 1000).toISOString();
				break;
			case "7days":
				targetDate = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
				break;
			case "30days":
				targetDate = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
				break;
			case "1year":
				targetDate = new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString();
				break;
			case "forever":
				targetDate = new Date("2999-12-31T23:59:59.999Z").toISOString();
				break;
		}

		executeBanUser(targetDate);
	}

	async function handleCloseModal() {
		openReport = undefined;
		gameFiles = [];
		selectedFileContent = null;
		selectedFilePath = null;
		await loadData(filterStatus);
	}

	const statusIcons: Record<string, string> = {
		pending: "schedule",
		resolved: "check_circle",
		dismissed: "cancel"
	};

	function getContentUrl(report: ModeratorQueueReport): string {
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
					gap="medium"
					marginTop="medium">
					<Icon icon="verified" size="giant" color="success" />
					<p style="color: {token.theme.color.text.secondary}">Queue is empty!</p>
				</Flex>
			{:else}
				{#each reportsQueue as report (report.id)}
					<div class="card-item">
						<HorizontalCard
							icon={(statusIcons[report.status] as iconType) || ("help" as iconType)}
							onclick={async () => {
								openReport = report;
								modalTab = "details";
								modReason = "";
								shortVideoUrl = null;
								currentBanStatus = null;
								targetUserViolations = [];
								if (report.reportType === "short") {
									await fetchShortDetails(report.reportedId);
								} else if (report.reportType === "game") {
									await fetchGameDetails(report.reportedId);
								}
								await fetchUserBanStatus(report.reportedUserId);
								await fetchUserViolations(report.reportedUserId);
							}}
							title={`[${report.reportType.toUpperCase()}] @${report.reportedUsername}`}
							description={`By @${report.reporterUsername} • ${formatIsoToPreferred(report.createdAt, false)}`} />
					</div>
				{/each}
			{/if}
		</Flex>
	</Flex>
</Flex>

{#if openReport}
	<Modal title={`Review ${openReport.reportType.toUpperCase()} Report`} onclose={handleCloseModal}>
		<Tabs bind:selected={modalTab}>
			<Flex
				gap="small"
				marginBottom="medium"
				style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
				<Tab value="details">Content</Tab>
				{#if openReport.reportType === "game"}
					<Tab value="files">Files & Code</Tab>
				{/if}
				<Tab value="actions">Content actions</Tab>
				<Tab value="violations">Violations ({targetUserViolations.length})</Tab>
				<Tab value="ban">User actions</Tab>
			</Flex>

			<TabPanel value="details">
				<Flex direction="column" gap="medium" width="100%">
					<div class="media-container">
						{#if openReport.reportType === "short" && shortVideoUrl}
							<video src={shortVideoUrl} controls playsinline class="preview-video"></video>
						{:else if openReport.reportType === "profile"}
							<iframe
								src={getContentUrl(openReport)}
								title="Reported Content Preview"
								sandbox="allow-scripts allow-same-origin"
								loading="lazy">
							</iframe>
						{:else if openReport.reportType === "game"}
							<iframe
								src="{PUBLIC_BACKEND_URL}/social/community-games/{openReport.reportedId}/file/index.html"
								title="Reported Game Preview"
								sandbox="allow-scripts allow-same-origin allow-downloads allow-forms allow-modals allow-popups"
								allow="autoplay; fullscreen"
								loading="lazy">
							</iframe>
						{:else}
							<Flex justifyContent="center" alignItems="center" height="100%" direction="column">
								<p style="opacity: 0.6;">Loading preview...</p>
								<Spinner size="large" />
							</Flex>
						{/if}
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
							<Anchor
								href="https://account.davidnet.net/profile/{openReport.reporterUsername}"
								target="_blank">
								@{openReport.reporterUsername}
							</Anchor>
						</p>
						<p>
							<strong>Reported User:</strong>
							<Anchor
								href="https://account.davidnet.net/profile/{openReport.reportedUsername}"
								target="_blank">
								@{openReport.reportedUsername}
							</Anchor>
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

			{#if openReport.reportType === "game"}
				<TabPanel value="files">
					<Flex direction="column" gap="medium" width="100%">
						<div class="action-section">
							<h4>Uploaded Files Explorer</h4>
							<p style="font-size: 0.9em; opacity: 0.7; margin-bottom: 12px;">
								Inspect individual files and source code to check for malicious logic or hidden
								code.
							</p>

							{#if gameFiles.length === 0}
								<p style="opacity: 0.6;">No files found.</p>
							{:else}
								<Flex gap="medium" style="align-items: flex-start;">
									<div class="file-list-sidebar">
										{#each gameFiles as file}
											<button
												class="file-item-btn {selectedFilePath === file ? 'active' : ''}"
												onclick={() => loadGameFile(openReport!.reportedId, file)}>
												<Icon icon="description" size="small" />
												<span>{file}</span>
											</button>
										{/each}
									</div>

									<div class="code-viewer-pane">
										<div class="code-header">
											<span>{selectedFilePath || "Select a file"}</span>
										</div>
										<div class="code-content">
											{#if loadingFile}
												<Flex justifyContent="center" alignItems="center" height="100%">
													<Spinner size="medium" />
												</Flex>
											{:else if selectedFileContent !== null}
												<pre><code>{selectedFileContent}</code></pre>
											{:else}
												<span style="opacity: 0.5;">No content to display.</span>
											{/if}
										</div>
									</div>
								</Flex>
							{/if}
						</div>
					</Flex>
				</TabPanel>
			{/if}

			<TabPanel value="actions">
				<Flex direction="column" gap="large" width="100%">
					<div class="action-section">
						<h4>Content Controls</h4>
						<p style="font-size: 0.9em; opacity: 0.7; margin-bottom: 12px;">
							Remove or moderate the offending content from the platform.
						</p>
						<Flex gap="small">
							{#if openReport.reportType === "short"}
								{#if !shortIsModerated}
									<Button
										appearance="danger"
										disabled={isActioning}
										onclick={() => toggleContentModeration(true)}>
										Moderate short (Hide)
									</Button>
								{:else}
									<Button
										appearance="subtle"
										disabled={isActioning}
										onclick={() => toggleContentModeration(false)}>
										Unmoderate short (Show)
									</Button>
								{/if}
							{:else if openReport.reportType === "game"}
								{#if !gameIsModerated}
									<Button
										appearance="danger"
										disabled={isActioning}
										onclick={() => toggleGameModeration(true)}>
										Moderate game (Hide)
									</Button>
								{:else}
									<Button
										appearance="subtle"
										disabled={isActioning}
										onclick={() => toggleGameModeration(false)}>
										Unmoderate game (Show)
									</Button>
								{/if}
							{:else if openReport.reportType === "profile"}
								<Button appearance="danger" disabled={isActioning} onclick={clearProfileUGC}>
									Clear profile
								</Button>
							{/if}
						</Flex>
					</div>

					<div class="action-section">
						<h4>Issue violation</h4>
						<p style="font-size: 0.9em; opacity: 0.7; margin-bottom: 12px;">
							Add a note regarding why this violation was issued.
						</p>

						<Field label="Moderator Note:" name="modReason" required>
							<TextArea
								bind:value={modReason}
								maxlength={1000}
								placeholder="Explain the violation..."
								disabled={isActioning} />
						</Field>

						<Flex gap="small" marginTop="medium">
							<Button appearance="danger" disabled={isActioning} onclick={issueViolation}>
								Issue violation
							</Button>
						</Flex>
					</div>
				</Flex>
			</TabPanel>

			<TabPanel value="violations">
				<Flex direction="column" gap="medium" width="100%">
					<div class="action-section">
						<h4>User Violation History</h4>
						<p style="font-size: 0.9em; opacity: 0.7; margin-bottom: 12px;">
							Previous strikes and violation records associated with this user.
						</p>

						{#if targetUserViolations.length === 0}
							<Flex
								direction="column"
								alignItems="center"
								justifyContent="center"
								width="100%"
								padding="medium">
								<Icon icon="verified" size="large" color="success" />
								<p style="opacity: 0.6; margin-top: 8px;">No previous violations on record.</p>
							</Flex>
						{:else}
							<Flex direction="column" gap="small" maxHeight="320px" overflowY="auto">
								{#each targetUserViolations as violation (violation.id)}
									<div class="violation-card">
										<Flex justifyContent="spaceBetween" alignItems="center">
											<strong>Type: {violation.reportedType.toUpperCase()}</strong>
											<span style="font-size: 0.8rem; opacity: 0.7;">
												{formatIsoToPreferred(violation.createdAt, true)}
											</span>
										</Flex>
										<p style="margin: 6px 0 2px 0; font-size: 0.9rem;">
											<strong>Original reason:</strong>
											{violation.reason}
										</p>
										{#if violation.moderatorReason}
											<p style="margin: 2px 0 0 0; font-size: 0.9rem; color: #ffb74d;">
												<strong>Mod note:</strong>
												{violation.moderatorReason}
											</p>
										{/if}
									</div>
								{/each}
							</Flex>
						{/if}
					</div>
				</Flex>
			</TabPanel>

			<TabPanel value="ban">
				<Flex direction="column" gap="large" width="100%">
					<div class="action-section">
						<h4>User ban status</h4>
						{#if currentBanStatus}
							<p style="font-size: 0.95em; margin-bottom: 12px;">
								Current state:
								<strong
									style="color: {currentBanStatus.isBanned
										? token.theme.color.text.danger
										: token.theme.color.text.success}">
									{currentBanStatus.isBanned
										? `Banned until ${formatIsoToPreferred(currentBanStatus.bannedUntil!, true)}`
										: "Not Banned"}
								</strong>
							</p>
						{:else}
							<p style="font-size: 0.9em; opacity: 0.7;">Loading ban status...</p>
						{/if}

						<Divider color="tertiary" />

						<h4 style="margin-top: 16px;">Configure Ban Duration</h4>

						<div style="margin-bottom: 16px;">
							<Dropdown isOpen={banDropdownOpen} placement="bottom-start">
								{#snippet trigger()}
									<Button appearance="subtle" onclick={() => (banDropdownOpen = !banDropdownOpen)}>
										Duration: {selectedBanOption.toUpperCase()}
									</Button>
								{/snippet}

								<Button
									appearance="subtle"
									alignContent="left"
									stretchwidth
									onclick={(e) => {
										e.stopPropagation();
										selectedBanOption = "1day";
										setTimeout(() => {
											banDropdownOpen = false;
										}, 10);
									}}>
									1 Day
								</Button>
								<Button
									appearance="subtle"
									alignContent="left"
									stretchwidth
									onclick={(e) => {
										e.stopPropagation();
										selectedBanOption = "7days";
										setTimeout(() => {
											banDropdownOpen = false;
										}, 10);
									}}>
									7 Days
								</Button>
								<Button
									appearance="subtle"
									alignContent="left"
									stretchwidth
									onclick={(e) => {
										e.stopPropagation();
										selectedBanOption = "30days";
										setTimeout(() => {
											banDropdownOpen = false;
										}, 10);
									}}>
									30 Days
								</Button>
								<Button
									appearance="subtle"
									alignContent="left"
									stretchwidth
									onclick={(e) => {
										e.stopPropagation();
										selectedBanOption = "1year";
										setTimeout(() => {
											banDropdownOpen = false;
										}, 10);
									}}>
									1 Year
								</Button>
								<Button
									appearance="subtle"
									alignContent="left"
									stretchwidth
									onclick={(e) => {
										e.stopPropagation();
										selectedBanOption = "forever";
										setTimeout(() => {
											banDropdownOpen = false;
										}, 10);
									}}>
									Forever
								</Button>
							</Dropdown>
						</div>

						<Flex gap="small">
							<Button appearance="danger" disabled={isActioning} onclick={handleBanSubmit}>
								Apply Ban
							</Button>
							{#if currentBanStatus?.isBanned}
								<Button
									appearance="subtle"
									disabled={isActioning}
									onclick={() => executeBanUser(null)}>
									Unban
								</Button>
							{/if}
						</Flex>
					</div>
				</Flex>
			</TabPanel>
		</Tabs>

		{#snippet actions()}
			<Flex gap="small" justifyContent="spaceBetween" width="100%">
				<Button disabled={isActioning} onclick={handleCloseModal}>Close</Button>

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
	.card-item {
		width: 320px;
	}

	.card-item :global(.horizontal-card) {
		height: auto !important;
		min-height: 84px !important;
		overflow: visible !important;
		padding-bottom: 12px !important;
	}

	.media-container {
		width: 100%;
		height: 380px;
		border-radius: 8px;
		overflow: hidden;
		background: #000;
		border: 1px solid rgba(255, 255, 255, 0.12);
		margin-bottom: 16px;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	iframe,
	.preview-video {
		width: 100%;
		height: 100%;
		object-fit: contain;
		border: none;
	}

	.file-list-sidebar {
		width: 220px;
		max-height: 350px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 4px;
		background: rgba(0, 0, 0, 0.2);
		padding: 8px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.file-item-btn {
		background: transparent;
		border: none;
		color: inherit;
		text-align: left;
		padding: 6px 8px;
		border-radius: 4px;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.85rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: background 0.2s;
	}

	.file-item-btn:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.file-item-btn.active {
		background: rgba(255, 255, 255, 0.12);
		font-weight: bold;
	}

	.code-viewer-pane {
		flex: 1;
		height: 350px;
		display: flex;
		flex-direction: column;
		background: #0d1117;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}

	.code-header {
		background: rgba(255, 255, 255, 0.04);
		padding: 8px 12px;
		font-size: 0.85rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		font-family: monospace;
		opacity: 0.8;
	}

	.code-content {
		flex: 1;
		padding: 12px;
		overflow: auto;
		font-family: monospace;
		font-size: 0.85rem;
		line-height: 1.4;
		white-space: pre;
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

	.violation-card {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 6px;
		padding: 10px 12px;
	}
</style>
