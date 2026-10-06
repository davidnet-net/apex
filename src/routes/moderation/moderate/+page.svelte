<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import {
		authState,
		Avatar,
		Button,
		deleteFetch,
		Divider,
		Flex,
		formatIsoToPreferred,
		getFetch,
		patchFetch,
		postFetch,
		Icon,
		IconButton,
		Lozenge,
		Modal,
		Skeleton,
		toast,
		whenAuthReady,
		type iconType,
		Tab,
		Tabs,
		TabPanel,
		Field,
		TextArea,
		TextField,
		Spinner,
		Dropdown,
		Anchor
	} from "@davidnet-net/svelte-ui";

	import { token } from "@davidnet-net/svelte-ui/tokens";
	import HorizontalCard from "$lib/components/HorizontalCard/HorizontalCard.svelte";
	import * as m from "$lib/paraglide/messages.js";

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
	let gameDetails = $state<any>(null);
	let gameFiles = $state<string[]>([]);
	let selectedFileContent = $state<string | null>(null);
	let selectedFilePath = $state<string | null>(null);
	let loadingFile = $state(false);

	// --- Game player data (highscores / saves) - lets a moderator (not just the game's creator)
	// inspect and act on anti-cheat flags and player data for a reported game. ---
	let managePlayers = $state<any[]>([]);
	let isLoadingManagePlayers = $state(false);
	let editingHighscoreUserId = $state<string | null>(null);
	let editingHighscoreValue = $state("");
	let editingSaveUserId = $state<string | null>(null);
	let editingSaveValue = $state("");
	let savingManageAction = $state(false);

	let modReason = $state("");
	let targetUserViolations = $state<any[]>([]);

	let banDropdownOpen = $state(false);
	let selectedBanOption = $state<"1day" | "7days" | "30days" | "1year" | "forever">("1day");
	let selectedBanViolationId = $state<string | undefined>(undefined);
	let banReasonText = $state("");
	let currentBanStatus = $state<{ isBanned: boolean; bannedUntil: string | null } | null>(null);

	let refreshInterval: ReturnType<typeof setInterval>;
	let handleVisibilityChange: () => void;

	// References voor Fullscreen functionaliteit
	let mediaContainerRef = $state<HTMLDivElement>();
	let codeViewerRef = $state<HTMLDivElement>();

	$effect(() => {
		const currentFilter = filterStatus;
		(async () => {
			await whenAuthReady();
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
			gameDetails = res.game;
		} else {
			gameIsModerated = false;
			gameDetails = null;
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

		await loadManagePlayers(gameId);
	}

	async function loadManagePlayers(gameId: string) {
		isLoadingManagePlayers = true;
		const res = await getFetch(
			`${PUBLIC_BACKEND_URL}/social/community-games/${gameId}/manage/players`,
			undefined,
			undefined,
			true
		);
		managePlayers = res && res.success ? res.players : [];
		isLoadingManagePlayers = false;
	}

	function startEditHighscore(player: any) {
		editingHighscoreUserId = player.userId;
		editingHighscoreValue = String(player.highscore ?? 0);
	}

	async function confirmEditHighscore(player: any) {
		if (!openReport) return;
		const score = Number(editingHighscoreValue);
		if (!Number.isFinite(score) || score < 0) {
			toast(
				m.page_moderate_toast_invalid_score_title(),
				m.page_moderate_toast_invalid_score_content(),
				"error",
				3000,
				"danger"
			);
			return;
		}

		savingManageAction = true;
		const res = await patchFetch(
			`${PUBLIC_BACKEND_URL}/social/community-games/${openReport.reportedId}/manage/highscores/${player.userId}`,
			{ score },
			undefined,
			true
		);
		if (res && res.success) {
			player.highscore = score;
			player.highscoreFlagged = false;
			editingHighscoreUserId = null;
			toast(
				m.page_moderate_toast_highscore_updated_title(),
				m.page_moderate_toast_highscore_updated_content(),
				"check_circle",
				3000,
				"success"
			);
		} else {
			toast(
				m.common_error_title(),
				m.page_moderate_toast_highscore_update_failed_content(),
				"error",
				4000,
				"danger"
			);
		}
		savingManageAction = false;
	}

	async function approveHighscore(player: any) {
		if (!openReport) return;
		savingManageAction = true;
		const res = await postFetch(
			`${PUBLIC_BACKEND_URL}/social/community-games/${openReport.reportedId}/manage/highscores/${player.userId}/approve`,
			{},
			undefined,
			true
		);
		if (res && res.success) {
			player.highscoreFlagged = false;
			toast(
				m.page_moderate_toast_highscore_approved_title(),
				m.page_moderate_toast_highscore_approved_content(),
				"check_circle",
				3000,
				"success"
			);
		} else {
			toast(
				m.common_error_title(),
				m.page_moderate_toast_highscore_approve_failed_content(),
				"error",
				4000,
				"danger"
			);
		}
		savingManageAction = false;
	}

	async function deletePlayerHighscore(player: any) {
		if (!openReport) return;
		savingManageAction = true;
		const res = await deleteFetch(
			`${PUBLIC_BACKEND_URL}/social/community-games/${openReport.reportedId}/manage/highscores/${player.userId}`,
			undefined,
			undefined,
			true
		);
		if (res && res.success) {
			player.highscore = null;
			toast(
				m.page_moderate_toast_highscore_deleted_title(),
				m.page_moderate_toast_highscore_deleted_content(),
				"delete",
				3000,
				"success"
			);
		} else {
			toast(
				m.common_error_title(),
				m.page_moderate_toast_highscore_delete_failed_content(),
				"error",
				4000,
				"danger"
			);
		}
		savingManageAction = false;
	}

	function startEditSave(player: any) {
		editingSaveUserId = player.userId;
		editingSaveValue = JSON.stringify(player.save ?? {}, null, 2);
	}

	async function confirmEditSave(player: any) {
		if (!openReport) return;
		let parsed: unknown;
		try {
			parsed = JSON.parse(editingSaveValue);
		} catch {
			toast(
				m.page_moderate_toast_invalid_json_title(),
				m.page_moderate_toast_invalid_json_content(),
				"error",
				4000,
				"danger"
			);
			return;
		}

		savingManageAction = true;
		const res = await patchFetch(
			`${PUBLIC_BACKEND_URL}/social/community-games/${openReport.reportedId}/manage/saves/${player.userId}`,
			{ data: parsed },
			undefined,
			true
		);
		if (res && res.success) {
			player.save = parsed;
			editingSaveUserId = null;
			toast(
				m.page_moderate_toast_highscore_updated_title(),
				m.page_moderate_toast_save_updated_content(),
				"check_circle",
				3000,
				"success"
			);
		} else {
			toast(
				m.common_error_title(),
				m.page_moderate_toast_save_update_failed_content(),
				"error",
				4000,
				"danger"
			);
		}
		savingManageAction = false;
	}

	async function deletePlayerSave(player: any) {
		if (!openReport) return;
		savingManageAction = true;
		const res = await deleteFetch(
			`${PUBLIC_BACKEND_URL}/social/community-games/${openReport.reportedId}/manage/saves/${player.userId}`,
			undefined,
			undefined,
			true
		);
		if (res && res.success) {
			player.save = null;
			toast(
				m.page_moderate_toast_highscore_deleted_title(),
				m.page_moderate_toast_save_deleted_content(),
				"delete",
				3000,
				"success"
			);
		} else {
			toast(
				m.common_error_title(),
				m.page_moderate_toast_save_delete_failed_content(),
				"error",
				4000,
				"danger"
			);
		}
		savingManageAction = false;
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
				selectedFileContent = m.page_moderate_file_load_failed();
			}
		} catch (err) {
			selectedFileContent = m.page_moderate_file_network_error();
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
			toast(m.page_moderate_toast_status_updated({ status: newStatus }), undefined, undefined, 2000, "success");
			reportsQueue = reportsQueue.map((r) =>
				r.reportedId === openReport!.reportedId && r.reportType === openReport!.reportType
					? { ...r, status: newStatus }
					: r
			);
			openReport.status = newStatus;
		} else {
			toast(m.page_moderate_toast_status_update_failed(), undefined, undefined, 2000, "danger");
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
				hide ? m.page_moderate_content_hidden() : m.page_moderate_content_unmoderated(),
				undefined,
				undefined,
				2000,
				"success"
			);
		} else {
			toast(m.page_moderate_toast_moderate_content_failed(), undefined, undefined, 2000, "danger");
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
				hide ? m.page_moderate_game_hidden() : m.page_moderate_game_unmoderated(),
				undefined,
				undefined,
				2000,
				"success"
			);
		} else {
			toast(m.page_moderate_toast_moderate_game_failed(), undefined, undefined, 2000, "danger");
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
			toast(m.page_moderate_toast_ugc_cleared(), undefined, undefined, 2000, "success");
		} else {
			toast(m.page_moderate_toast_ugc_clear_failed(), undefined, undefined, 2000, "danger");
		}
		isActioning = false;
	}

	async function issueViolation() {
		if (!openReport) return;
		if (!modReason.trim()) {
			toast(m.page_moderate_toast_reason_required(), undefined, undefined, 3000, "warning");
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
			toast(m.page_moderate_toast_violation_issued(), undefined, undefined, 2000, "success");
			modReason = "";
			await fetchUserViolations(openReport.reportedUserId);
		} else {
			toast(m.page_moderate_toast_violation_issue_failed(), undefined, undefined, 2000, "danger");
		}
		isActioning = false;
	}

	async function executeBanUser(bannedUntil: string | null) {
		if (!openReport) return;

		if (bannedUntil && !selectedBanViolationId && !banReasonText.trim()) {
			toast(
				"Pick an existing violation or type a reason - the DSA requires a statement of reasons for every ban.",
				undefined,
				undefined,
				4000,
				"warning"
			);
			return;
		}

		isActioning = true;

		const res = await patchFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/users/${openReport.reportedUserId}/ban`,
			{
				bannedUntil,
				violationId: selectedBanViolationId,
				reason: banReasonText.trim() || undefined
			},
			undefined,
			true
		);

		if (res && res.success) {
			toast(
				bannedUntil ? m.page_moderate_toast_user_banned() : m.page_moderate_toast_user_unbanned(),
				undefined,
				undefined,
				2000,
				"success"
			);
			selectedBanViolationId = undefined;
			banReasonText = "";
			await fetchUserBanStatus(openReport.reportedUserId);
		} else {
			toast(m.page_moderate_toast_ban_update_failed(), undefined, undefined, 2000, "danger");
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
		gameDetails = null;
		managePlayers = [];
		editingHighscoreUserId = null;
		editingSaveUserId = null;
		await loadData(filterStatus);
	}

	// Handelt native fullscreen af voor media en code bestanden
	function toggleFullscreen(elem: HTMLElement | undefined) {
		if (!elem) return;
		if (!document.fullscreenElement) {
			elem.requestFullscreen().catch(() => {
				toast(m.common_error_title(), m.page_moderate_fullscreen_failed(), "error", 3000, "danger");
			});
		} else {
			document.exitFullscreen();
		}
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
		<h2>{m.page_moderate_queue_heading()}</h2>

		<Tabs bind:selected={filterStatus}>
			<Flex gap="small" marginBottom="small">
				<Tab value="pending">{m.page_moderate_tab_pending()}</Tab>
				<Tab value="resolved">{m.page_moderate_tab_resolved()}</Tab>
				<Tab value="dismissed">{m.page_moderate_tab_dismissed()}</Tab>
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
					<p style="color: {token.theme.color.text.secondary}">{m.page_moderate_queue_empty()}</p>
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
								gameDetails = null;
								managePlayers = [];
								editingHighscoreUserId = null;
								editingSaveUserId = null;
								if (report.reportType === "short") {
									await fetchShortDetails(report.reportedId);
								} else if (report.reportType === "game") {
									await fetchGameDetails(report.reportedId);
								}
								await fetchUserBanStatus(report.reportedUserId);
								await fetchUserViolations(report.reportedUserId);
							}}
							title={`[${report.reportType.toUpperCase()}] @${report.reportedUsername}`}
							description={`${m.page_moderate_report_by_prefix()} @${report.reporterUsername} • ${formatIsoToPreferred(report.createdAt, false)}`} />
					</div>
				{/each}
			{/if}
		</Flex>
	</Flex>
</Flex>

{#if openReport}
	<Modal
		title={m.page_moderate_review_report_title({ type: openReport.reportType.toUpperCase() })}
		onclose={handleCloseModal}>
		<Tabs bind:selected={modalTab}>
			<Flex
				gap="small"
				marginBottom="medium"
				style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
				<Tab value="details">{m.page_moderate_tab_content()}</Tab>
				{#if openReport.reportType === "game"}
					<Tab value="files">{m.page_moderate_tab_files()}</Tab>
					<Tab value="players">{m.page_moderate_tab_players()}</Tab>
				{/if}
				<Tab value="actions">{m.page_moderate_tab_actions()}</Tab>
				<Tab value="violations">{m.page_moderate_tab_violations({ count: targetUserViolations.length })}</Tab>
				<Tab value="ban">{m.page_moderate_tab_ban()}</Tab>
			</Flex>

			<TabPanel value="details">
				<Flex direction="column" gap="medium" width="100%">
					<div class="media-container" bind:this={mediaContainerRef}>
						{#if openReport.reportType === "short" && shortVideoUrl}
							<video src={shortVideoUrl} controls playsinline class="preview-video"></video>
						{:else if openReport.reportType === "profile"}
							<iframe
								src={getContentUrl(openReport)}
								title={m.page_moderate_iframe_profile_title()}
								sandbox="allow-scripts allow-same-origin"
								loading="lazy">
							</iframe>
						{:else if openReport.reportType === "game"}
							<!-- NEVER add allow-same-origin here: combined with allow-scripts it would hand an
								 untrusted, possibly malicious game full access to this origin's cookies and
								 authenticated fetch - i.e. the reviewing MODERATOR's own session - completely
								 bypassing the postMessage sandbox the player-facing page relies on. -->
							<iframe
								src="{PUBLIC_BACKEND_URL}/social/community-games/{openReport.reportedId}/file/index.html"
								title={m.page_moderate_iframe_game_title()}
								sandbox="allow-scripts allow-downloads allow-forms allow-modals allow-popups"
								allow="autoplay; fullscreen"
								loading="lazy">
							</iframe>
						{:else}
							<Flex justifyContent="center" alignItems="center" height="100%" direction="column">
								<p style="opacity: 0.6;">{m.page_moderate_loading_preview()}</p>
								<Spinner size="large" />
							</Flex>
						{/if}

						<button
							class="fullscreen-btn"
							onclick={() => toggleFullscreen(mediaContainerRef)}
							title={m.page_moderate_toggle_fullscreen()}>
							<Icon icon="fullscreen" />
						</button>
					</div>

					<Flex height="fit-content" gap="small" direction="column">
						<Flex alignItems="center" gap="small" height="fit-content">
							<Icon icon={(statusIcons[openReport.status] as iconType) || ("help" as iconType)} />
							<span>
								<strong>{m.page_moderate_current_status_label()}</strong>
								{openReport.status}
							</span>
						</Flex>

						<p>
							<strong>{m.common_label_report_id()}</strong>
							{openReport.id}
						</p>
						<p>
							<strong>{m.page_moderate_content_id_label()}</strong>
							{openReport.reportedId}
						</p>
						<p>
							<strong>{m.page_moderate_reporter_label()}</strong>
							<Anchor
								href="https://account.davidnet.net/profile/{openReport.reporterUsername}"
								target="_blank">
								@{openReport.reporterUsername}
							</Anchor>
							<span style="opacity: 0.6;">({openReport.reporterDisplayName})</span>
						</p>
						<p>
							<strong>{m.page_moderate_reported_user_label()}</strong>
							<Anchor
								href="https://account.davidnet.net/profile/{openReport.reportedUsername}"
								target="_blank">
								@{openReport.reportedUsername}
							</Anchor>
							<span style="opacity: 0.6;">(User ID: {openReport.reportedUserId})</span>
						</p>
						<p>
							<strong>{m.common_label_submitted()}</strong>
							{formatIsoToPreferred(openReport.createdAt, true)}
						</p>

						{#if openReport.reportType === "game" && gameDetails}
							<Divider color="tertiary" />
							<p>
								<strong>{m.page_moderate_game_title_label()}</strong>
								{gameDetails.title}
							</p>
							{#if gameDetails.description}
								<p>
									<strong>{m.page_moderate_description_label()}</strong>
									{gameDetails.description}
								</p>
							{/if}
							<Flex gap="small" alignItems="center" flexWrap="wrap">
								<Lozenge appearance={gameIsModerated ? "danger" : "success"}>
									{gameIsModerated ? m.page_moderate_lozenge_hidden() : m.page_moderate_lozenge_visible()}
								</Lozenge>
								{#if gameDetails.isAiGenerated}
									<Lozenge appearance="discover">{m.page_moderate_ai_generated()}</Lozenge>
								{/if}
								<Lozenge appearance="default">
									<Icon icon="favorite" size="small" />
									{gameDetails.likesCount ?? 0}
								</Lozenge>
							</Flex>
							<p style="font-size: 0.85rem; opacity: 0.7;">
								{m.page_moderate_uploaded_label({ date: formatIsoToPreferred(gameDetails.createdAt, true) })}
							</p>
						{/if}

						<Divider color="tertiary" />
						<p><strong>{m.page_moderate_reason_for_report_label()}</strong></p>
						<div class="reason-box">{openReport.reason}</div>
					</Flex>
				</Flex>
			</TabPanel>

			{#if openReport.reportType === "game"}
				<TabPanel value="files">
					<Flex direction="column" gap="medium" width="100%">
						<div class="action-section">
							<h4>{m.page_moderate_files_explorer_heading()}</h4>
							<p style="font-size: 0.9em; opacity: 0.7; margin-bottom: 12px;">
								{m.page_moderate_files_explorer_description()}
							</p>

							{#if gameFiles.length === 0}
								<p style="opacity: 0.6;">{m.page_moderate_no_files()}</p>
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

									<div class="code-viewer-pane" bind:this={codeViewerRef}>
										<div class="code-header">
											<span>{selectedFilePath || m.page_moderate_select_a_file()}</span>
											<button
												class="icon-btn"
												onclick={() => toggleFullscreen(codeViewerRef)}
												title={m.page_moderate_toggle_fullscreen()}>
												<Icon icon="fullscreen" size="small" />
											</button>
										</div>
										<div class="code-content">
											{#if loadingFile}
												<Flex justifyContent="center" alignItems="center" height="100%">
													<Spinner size="medium" />
												</Flex>
											{:else if selectedFileContent !== null}
												<pre><code>{selectedFileContent}</code></pre>
											{:else}
												<span style="opacity: 0.5;">{m.page_moderate_no_content()}</span>
											{/if}
										</div>
									</div>
								</Flex>
							{/if}
						</div>
					</Flex>
				</TabPanel>

				<TabPanel value="players">
					<Flex direction="column" gap="medium" width="100%">
						<div class="action-section">
							<h4>{m.page_moderate_player_data_heading()}</h4>
							<p style="font-size: 0.9em; opacity: 0.7; margin-bottom: 12px;">
								{m.page_moderate_player_data_description()}
							</p>

							{#if isLoadingManagePlayers}
								<Flex justifyContent="center" alignItems="center" height="120px">
									<Spinner size="medium" />
								</Flex>
							{:else if managePlayers.length === 0}
								<p style="opacity: 0.6;">{m.page_moderate_no_players()}</p>
							{:else}
								<Flex direction="column" gap="small" maxHeight="420px" overflowY="auto">
									{#each managePlayers as p (p.userId)}
										<div class="violation-card">
											<Flex alignItems="center" gap="small">
												<Avatar size="small" src={p.avatarUrl} alt={p.username} />
												<strong>@{p.username}</strong>
											</Flex>

											<Flex alignItems="center" gap="small" marginTop="small" flexWrap="wrap">
												<span style="opacity: 0.7;">{m.page_moderate_highscore_label()}</span>
												{#if editingHighscoreUserId === p.userId}
													<TextField bind:value={editingHighscoreValue} type="number" />
													<IconButton
														icon="check"
														tip={m.common_confirm()}
														disabled={savingManageAction}
														onclick={() => confirmEditHighscore(p)} />
													<IconButton
														icon="close"
														tip={m.common_cancel()}
														onclick={() => (editingHighscoreUserId = null)} />
												{:else}
													<strong>{p.highscore ?? "—"}</strong>
													{#if p.highscoreFlagged}
														<Lozenge appearance="warning">
															<span title={p.highscoreFlagReason}>{m.page_moderate_flagged_badge()}</span>
														</Lozenge>
														<IconButton
															icon="check_circle"
															tip={m.page_moderate_approve_highscore_tip()}
															disabled={savingManageAction}
															onclick={() => approveHighscore(p)} />
													{/if}
													<IconButton
														icon="edit"
														tip={m.page_moderate_edit_highscore_tip()}
														onclick={() => startEditHighscore(p)} />
													{#if p.highscore !== null}
														<IconButton
															icon="delete"
															tip={m.page_moderate_delete_highscore_tip()}
															appearance="danger"
															disabled={savingManageAction}
															onclick={() => deletePlayerHighscore(p)} />
													{/if}
												{/if}
											</Flex>

											<Flex direction="column" gap="xsmall" marginTop="small">
												<Flex alignItems="center" gap="small">
													<span style="opacity: 0.7;">{m.page_moderate_save_data_label()}</span>
													<Lozenge appearance={p.save ? "success" : "default"}>
														{p.save ? m.page_moderate_has_save() : m.page_moderate_no_save()}
													</Lozenge>
													{#if editingSaveUserId !== p.userId}
														<IconButton
															icon="data_object"
															tip={m.page_moderate_view_edit_save_tip()}
															onclick={() => startEditSave(p)} />
														{#if p.save}
															<IconButton
																icon="delete"
																tip={m.page_moderate_delete_save_tip()}
																appearance="danger"
																disabled={savingManageAction}
																onclick={() => deletePlayerSave(p)} />
														{/if}
													{/if}
												</Flex>

												{#if editingSaveUserId === p.userId}
													<TextArea bind:value={editingSaveValue} rows={10} />
													<Flex gap="small">
														<Button
															appearance="primary"
															loading={savingManageAction}
															onclick={() => confirmEditSave(p)}>
															{m.common_save_changes()}
														</Button>
														<Button onclick={() => (editingSaveUserId = null)}>{m.common_cancel()}</Button>
													</Flex>
												{/if}
											</Flex>
										</div>
									{/each}
								</Flex>
							{/if}
						</div>
					</Flex>
				</TabPanel>
			{/if}

			<TabPanel value="actions">
				<Flex direction="column" gap="large" width="100%">
					<div class="action-section">
						<h4>{m.page_moderate_content_controls_heading()}</h4>
						<p style="font-size: 0.9em; opacity: 0.7; margin-bottom: 12px;">
							{m.page_moderate_content_controls_description()}
						</p>
						<Flex gap="small">
							{#if openReport.reportType === "short"}
								{#if !shortIsModerated}
									<Button
										appearance="danger"
										disabled={isActioning}
										onclick={() => toggleContentModeration(true)}>
										{m.page_moderate_moderate_short_button()}
									</Button>
								{:else}
									<Button
										appearance="subtle"
										disabled={isActioning}
										onclick={() => toggleContentModeration(false)}>
										{m.page_moderate_unmoderate_short_button()}
									</Button>
								{/if}
							{:else if openReport.reportType === "game"}
								{#if !gameIsModerated}
									<Button
										appearance="danger"
										disabled={isActioning}
										onclick={() => toggleGameModeration(true)}>
										{m.page_moderate_moderate_game_button()}
									</Button>
								{:else}
									<Button
										appearance="subtle"
										disabled={isActioning}
										onclick={() => toggleGameModeration(false)}>
										{m.page_moderate_unmoderate_game_button()}
									</Button>
								{/if}
							{:else if openReport.reportType === "profile"}
								<Button appearance="danger" disabled={isActioning} onclick={clearProfileUGC}>
									{m.page_moderate_clear_profile_button()}
								</Button>
							{/if}
						</Flex>
					</div>

					<div class="action-section">
						<h4>{m.page_moderate_issue_violation()}</h4>
						<p style="font-size: 0.9em; opacity: 0.7; margin-bottom: 12px;">
							{m.page_moderate_issue_violation_description()}
						</p>

						<Field label={m.page_moderate_moderator_note_label()} name="modReason" required>
							<TextArea
								bind:value={modReason}
								maxlength={1000}
								placeholder={m.page_moderate_violation_placeholder()}
								disabled={isActioning} />
						</Field>

						<Flex gap="small" marginTop="medium">
							<Button appearance="danger" disabled={isActioning} onclick={issueViolation}>
								{m.page_moderate_issue_violation()}
							</Button>
						</Flex>
					</div>
				</Flex>
			</TabPanel>

			<TabPanel value="violations">
				<Flex direction="column" gap="medium" width="100%">
					<div class="action-section">
						<h4>{m.page_moderate_violation_history_heading()}</h4>
						<p style="font-size: 0.9em; opacity: 0.7; margin-bottom: 12px;">
							{m.page_moderate_violation_history_description()}
						</p>

						{#if targetUserViolations.length === 0}
							<Flex
								direction="column"
								alignItems="center"
								justifyContent="center"
								width="100%"
								padding="medium">
								<Icon icon="verified" size="large" color="success" />
								<p style="opacity: 0.6; margin-top: 8px;">{m.page_moderate_no_previous_violations()}</p>
							</Flex>
						{:else}
							<Flex direction="column" gap="small" maxHeight="320px" overflowY="auto">
								{#each targetUserViolations as violation (violation.id)}
									<div class="violation-card">
										<Flex justifyContent="spaceBetween" alignItems="center">
											<strong>{m.page_moderate_violation_type_label({ type: violation.reportedType.toUpperCase() })}</strong>
											<span style="font-size: 0.8rem; opacity: 0.7;">
												{formatIsoToPreferred(violation.createdAt, true)}
											</span>
										</Flex>
										<p style="margin: 2px 0; font-size: 0.8rem; opacity: 0.6;">
											<strong>Violation ID:</strong>
											{violation.id} |
											<strong>Target ID:</strong>
											{violation.reportedId}
										</p>
										<p style="margin: 6px 0 2px 0; font-size: 0.9rem;">
											<strong>{m.page_moderate_original_reason_label()}</strong>
											{violation.reason}
										</p>
										{#if violation.moderatorReason}
											<p style="margin: 2px 0 0 0; font-size: 0.9rem; color: #ffb74d;">
												<strong>{m.page_moderate_mod_note_label()}</strong>
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
						<h4>{m.page_moderate_ban_status_heading()}</h4>
						{#if currentBanStatus}
							<p style="font-size: 0.95em; margin-bottom: 12px;">
								{m.page_moderate_current_state_label()}
								<strong
									style="color: {currentBanStatus.isBanned
										? token.theme.color.text.danger
										: token.theme.color.text.success}">
									{currentBanStatus.isBanned
										? m.page_moderate_banned_until({ date: formatIsoToPreferred(currentBanStatus.bannedUntil!, true) })
										: m.page_moderate_not_banned()}
								</strong>
							</p>
						{:else}
							<p style="font-size: 0.9em; opacity: 0.7;">{m.page_moderate_loading_ban_status()}</p>
						{/if}

						<Divider color="tertiary" />

						{#if targetUserViolations.length > 0}
							<h4>Pick the violation that justifies this ban</h4>
							<Flex direction="column" gap="xsmall" marginBottom="small">
								{#each targetUserViolations as violation (violation.id)}
									<button
										type="button"
										class="violation-pick"
										class:selected={selectedBanViolationId === violation.id}
										onclick={() =>
											(selectedBanViolationId =
												selectedBanViolationId === violation.id ? undefined : violation.id)}>
										<Flex justifyContent="spaceBetween" alignItems="center" gap="small">
											<span style="font-size: 0.85rem;">
												{violation.reportedType.toUpperCase()} — {violation.moderatorReason ??
													violation.reason}
											</span>
											{#if selectedBanViolationId === violation.id}
												<Lozenge appearance="success">Selected</Lozenge>
											{/if}
										</Flex>
									</button>
								{/each}
							</Flex>
						{/if}

						<Field
							label={selectedBanViolationId
								? "New reason (optional - a violation is already selected)"
								: "Reason (required unless a violation is selected above)"}
							name="banReasonText">
							<TextArea
								bind:value={banReasonText}
								rows={2}
								placeholder="Why is this user being banned? This becomes a new violation on their record."
								disabled={isActioning} />
						</Field>

						<p style="font-size: 0.85em; opacity: 0.7; margin: 4px 0 12px 0;">
							Banning also hides all of this user's shorts and community games. Unbanning does not
							restore them automatically.
						</p>

						<h4 style="margin-top: 16px;">{m.page_moderate_configure_ban_duration_heading()}</h4>

						<div style="margin-bottom: 16px;">
							<Dropdown isOpen={banDropdownOpen} placement="bottom-start">
								{#snippet trigger()}
									<Button appearance="subtle" onclick={() => (banDropdownOpen = !banDropdownOpen)}>
										{m.page_moderate_duration_label({ option: selectedBanOption.toUpperCase() })}
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
									{m.common_ban_option_1day()}
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
									{m.common_ban_option_7days()}
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
									{m.common_ban_option_30days()}
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
									{m.common_ban_option_1year()}
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
									{m.common_ban_option_forever()}
								</Button>
							</Dropdown>
						</div>

						<Flex gap="small">
							<Button appearance="danger" disabled={isActioning} onclick={handleBanSubmit}>
								{m.page_moderate_apply_ban_button()}
							</Button>
							{#if currentBanStatus?.isBanned}
								<Button
									appearance="subtle"
									disabled={isActioning}
									onclick={() => executeBanUser(null)}>
									{m.page_moderate_unban_button()}
								</Button>
							{/if}
						</Flex>
					</div>
				</Flex>
			</TabPanel>
		</Tabs>

		{#snippet actions()}
			<Flex gap="small" justifyContent="spaceBetween" width="100%">
				<Button disabled={isActioning} onclick={handleCloseModal}>{m.common_close()}</Button>

				<Flex gap="small">
					<Button
						appearance={openReport?.status === "dismissed" ? "primary" : "subtle"}
						disabled={isActioning}
						onclick={() => updateReportStatus("dismissed")}>
						{m.page_moderate_mark_dismissed_button()}
					</Button>
					<Button
						appearance={openReport?.status === "resolved" ? "primary" : "subtle"}
						disabled={isActioning}
						onclick={() => updateReportStatus("resolved")}>
						{m.page_moderate_mark_resolved_button()}
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
		position: relative;
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

	/* Nieuwe Fullscreen knop binnen de media container */
	.fullscreen-btn {
		position: absolute;
		top: 12px;
		right: 12px;
		background: rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: white;
		border-radius: 4px;
		padding: 6px;
		cursor: pointer;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}

	.fullscreen-btn:hover {
		background: rgba(0, 0, 0, 0.9);
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

	/* Fix scroll behavior in native fullscreen mode */
	.code-viewer-pane:fullscreen {
		padding: 16px;
	}

	.code-header {
		background: rgba(255, 255, 255, 0.04);
		padding: 8px 12px;
		font-size: 0.85rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		font-family: monospace;
		opacity: 0.8;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	/* Kleinere transparante knop voor de code header */
	.icon-btn {
		background: transparent;
		border: none;
		color: inherit;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border-radius: 4px;
		transition: background 0.2s;
	}

	.icon-btn:hover {
		background: rgba(255, 255, 255, 0.1);
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

	.violation-pick {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 6px;
		padding: 8px 12px;
		width: 100%;
		box-sizing: border-box;
		text-align: left;
		cursor: pointer;
		color: inherit;
		font: inherit;
	}

	.violation-pick.selected {
		border-color: #4caf50;
	}

	.violation-card {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 6px;
		padding: 10px 12px;
	}
</style>
