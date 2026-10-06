<script lang="ts">
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import {
		Anchor,
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
		patchFetch,
		postFetch,
		Skeleton,
		TextArea,
		toast,
		whenAuthReady
	} from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";

	interface ShortListItem {
		id: string;
		userId: string;
		username: string;
		displayName: string;
		avatarUrl: string | null;
		title: string;
		videoUrl: string;
		views: number;
		likesCount: number;
		isModerated: boolean;
		createdAt: string;
	}

	const PAGE_SIZE = 30;

	let shortsList = $state<ShortListItem[]>([]);
	let loading = $state(true);
	let loadingMore = $state(false);
	let hasMore = $state(false);
	let isActioning = $state(false);

	let openShort = $state<ShortListItem | undefined>(undefined);
	let violationReason = $state("");

	$effect(() => {
		(async () => {
			await whenAuthReady();
			loadShorts(0, false);
		})();
	});

	async function loadShorts(offset: number, append: boolean) {
		if (append) {
			loadingMore = true;
		} else {
			loading = true;
		}

		const res = await getFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/shorts/all?limit=${PAGE_SIZE}&offset=${offset}`,
			undefined,
			undefined,
			true
		);

		if (res && res.success && res.shorts) {
			shortsList = append ? [...shortsList, ...res.shorts] : res.shorts;
			hasMore = Boolean(res.hasMore);
		} else if (!append) {
			shortsList = [];
			hasMore = false;
		}

		loading = false;
		loadingMore = false;
	}

	async function loadMore() {
		await loadShorts(shortsList.length, true);
	}

	async function toggleModeration(hide: boolean) {
		if (!openShort) return;
		isActioning = true;
		const res = await patchFetch(
			`${PUBLIC_BACKEND_URL}/social/shorts/${openShort.id}/moderate`,
			{ isModerated: hide },
			undefined,
			true
		);

		if (res && res.success) {
			openShort.isModerated = hide;
			shortsList = shortsList.map((s) => (s.id === openShort!.id ? { ...s, isModerated: hide } : s));
			toast(
				hide ? "Short hidden from feed" : "Short unmoderated",
				undefined,
				undefined,
				2000,
				"success"
			);
		} else {
			toast("Failed to moderate short", undefined, undefined, 2000, "danger");
		}
		isActioning = false;
	}

	// Lets a moderator issue a violation straight from this browser, without first having to find
	// (or wait for) a report against this short.
	async function issueViolation() {
		if (!openShort) return;
		if (!violationReason.trim()) {
			toast("Reason is required.", undefined, undefined, 3000, "warning");
			return;
		}

		isActioning = true;
		const res = await postFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/violations`,
			{
				userId: openShort.userId,
				reportedType: "short",
				reportedId: openShort.id,
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
		<h2>All shorts</h2>

		<p style="color: {token.theme.color.text.secondary}; margin-bottom: 16px;">
			Every uploaded short, newest first.
		</p>

		<Flex gap="medium" height="fit-content" direction="column">
			{#if loading}
				<Skeleton height="4.5rem" width="100%" />
				<Skeleton height="4.5rem" width="100%" />
				<Skeleton height="4.5rem" width="100%" />
			{:else if shortsList.length === 0}
				<Flex
					direction="column"
					alignItems="center"
					justifyContent="center"
					width="100%"
					gap="medium"
					marginTop="medium">
					<Icon icon="movie" size="giant" />
					<p style="color: {token.theme.color.text.secondary}">No shorts uploaded yet.</p>
				</Flex>
			{:else}
				{#each shortsList as short (short.id)}
					<button
						class="row-card"
						onclick={() => {
							openShort = short;
							violationReason = "";
						}}>
						<Flex justifyContent="spaceBetween" alignItems="center" gap="medium">
							<Flex alignItems="center" gap="small" style="min-width: 0;">
								<Avatar size="small" src={short.avatarUrl ?? ""} alt={short.username} />
								<Flex direction="column" gap="xsmall" style="min-width: 0;">
									<strong style="overflow: hidden; text-overflow: ellipsis;">
										{short.title}
									</strong>
									<span style="font-size: 0.85rem; color: {token.theme.color.text.tertiary}">
										@{short.username} • {formatIsoToPreferred(short.createdAt, false)}
									</span>
								</Flex>
							</Flex>
							<Flex alignItems="center" gap="small" height="fit-content" style="flex-shrink: 0;">
								{#if short.isModerated}
									<Lozenge appearance="danger">Hidden</Lozenge>
								{/if}
								<Lozenge appearance="default">
									<Icon icon="visibility" size="small" />
									{short.views}
								</Lozenge>
								<Lozenge appearance="default">
									<Icon icon="favorite" size="small" />
									{short.likesCount}
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

{#if openShort}
	<Modal title={openShort.title} onclose={() => (openShort = undefined)}>
		<Flex direction="column" gap="medium" width="100%">
			<div class="media-container">
				<!-- svelte-ignore a11y_media_has_caption -->
				<video src={openShort.videoUrl} controls playsinline class="preview-video"></video>
			</div>

			<Flex alignItems="center" gap="small">
				<Avatar size="small" src={openShort.avatarUrl ?? ""} alt={openShort.username} />
				<Anchor href="https://account.davidnet.net/profile/{openShort.username}" target="_blank">
					@{openShort.username} ({openShort.displayName})
				</Anchor>
			</Flex>

			<Flex gap="small" flexWrap="wrap">
				<Lozenge appearance={openShort.isModerated ? "danger" : "success"}>
					{openShort.isModerated ? "Hidden from feed" : "Visible on feed"}
				</Lozenge>
				<Lozenge appearance="default">
					<Icon icon="visibility" size="small" />
					{openShort.views} views
				</Lozenge>
				<Lozenge appearance="default">
					<Icon icon="favorite" size="small" />
					{openShort.likesCount} likes
				</Lozenge>
			</Flex>

			<Divider color="tertiary" />

			<Flex direction="column" gap="xsmall">
				<p style="margin: 0;">
					<strong>Short ID:</strong>
					{openShort.id}
				</p>
				<p style="margin: 0;">
					<strong>Owner User ID:</strong>
					{openShort.userId}
				</p>
				<p style="margin: 0;">
					<strong>Uploaded:</strong>
					{formatIsoToPreferred(openShort.createdAt, true)}
				</p>
			</Flex>

			<Divider color="tertiary" />

			<Field label="Issue a violation against this short's creator (optional)" name="violationReason">
				<TextArea bind:value={violationReason} rows={2} placeholder="Reason for the violation..." />
			</Field>
			<Flex gap="small">
				<Button disabled={isActioning} onclick={issueViolation}>Issue violation</Button>
				<LinkButton href="/moderation/moderate/bans?userId={openShort.userId}">Ban user</LinkButton>
			</Flex>
		</Flex>

		{#snippet actions()}
			<Flex gap="small" justifyContent="spaceBetween" width="100%">
				<Button disabled={isActioning} onclick={() => (openShort = undefined)}>Close</Button>
				{#if !openShort.isModerated}
					<Button appearance="danger" disabled={isActioning} onclick={() => toggleModeration(true)}>
						Hide from feed
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

	.media-container {
		position: relative;
		width: 100%;
		height: 380px;
		border-radius: 8px;
		overflow: hidden;
		background: #000;
		border: 1px solid rgba(255, 255, 255, 0.12);
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.preview-video {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
</style>
