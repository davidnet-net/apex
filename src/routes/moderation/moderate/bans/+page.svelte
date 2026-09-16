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
		patchFetch, // or patchFetch
		Icon,
		Modal,
		navigateBack,
		Skeleton,
		toast,
		whenAuthReady,
		Field,
		Dropdown,
		TextField
	} from "@davidnet-net/svelte-ui";

	import { token } from "@davidnet-net/svelte-ui/tokens";

	let bannedUsersList = $state<any[]>([]);
	let loading = $state(true);

	// Manual Ban Form State
	let targetUserIdInput = $state("");
	let banDropdownOpen = $state(false);
	let selectedBanOption = $state<"1day" | "7days" | "30days" | "1year" | "forever">("1day");
	let isSubmitting = $state(false);

	$effect(() => {
		(async () => {
			await whenAuthReady();
			if (!authState.isLoggedIn && !authState.loading) return;
			loadBannedUsers();
		})();
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
			toast("User ban lifted successfully", undefined, undefined, 2000, "success");
			await loadBannedUsers();
		} else {
			toast("Failed to lift user ban", undefined, undefined, 2000, "danger");
		}
		isSubmitting = false;
	}

	async function handleManualBanSubmit() {
		if (!targetUserIdInput.trim()) {
			toast("Please enter a valid target User ID.", undefined, undefined, 2500, "warning");
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
			{ bannedUntil: targetDate },
			undefined,
			true
		);

		if (res && res.success) {
			toast("User banned successfully", undefined, undefined, 2000, "success");
			targetUserIdInput = "";
			await loadBannedUsers();
		} else {
			toast("Failed to apply ban", undefined, undefined, 2000, "danger");
		}
		isSubmitting = false;
	}
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="medium">
		<Flex justifyContent="spaceBetween" alignItems="center" height="fit-content">
			<h2>Ban management</h2>
			<Button
				iconbefore="arrow_back"
				onclick={() => {
					navigateBack("/moderation");
				}}>
				Back
			</Button>
		</Flex>

		<!-- Manual Ban Issuer Section -->
		<div class="action-section">
			<h4>Issue Manual Ban</h4>
			<p style="font-size: 0.9em; opacity: 0.7; margin-bottom: 12px;">
				Directly ban a user account by entering their id and selecting a duration.
			</p>

			<Flex direction="column" gap="small">
				<Field label="Target User ID" name="targetUserId" required>
					<TextField
						bind:value={targetUserIdInput}
						placeholder="uuid here"
						disabled={isSubmitting} />
				</Field>

				<!-- Duration Dropdown -->
				<div style="margin: 8px 0;">
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
					<Button appearance="danger" disabled={isSubmitting} onclick={handleManualBanSubmit}>
						Apply Ban to User
					</Button>
				</Flex>
			</Flex>
		</div>

		<Divider color="tertiary" />

		<h3>Active Bans List</h3>
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
					<p style="color: {token.theme.color.text.secondary}">No active bans.</p>
				</Flex>
			{:else}
				{#each bannedUsersList as userRecord (userRecord.userId)}
					<div class="violation-row-card">
						<Flex justifyContent="spaceBetween" alignItems="center">
							<div>
								<strong>User ID: {userRecord.userId}</strong>
								<p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #ff5252;">
									Banned until: {formatIsoToPreferred(userRecord.bannedUntil, true)}
								</p>
							</div>
							<Button
								appearance="subtle"
								disabled={isSubmitting}
								onclick={() => executeUnban(userRecord.userId)}>
								Lift Ban (Unban)
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
</style>
