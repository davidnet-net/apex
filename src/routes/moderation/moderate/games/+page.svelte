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
		Lozenge,
		Modal,
		navigateBack,
		patchFetch,
		postFetch,
		Skeleton,
		TextArea,
		toast,
		whenAuthReady
	} from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";

	interface GameListItem {
		id: string;
		userId: string;
		username: string;
		displayName: string;
		avatarUrl: string | null;
		title: string;
		description: string | null;
		likesCount: number;
		isModerated: boolean;
		isAiGenerated: boolean;
		createdAt: string;
	}

	const PAGE_SIZE = 30;

	let gamesList = $state<GameListItem[]>([]);
	let loading = $state(true);
	let loadingMore = $state(false);
	let hasMore = $state(false);
	let isActioning = $state(false);

	let openGame = $state<GameListItem | undefined>(undefined);
	let violationReason = $state("");

	// This screen only makes sense for support staff (it drives /support/moderation/* endpoints
	// the backend itself gates on internalAccess + supportAccess) - bounce anyone else out to the
	// account domain's access-denied page rather than showing them an empty/broken list.
	let hasModerationAccess = $state(false);

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
		loadGames(0, false);
	});

	async function loadGames(offset: number, append: boolean) {
		if (append) {
			loadingMore = true;
		} else {
			loading = true;
		}

		const res = await getFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/games/all?limit=${PAGE_SIZE}&offset=${offset}`,
			undefined,
			undefined,
			true
		);

		if (res && res.success && res.games) {
			gamesList = append ? [...gamesList, ...res.games] : res.games;
			hasMore = Boolean(res.hasMore);
		} else if (!append) {
			gamesList = [];
			hasMore = false;
		}

		loading = false;
		loadingMore = false;
	}

	async function loadMore() {
		await loadGames(gamesList.length, true);
	}

	function openModal(game: GameListItem) {
		openGame = game;
		violationReason = "";
	}

	async function toggleModeration(hide: boolean) {
		if (!openGame) return;
		isActioning = true;
		const res = await patchFetch(
			`${PUBLIC_BACKEND_URL}/social/community-games/${openGame.id}/moderate`,
			{ isModerated: hide },
			undefined,
			true
		);

		if (res && res.success) {
			openGame.isModerated = hide;
			gamesList = gamesList.map((g) => (g.id === openGame!.id ? { ...g, isModerated: hide } : g));
			toast(hide ? "Game hidden" : "Game unhidden", undefined, undefined, 2000, "success");
		} else {
			toast("Failed to moderate game", undefined, undefined, 2000, "danger");
		}
		isActioning = false;
	}

	// Lets a moderator issue a violation straight from this browser, without first having to find
	// (or wait for) a report against this game.
	async function issueViolation() {
		if (!openGame) return;
		if (!violationReason.trim()) {
			toast("Reason is required.", undefined, undefined, 3000, "warning");
			return;
		}

		isActioning = true;
		const res = await postFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/violations`,
			{
				userId: openGame.userId,
				reportedType: "game",
				reportedId: openGame.id,
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
		isActioning = false;
	}
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" alignItems="center" height="fit-content">
			<h2>All community games</h2>
			<Button
				iconbefore="arrow_back"
				onclick={() => {
					navigateBack("/moderation");
				}}>
				Back
			</Button>
		</Flex>

		<p style="color: {token.theme.color.text.secondary}; margin-bottom: 16px;">
			Every uploaded community game, newest first. Hide a game or issue a violation directly here -
			no open report needed.
		</p>

		<Flex gap="medium" height="fit-content" direction="column">
			{#if loading}
				<Skeleton height="4.5rem" width="100%" />
				<Skeleton height="4.5rem" width="100%" />
				<Skeleton height="4.5rem" width="100%" />
			{:else if gamesList.length === 0}
				<Flex
					direction="column"
					alignItems="center"
					justifyContent="center"
					width="100%"
					gap="medium"
					marginTop="medium">
					<Icon icon="stadia_controller" size="giant" />
					<p style="color: {token.theme.color.text.secondary}">No community games uploaded yet.</p>
				</Flex>
			{:else}
				{#each gamesList as game (game.id)}
					<button class="row-card" onclick={() => openModal(game)}>
						<Flex justifyContent="spaceBetween" alignItems="start" gap="medium">
							<Flex alignItems="center" gap="small" style="min-width: 0;">
								<Avatar size="small" src={game.avatarUrl ?? ""} alt={game.username} />
								<Flex direction="column" gap="xsmall" style="min-width: 0;">
									<strong style="overflow: hidden; text-overflow: ellipsis;">{game.title}</strong>
									<span style="font-size: 0.85rem; color: {token.theme.color.text.tertiary}">
										@{game.username} • {formatIsoToPreferred(game.createdAt, false)}
									</span>
								</Flex>
							</Flex>
							<Flex
								alignItems="center"
								justifyContent="end"
								gap="small"
								flexWrap="wrap"
								height="fit-content"
								style="flex-shrink: 0; width: auto;">
								{#if game.isModerated}
									<Lozenge appearance="danger">Hidden</Lozenge>
								{/if}
								{#if game.isAiGenerated}
									<Lozenge appearance="discover">AI-generated</Lozenge>
								{/if}
								<Lozenge appearance="default">
									<Icon icon="favorite" size="small" />
									{game.likesCount}
								</Lozenge>
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

{#if openGame}
	<Modal title={openGame.title} onclose={() => (openGame = undefined)}>
		<Flex direction="column" gap="medium" width="100%">
			<Flex alignItems="center" gap="small">
				<Avatar size="small" src={openGame.avatarUrl ?? ""} alt={openGame.username} />
				<Anchor href="https://account.davidnet.net/profile/{openGame.username}" target="_blank">
					@{openGame.username} ({openGame.displayName})
				</Anchor>
			</Flex>

			{#if openGame.description}
				<p style="margin: 0; color: {token.theme.color.text.secondary}">{openGame.description}</p>
			{/if}

			<Flex gap="small" flexWrap="wrap">
				<Lozenge appearance={openGame.isModerated ? "danger" : "success"}>
					{openGame.isModerated ? "Hidden" : "Visible"}
				</Lozenge>
				<Lozenge appearance="default">
					<Icon icon="favorite" size="small" />
					{openGame.likesCount} likes
				</Lozenge>
			</Flex>

			<Divider color="tertiary" />

			<Flex direction="column" gap="xsmall">
				<p style="margin: 0;"><strong>Game ID:</strong> {openGame.id}</p>
				<p style="margin: 0;"><strong>Owner User ID:</strong> {openGame.userId}</p>
				<p style="margin: 0;">
					<strong>Uploaded:</strong>
					{formatIsoToPreferred(openGame.createdAt, true)}
				</p>
			</Flex>

			<Divider color="tertiary" />

			<Field label="Issue a violation against this game's creator (optional)" name="violationReason">
				<TextArea bind:value={violationReason} rows={2} placeholder="Reason for the violation..." />
			</Field>
			<Flex gap="small">
				<Button disabled={isActioning} onclick={issueViolation}>Issue violation</Button>
				<LinkButton href="/moderation/moderate/bans?userId={openGame.userId}">Ban user</LinkButton>
			</Flex>
		</Flex>

		{#snippet actions()}
			<Flex gap="small" justifyContent="spaceBetween" width="100%">
				<Button disabled={isActioning} onclick={() => (openGame = undefined)}>Close</Button>
				{#if !openGame.isModerated}
					<Button appearance="danger" disabled={isActioning} onclick={() => toggleModeration(true)}>
						Hide
					</Button>
				{:else}
					<Button appearance="subtle" disabled={isActioning} onclick={() => toggleModeration(false)}>
						Unhide
					</Button>
				{/if}
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
