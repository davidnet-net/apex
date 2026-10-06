<script lang="ts">
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import {
		Anchor,
		authState,
		Avatar,
		Button,
		Divider,
		Field,
		Flex,
		formatIsoToPreferred,
		getFetch,
		Icon,
		LinkButton,
		navigateBack,
		deleteFetch,
		Skeleton,
		TextField,
		toast,
		whenAuthReady
	} from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";

	interface BannedIpRow {
		ip: string;
		reason: string | null;
		createdAt: string;
		moderatorUsername: string;
	}

	interface LinkedUser {
		userId: string;
		username: string;
		displayName: string;
		avatarUrl: string | null;
		lastSeenAt: string;
		userAgent: string | null;
	}

	// This screen only makes sense for support staff (it drives /support/moderation/* endpoints
	// the backend itself gates on internalAccess + supportAccess) - bounce anyone else out to the
	// account domain's access-denied page rather than showing them an empty/broken list.
	let hasModerationAccess = $state(false);

	let bannedIps = $state<BannedIpRow[]>([]);
	let loading = $state(true);
	let unbanningIp = $state<string | undefined>(undefined);

	let lookupIp = $state("");
	let lookupResults = $state<LinkedUser[]>([]);
	let lookupLoading = $state(false);
	let lookupDone = $state(false);

	$effect(() => {
		(async () => {
			await whenAuthReady();
			if (!authState.isLoggedIn && !authState.loading) return;

			const accessResult = await getFetch(
				`${PUBLIC_BACKEND_URL}/auth/internal`,
				undefined,
				undefined,
				true
			);

			if (
				!accessResult.success ||
				!accessResult.access?.internalAccess ||
				!accessResult.access?.supportAccess
			) {
				window.location.href = "https://account.davidnet.net/internal/access_denied";
				return;
			}

			hasModerationAccess = true;
		})();
	});

	$effect(() => {
		if (!hasModerationAccess) return;
		loadBannedIps();
	});

	async function loadBannedIps() {
		loading = true;
		const res = await getFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/ips/banned`,
			undefined,
			undefined,
			true
		);

		bannedIps = res && res.success ? res.bannedIps : [];
		loading = false;
	}

	async function unbanIp(ip: string) {
		unbanningIp = ip;
		const res = await deleteFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/ips/${encodeURIComponent(ip)}/ban`,
			undefined,
			undefined,
			true
		);

		if (res && res.success) {
			toast("IP unbanned.", undefined, undefined, 2000, "success");
			bannedIps = bannedIps.filter((row) => row.ip !== ip);
		} else {
			toast("Failed to unban IP.", undefined, undefined, 2000, "danger");
		}
		unbanningIp = undefined;
	}

	async function lookupUsersForIp() {
		if (!lookupIp.trim()) return;

		lookupLoading = true;
		lookupDone = false;
		const res = await getFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/ips/${encodeURIComponent(lookupIp.trim())}/users`,
			undefined,
			undefined,
			true
		);

		lookupResults = res && res.success ? res.users : [];
		lookupLoading = false;
		lookupDone = true;
	}
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" alignItems="center" height="fit-content">
			<h2>IP bans</h2>
			<Button
				iconbefore="arrow_back"
				onclick={() => {
					navigateBack("/moderation");
				}}>
				Back
			</Button>
		</Flex>

		<p style="color: {token.theme.color.text.secondary}; margin-bottom: 16px;">
			An IP ban blocks every request from that address across the entire backend - not just this
			one account. Ban an IP from an account's "IPs seen" list on the
			<LinkButton href="/moderation/moderate/accounts">accounts page</LinkButton>.
		</p>

		<div class="action-section">
			<h4>Who else used this IP?</h4>
			<Flex gap="small">
				<TextField bind:value={lookupIp} placeholder="e.g. 203.0.113.42" />
				<Button loading={lookupLoading} onclick={lookupUsersForIp}>Look up</Button>
			</Flex>

			{#if lookupDone}
				<Flex direction="column" gap="xsmall" marginTop="small">
					{#if lookupResults.length === 0}
						<p style="color: {token.theme.color.text.tertiary}; margin: 0;">
							No users have connected from this IP.
						</p>
					{:else}
						{#each lookupResults as u (u.userId)}
							<Flex alignItems="center" gap="small">
								<Avatar size="small" src={u.avatarUrl ?? ""} alt={u.username} />
								<Anchor href="https://account.davidnet.net/profile/{u.username}" target="_blank">
									@{u.username} ({u.displayName})
								</Anchor>
								<span style="font-size: 0.8rem; color: {token.theme.color.text.tertiary}">
									last seen {formatIsoToPreferred(u.lastSeenAt, true)}
								</span>
							</Flex>
						{/each}
					{/if}
				</Flex>
			{/if}
		</div>

		<Divider color="tertiary" />

		<h3>Currently banned IPs</h3>
		<Flex gap="medium" height="fit-content" marginBottom="giant" direction="column">
			{#if loading}
				<Skeleton height="4rem" width="100%" />
				<Skeleton height="4rem" width="100%" />
			{:else if bannedIps.length === 0}
				<Flex
					direction="column"
					alignItems="center"
					justifyContent="center"
					width="100%"
					gap="medium"
					marginTop="medium">
					<Icon icon="wifi_off" size="giant" color="success" />
					<p style="color: {token.theme.color.text.secondary}">No IPs are currently banned.</p>
				</Flex>
			{:else}
				{#each bannedIps as row (row.ip)}
					<div class="violation-row-card">
						<Flex justifyContent="spaceBetween" alignItems="center">
							<Flex direction="column" gap="xsmall">
								<strong>{row.ip}</strong>
								{#if row.reason}
									<span style="font-size: 0.85rem;">{row.reason}</span>
								{/if}
								<span style="font-size: 0.8rem; color: {token.theme.color.text.tertiary}">
									Banned by @{row.moderatorUsername} on {formatIsoToPreferred(row.createdAt, true)}
								</span>
							</Flex>
							<Button
								appearance="subtle"
								loading={unbanningIp === row.ip}
								onclick={() => unbanIp(row.ip)}>
								Unban
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
		margin: 0 0 12px 0;
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
