<script lang="ts">
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import {
		Anchor,
		authState,
		Avatar,
		Button,
		Divider,
		Flex,
		formatIsoToPreferred,
		Field,
		getFetch,
		Icon,
		LinkButton,
		Lozenge,
		Modal,
		navigateBack,
		postFetch,
		Skeleton,
		TextArea,
		toast,
		whenAuthReady
	} from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";

	interface AccountListItem {
		userId: string;
		username: string;
		displayName: string;
		avatarUrl: string | null;
		email: string;
		emailVerified: boolean;
		countryCode: string | null;
		createdAt: string;
		bannedUntil: string | null;
		reportTrustScore: number | null;
		internalAccess: boolean | null;
		supportAccess: boolean | null;
		developerAccess: boolean | null;
	}

	interface AccountIp {
		ip: string;
		countryCode: string | null;
		userAgent: string | null;
		lastSeenAt: string;
		isBanned: boolean;
	}

	const PAGE_SIZE = 30;

	// This screen only makes sense for support staff (it drives /support/moderation/* endpoints
	// the backend itself gates on internalAccess + supportAccess) - bounce anyone else out to the
	// account domain's access-denied page rather than showing them an empty/broken list.
	let hasModerationAccess = $state(false);

	let accountsList = $state<AccountListItem[]>([]);
	let loading = $state(true);
	let loadingMore = $state(false);
	let hasMore = $state(false);

	let openAccount = $state<AccountListItem | undefined>(undefined);
	let accountIps = $state<AccountIp[]>([]);
	let loadingIps = $state(false);
	let banningIp = $state<string | undefined>(undefined);
	let violationReason = $state("");
	let issuingViolation = $state(false);

	function isCurrentlyBanned(account: AccountListItem): boolean {
		return Boolean(account.bannedUntil && new Date(account.bannedUntil) > new Date());
	}

	async function openAccountModal(account: AccountListItem) {
		openAccount = account;
		accountIps = [];
		violationReason = "";
		loadingIps = true;

		const res = await getFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/users/${account.userId}/ips`,
			undefined,
			undefined,
			true
		);

		if (res && res.success) {
			accountIps = res.ips;
		}

		loadingIps = false;
	}

	async function banIp(ip: string) {
		if (!confirm(`IP-ban ${ip}? This blocks every request from that address across all of Davidnet.`))
			return;

		banningIp = ip;
		const res = await postFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/ips/${encodeURIComponent(ip)}/ban`,
			{},
			undefined,
			true
		);

		if (res && res.success) {
			accountIps = accountIps.map((row) => (row.ip === ip ? { ...row, isBanned: true } : row));
		}

		banningIp = undefined;
	}

	// Lets a moderator issue a violation straight from this browser, without first having to find
	// (or wait for) a report against this profile.
	async function issueViolation() {
		if (!openAccount) return;
		if (!violationReason.trim()) {
			toast("Reason is required.", undefined, undefined, 3000, "warning");
			return;
		}

		issuingViolation = true;
		const res = await postFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/violations`,
			{
				userId: openAccount.userId,
				reportedType: "profile",
				reportedId: openAccount.userId,
				reason: violationReason.trim()
			},
			undefined,
			true
		);

		if (res && res.success) {
			toast("Violation issued.", undefined, undefined, 2000, "success");
			violationReason = "";
		} else {
			toast("Failed to issue violation.", undefined, undefined, 2000, "danger");
		}
		issuingViolation = false;
	}

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
		loadAccounts(0, false);
	});

	async function loadAccounts(offset: number, append: boolean) {
		if (append) {
			loadingMore = true;
		} else {
			loading = true;
		}

		const res = await getFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/accounts/all?limit=${PAGE_SIZE}&offset=${offset}`,
			undefined,
			undefined,
			true
		);

		if (res && res.success && res.accounts) {
			accountsList = append ? [...accountsList, ...res.accounts] : res.accounts;
			hasMore = Boolean(res.hasMore);
		} else if (!append) {
			accountsList = [];
			hasMore = false;
		}

		loading = false;
		loadingMore = false;
	}

	async function loadMore() {
		await loadAccounts(accountsList.length, true);
	}
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" alignItems="center" height="fit-content">
			<h2>All accounts</h2>
			<Button
				iconbefore="arrow_back"
				onclick={() => {
					navigateBack("/moderation");
				}}>
				Back
			</Button>
		</Flex>

		<p style="color: {token.theme.color.text.secondary}; margin-bottom: 16px;">
			Every registered account, newest first.
		</p>

		<Flex gap="medium" height="fit-content" direction="column">
			{#if loading}
				<Skeleton height="4.5rem" width="100%" />
				<Skeleton height="4.5rem" width="100%" />
				<Skeleton height="4.5rem" width="100%" />
			{:else if accountsList.length === 0}
				<Flex
					direction="column"
					alignItems="center"
					justifyContent="center"
					width="100%"
					gap="medium"
					marginTop="medium">
					<Icon icon="group" size="giant" />
					<p style="color: {token.theme.color.text.secondary}">No accounts found.</p>
				</Flex>
			{:else}
				{#each accountsList as account (account.userId)}
					<button class="row-card" onclick={() => openAccountModal(account)}>
						<Flex justifyContent="spaceBetween" alignItems="center" gap="medium">
							<Flex alignItems="center" gap="small" style="min-width: 0;">
								<Avatar size="small" src={account.avatarUrl ?? ""} alt={account.username} />
								<Flex direction="column" gap="xsmall" style="min-width: 0;">
									<strong>@{account.username} ({account.displayName})</strong>
									<span style="font-size: 0.85rem; color: {token.theme.color.text.tertiary}">
										Joined {formatIsoToPreferred(account.createdAt, false)}
									</span>
								</Flex>
							</Flex>
							<Flex alignItems="center" gap="small" height="fit-content" style="flex-shrink: 0;">
								{#if isCurrentlyBanned(account)}
									<Lozenge appearance="danger">Banned</Lozenge>
								{/if}
								{#if account.emailVerified}
									<Lozenge appearance="success">Email verified</Lozenge>
								{:else}
									<Lozenge appearance="warning">Email unverified</Lozenge>
								{/if}
								{#if account.internalAccess}
									<Lozenge appearance="discover">Internal</Lozenge>
								{/if}
							</Flex>
						</Flex>
					</button>
				{/each}

				{#if hasMore}
					<Flex justifyContent="center" marginTop="medium">
						<Button loading={loadingMore} onclick={loadMore}>Load more</Button>
					</Flex>
				{/if}
			{/if}
		</Flex>
	</Flex>
</Flex>

{#if openAccount}
	<Modal
		title={`@${openAccount.username}`}
		onclose={() => {
			openAccount = undefined;
		}}>
		<Flex direction="column" gap="medium" width="100%">
			<Flex alignItems="center" gap="small">
				<Avatar size="medium" src={openAccount.avatarUrl ?? ""} alt={openAccount.username} />
				<Flex direction="column" gap="xsmall">
					<Anchor href="https://account.davidnet.net/profile/{openAccount.username}" target="_blank">
						@{openAccount.username}
					</Anchor>
					<span style="color: {token.theme.color.text.tertiary}">{openAccount.displayName}</span>
				</Flex>
			</Flex>

			<Flex gap="small" flexWrap="wrap">
				{#if isCurrentlyBanned(openAccount)}
					<Lozenge appearance="danger">
						Banned until {formatIsoToPreferred(openAccount.bannedUntil!, true)}
					</Lozenge>
				{:else}
					<Lozenge appearance="success">Not banned</Lozenge>
				{/if}
				{#if openAccount.emailVerified}
					<Lozenge appearance="success">Email verified</Lozenge>
				{:else}
					<Lozenge appearance="warning">Email unverified</Lozenge>
				{/if}
				{#if openAccount.internalAccess}
					<Lozenge appearance="discover">Internal access</Lozenge>
				{/if}
				{#if openAccount.supportAccess}
					<Lozenge appearance="discover">Support access</Lozenge>
				{/if}
				{#if openAccount.developerAccess}
					<Lozenge appearance="discover">Developer access</Lozenge>
				{/if}
			</Flex>

			<Divider color="tertiary" />

			<Flex direction="column" gap="xsmall">
				<p style="margin: 0;">
					<strong>User ID:</strong>
					{openAccount.userId}
				</p>
				<p style="margin: 0;">
					<strong>Email:</strong>
					{openAccount.email}
				</p>
				<p style="margin: 0;">
					<strong>Country:</strong>
					{openAccount.countryCode ?? "Unknown"}
				</p>
				<p style="margin: 0;">
					<strong>Report trust score:</strong>
					{openAccount.reportTrustScore ?? "—"}
				</p>
				<p style="margin: 0;">
					<strong>Account created:</strong>
					{formatIsoToPreferred(openAccount.createdAt, true)}
				</p>
			</Flex>

			<Divider color="tertiary" />

			<Flex direction="column" gap="xsmall">
				<strong>IPs seen</strong>
				{#if loadingIps}
					<Skeleton height="2rem" width="100%" />
				{:else if accountIps.length === 0}
					<span style="color: {token.theme.color.text.tertiary}">No IP history recorded.</span>
				{:else}
					{#each accountIps as row (row.ip)}
						<Flex justifyContent="spaceBetween" alignItems="center" gap="small">
							<Flex direction="column" gap="xsmall" style="min-width: 0;">
								<span>
									{row.ip}
									{#if row.countryCode}({row.countryCode}){/if}
								</span>
								<span style="font-size: 0.8rem; color: {token.theme.color.text.tertiary}">
									Last seen {formatIsoToPreferred(row.lastSeenAt, true)}
								</span>
							</Flex>
							{#if row.isBanned}
								<Lozenge appearance="danger">IP banned</Lozenge>
							{:else}
								<Button
									appearance="danger"
									loading={banningIp === row.ip}
									onclick={() => banIp(row.ip)}>
									Ban IP
								</Button>
							{/if}
						</Flex>
					{/each}
				{/if}
			</Flex>

			<Divider color="tertiary" />

			<Field label="Issue a violation against this profile (optional)" name="violationReason">
				<TextArea bind:value={violationReason} rows={2} placeholder="Reason for the violation..." />
			</Field>
			<Button disabled={issuingViolation} onclick={issueViolation}>Issue violation</Button>
		</Flex>

		{#snippet actions()}
			<Flex gap="small" justifyContent="spaceBetween" width="100%">
				<Button onclick={() => (openAccount = undefined)}>Close</Button>
				<LinkButton href="/moderation/moderate/bans?userId={openAccount.userId}">
					Manage ban
				</LinkButton>
			</Flex>
		{/snippet}
	</Modal>
{/if}

<style>
	.row-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		padding: 12px 16px;
		width: 100%;
		box-sizing: border-box;
		text-align: left;
		cursor: pointer;
		color: inherit;
		font: inherit;
	}

	.row-card:hover {
		background: rgba(255, 255, 255, 0.05);
	}
</style>
