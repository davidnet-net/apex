<script lang="ts">
	import { onMount } from "svelte";
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import {
		Anchor,
		Avatar,
		Button,
		Divider,
		Flex,
		formatIsoToPreferred,
		getFetch,
		patchFetch,
		Icon,
		Lozenge,
		Modal,
		Skeleton,
		toast,
		whenAuthReady,
		Field,
		Dropdown,
		TextArea,
		TextField
	} from "@davidnet-net/svelte-ui";

	import { token } from "@davidnet-net/svelte-ui/tokens";
	import * as m from "$lib/paraglide/messages.js";

	let bannedUsersList = $state<any[]>([]);
	let loading = $state(true);

	// Manual Ban Form State
	let targetUserIdInput = $state("");
	let banDropdownOpen = $state(false);
	let selectedBanOption = $state<"1day" | "7days" | "30days" | "1year" | "forever">("1day");
	let isSubmitting = $state(false);

	// DSA Art. 17 "statement of reasons" - a ban must resolve to a violation, either one the
	// moderator picks from this user's existing record or a fresh one created from typed reason.
	let targetViolations = $state<any[]>([]);
	let loadingViolations = $state(false);
	let selectedViolationId = $state<string | undefined>(undefined);
	let banReason = $state("");

	$effect(() => {
		(async () => {
			await whenAuthReady();
			loadBannedUsers();
		})();
	});

	onMount(() => {
		const prefillUserId = new URLSearchParams(window.location.search).get("userId");
		if (prefillUserId) {
			targetUserIdInput = prefillUserId;
		}
	});

	async function loadBannedUsers() {
		loading = true;
		const res = await getFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/bans/all`,
			undefined,
			undefined,
			true
		);

		if (res && res.success && res.bannedUsers) {
			bannedUsersList = res.bannedUsers;
		} else {
			bannedUsersList = [];
		}
		loading = false;
	}

	async function executeUnban(userId: string) {
		isSubmitting = true;
		const res = await patchFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/users/${userId}/ban`,
			{ bannedUntil: null },
			undefined,
			true
		);

		if (res && res.success) {
			toast(m.page_bans_toast_unban_success(), undefined, undefined, 2000, "success");
			await loadBannedUsers();
		} else {
			toast(m.page_bans_toast_unban_failed(), undefined, undefined, 2000, "danger");
		}
		isSubmitting = false;
	}

	async function loadTargetViolations() {
		if (!targetUserIdInput.trim()) return;

		loadingViolations = true;
		selectedViolationId = undefined;
		const res = await getFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/users/${targetUserIdInput.trim()}/violations`,
			undefined,
			undefined,
			true
		);

		targetViolations = res && res.success ? res.violations : [];
		loadingViolations = false;
	}

	async function handleManualBanSubmit() {
		if (!targetUserIdInput.trim()) {
			toast(m.page_bans_toast_invalid_target(), undefined, undefined, 2500, "warning");
			return;
		}

		if (!selectedViolationId && !banReason.trim()) {
			toast(
				"Pick an existing violation or type a reason - the DSA requires a statement of reasons for every ban.",
				undefined,
				undefined,
				4000,
				"warning"
			);
			return;
		}

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

		isSubmitting = true;
		const res = await patchFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/users/${targetUserIdInput.trim()}/ban`,
			{
				bannedUntil: targetDate,
				violationId: selectedViolationId,
				reason: banReason.trim() || undefined
			},
			undefined,
			true
		);

		if (res && res.success) {
			toast(m.page_moderate_toast_user_banned(), undefined, undefined, 2000, "success");
			targetUserIdInput = "";
			banReason = "";
			selectedViolationId = undefined;
			targetViolations = [];
			await loadBannedUsers();
		} else {
			toast(m.page_bans_toast_ban_failed(), undefined, undefined, 2000, "danger");
		}
		isSubmitting = false;
	}
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="medium">
		<h2>{m.page_bans_heading()}</h2>

		<!-- Manual Ban Issuer Section -->
		<div class="action-section">
			<h4>{m.page_bans_issue_manual_heading()}</h4>
			<p style="font-size: 0.9em; opacity: 0.7; margin-bottom: 12px;">
				{m.page_bans_issue_manual_description()}
			</p>

			<Flex direction="column" gap="small">
				<Field label={m.page_bans_target_user_id_label()} name="targetUserId" required>
					<Flex gap="small">
						<TextField
							bind:value={targetUserIdInput}
							placeholder={m.page_bans_target_user_id_placeholder()}
							disabled={isSubmitting} />
						<Button
							appearance="subtle"
							loading={loadingViolations}
							onclick={loadTargetViolations}>
							Load violations
						</Button>
					</Flex>
				</Field>

				{#if targetViolations.length > 0}
					<Field label="Pick the violation that justifies this ban" name="violationId">
						<Flex direction="column" gap="xsmall">
							{#each targetViolations as violation (violation.id)}
								<button
									type="button"
									class="violation-pick"
									class:selected={selectedViolationId === violation.id}
									onclick={() =>
										(selectedViolationId =
											selectedViolationId === violation.id ? undefined : violation.id)}>
									<Flex justifyContent="spaceBetween" alignItems="center" gap="small">
										<span style="font-size: 0.85rem;">
											{violation.reportedType.toUpperCase()} — {violation.moderatorReason ??
												violation.reason}
										</span>
										{#if selectedViolationId === violation.id}
											<Lozenge appearance="success">Selected</Lozenge>
										{/if}
									</Flex>
								</button>
							{/each}
						</Flex>
					</Field>
				{/if}

				<Field
					label={selectedViolationId
						? "New reason (optional - a violation is already selected)"
						: "Reason (required unless a violation is selected above)"}
					name="banReason">
					<TextArea
						bind:value={banReason}
						rows={2}
						placeholder="Why is this user being banned? This becomes a new violation on their record."
						disabled={isSubmitting} />
				</Field>

				<p style="font-size: 0.85em; color: {token.theme.color.text.tertiary}; margin: 0;">
					Banning also hides all of this user's shorts and community games. Unbanning does not
					restore them automatically.
				</p>

				<!-- Duration Dropdown -->
				<div style="margin: 8px 0;">
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
					<Button appearance="danger" disabled={isSubmitting} onclick={handleManualBanSubmit}>
						{m.page_bans_apply_button()}
					</Button>
				</Flex>
			</Flex>
		</div>

		<Divider color="tertiary" />

		<h3>{m.page_bans_active_list_heading()}</h3>
		<Flex gap="medium" height="fit-content" marginBottom="giant" flexWrap="wrap" direction="column">
			{#if loading}
				<Skeleton height="4rem" width="100%" />
				<Skeleton height="4rem" width="100%" />
			{:else if bannedUsersList.length === 0}
				<Flex
					direction="column"
					alignItems="center"
					justifyContent="center"
					width="100%"
					gap="medium"
					marginTop="medium">
					<Icon icon="verified" size="giant" color="success" />
					<p style="color: {token.theme.color.text.secondary}">{m.page_bans_empty()}</p>
				</Flex>
			{:else}
				{#each bannedUsersList as userRecord (userRecord.userId)}
					<div class="violation-row-card">
						<Flex justifyContent="spaceBetween" alignItems="center">
							<Flex alignItems="center" gap="small">
								<Avatar size="small" src={userRecord.avatarUrl ?? ""} alt={userRecord.username} />
								<div>
									<Anchor
										href="https://account.davidnet.net/profile/{userRecord.username}"
										target="_blank">
										@{userRecord.username} ({userRecord.displayName})
									</Anchor>
									<p style="margin: 2px 0 0 0; font-size: 0.8rem; opacity: 0.7;">
										{m.common_user_id_label({ id: userRecord.userId })}
									</p>
									<p style="margin: 2px 0 0 0; font-size: 0.85rem; color: #ff5252;">
										{m.page_bans_banned_until_label({ date: formatIsoToPreferred(userRecord.bannedUntil, true) })}
									</p>
								</div>
							</Flex>
							<Button
								appearance="subtle"
								disabled={isSubmitting}
								onclick={() => executeUnban(userRecord.userId)}>
								{m.page_bans_lift_button()}
							</Button>
						</Flex>
					</div>
				{/each}
			{/if}
		</Flex>
	</Flex>
</Flex>

<style>
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

	.violation-row-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		padding: 16px;
		width: 100%;
		box-sizing: border-box;
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
</style>
