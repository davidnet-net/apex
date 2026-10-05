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
		getFetch,
		Icon,
		LinkButton,
		Lozenge,
		Modal,
		navigateBack,
		Skeleton,
		whenAuthReady
	} from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";

	interface AccountListItem {
		userId: string;
		username: string;
		displayName: string;
		avatarUrl: string | null;
		email: string;
		countryCode: string | null;
		createdAt: string;
		bannedUntil: string | null;
		reportTrustScore: number | null;
		internalAccess: boolean | null;
		supportAccess: boolean | null;
		developerAccess: boolean | null;
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

	function isCurrentlyBanned(account: AccountListItem): boolean {
		return Boolean(account.bannedUntil && new Date(account.bannedUntil) > new Date());
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
					<button class="row-card" onclick={() => (openAccount = account)}>
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
