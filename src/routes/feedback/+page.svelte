<script lang="ts">
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import {
		Anchor,
		authState,
		Avatar,
		Button,
		CodeSnippet,
		Divider,
		Flex,
		formatIsoToPreferred,
		getFetch,
		Icon,
		Modal,
		navigateBack,
		Skeleton,
		Tab,
		TabPanel,
		Tabs,
		whenAuthReady
	} from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";
	import HorizontalCard from "$lib/components/HorizontalCard/HorizontalCard.svelte";

	// Mirrors the data shape submitted by svelte-ui's Feedback.svelte widget
	// (lib_internal/Feedback/Feedback.svelte) - keep these two in sync if that ever changes.
	interface FeedbackData {
		message: string;
		appState: unknown;
		DDS_INFO: unknown;
		safeIdentity: unknown;
		referrer: string;
		authState: unknown;
		timestamp: string;
		URL: string;
		userAgent: string;
		viewport: { width: number; height: number; pixelRatio: number };
	}

	interface FeedbackEntry {
		feedbackId: string;
		userId: string;
		data: FeedbackData;
		username: string | null;
		displayName: string | null;
		avatarUrl: string | null;
	}

	// This screen only makes sense for support staff (the /help hub only links here from its
	// supportAccess-gated "Internal" section) - bounce anyone else out to the account domain's
	// access-denied page rather than showing them an empty/broken screen.
	let hasModerationAccess = $state(false);

	let feedbackList = $state<FeedbackEntry[]>([]);
	let loading = $state(true);

	let openFeedback = $state<FeedbackEntry | undefined>(undefined);
	let modalTab = $state<"overview" | "technical">("overview");

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
		loadFeedback();
	});

	async function loadFeedback() {
		loading = true;
		const res = await getFetch(
			`${PUBLIC_BACKEND_URL}/support/send-feedback/all`,
			undefined,
			undefined,
			true
		);

		if (res && res.success && res.feedback) {
			feedbackList = res.feedback;
		} else {
			feedbackList = [];
		}
		loading = false;
	}

	function openEntry(entry: FeedbackEntry) {
		openFeedback = entry;
		modalTab = "overview";
	}

	function previewOf(message: string): string {
		if (message.length <= 80) return message;
		return message.slice(0, 80).trimEnd() + "...";
	}

	function stringify(value: unknown): string {
		try {
			return JSON.stringify(value, null, 2) ?? "null";
		} catch {
			return String(value);
		}
	}
</script>

{#if hasModerationAccess}
	{#if openFeedback}
		<Modal
			title={`Feedback from @${openFeedback.username ?? "deleted-user"}`}
			onclose={() => (openFeedback = undefined)}>
			<Tabs bind:selected={modalTab}>
				<Flex
					gap="small"
					marginBottom="medium"
					style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
					<Tab value="overview">Overview</Tab>
					<Tab value="technical">Technical details</Tab>
				</Flex>

				<TabPanel value="overview">
					<Flex direction="column" gap="medium" width="100%">
						<Flex alignItems="center" gap="small">
							<Avatar
								size="small"
								src={openFeedback.avatarUrl ?? ""}
								alt={openFeedback.username ?? "deleted user"} />
							{#if openFeedback.username}
								<Anchor
									href="https://account.davidnet.net/profile/{openFeedback.username}"
									target="_blank">
									@{openFeedback.username}
									{#if openFeedback.displayName}
										({openFeedback.displayName})
									{/if}
								</Anchor>
							{:else}
								<span style="color: {token.theme.color.text.tertiary}">
									Deleted user ({openFeedback.userId})
								</span>
							{/if}
						</Flex>

						<p style="color: {token.theme.color.text.tertiary}; margin: 0;">
							Submitted {formatIsoToPreferred(openFeedback.data.timestamp, true)}
						</p>

						<Divider color="tertiary" />

						<div
							style="background: rgba(255,255,255,0.05); border-radius: 6px; padding: 12px; white-space: pre-wrap; word-break: break-word; font-size: 0.95rem; line-height: 1.5;">
							{openFeedback.data.message}
						</div>

						<Flex direction="column" gap="xsmall">
							<span style="color: {token.theme.color.text.tertiary}; font-size: 0.85rem;">
								Page URL
							</span>
							<Anchor href={openFeedback.data.URL} target="_blank">
								{openFeedback.data.URL}
							</Anchor>
						</Flex>

						{#if openFeedback.data.referrer}
							<Flex direction="column" gap="xsmall">
								<span style="color: {token.theme.color.text.tertiary}; font-size: 0.85rem;">
									Referrer
								</span>
								<span style="word-break: break-all;">{openFeedback.data.referrer}</span>
							</Flex>
						{/if}
					</Flex>
				</TabPanel>

				<TabPanel value="technical">
					<Flex direction="column" gap="large" width="100%">
						<Flex direction="column" gap="small">
							<h4 style="margin: 0;">Browser & viewport</h4>
							<Flex direction="column" gap="xsmall">
								<span style="color: {token.theme.color.text.tertiary}; font-size: 0.85rem;">
									User agent
								</span>
								<span style="word-break: break-all; font-family: monospace; font-size: 0.85rem;">
									{openFeedback.data.userAgent}
								</span>
							</Flex>
							<Flex direction="column" gap="xsmall">
								<span style="color: {token.theme.color.text.tertiary}; font-size: 0.85rem;">
									Viewport
								</span>
								<span>
									{openFeedback.data.viewport.width} x {openFeedback.data.viewport.height}
									(pixel ratio {openFeedback.data.viewport.pixelRatio})
								</span>
							</Flex>
						</Flex>

						<Flex direction="column" gap="small">
							<h4 style="margin: 0;">Build info</h4>
							<div class="json-box">
								<CodeSnippet
									code={stringify(openFeedback.data.DDS_INFO)}
									language="json"
									cancopy={false} />
							</div>
						</Flex>

						<Flex direction="column" gap="small">
							<h4 style="margin: 0;">App state snapshot</h4>
							<div class="json-box">
								<CodeSnippet
									code={stringify(openFeedback.data.appState)}
									language="json"
									cancopy={false} />
							</div>
						</Flex>

						<Flex direction="column" gap="small">
							<h4 style="margin: 0;">Auth state snapshot</h4>
							<div class="json-box">
								<CodeSnippet
									code={stringify(openFeedback.data.authState)}
									language="json"
									cancopy={false} />
							</div>
						</Flex>

						<Flex direction="column" gap="small">
							<h4 style="margin: 0;">Identity snapshot</h4>
							<p style="font-size: 0.85em; opacity: 0.7; margin: 0;">
								Token raw value is already stripped before submission - this is everything else
								the client had in identity state.
							</p>
							<div class="json-box">
								<CodeSnippet
									code={stringify(openFeedback.data.safeIdentity)}
									language="json"
									cancopy={false} />
							</div>
						</Flex>
					</Flex>
				</TabPanel>
			</Tabs>

			{#snippet actions()}
				<Flex justifyContent="end">
					<Button onclick={() => (openFeedback = undefined)}>Close</Button>
				</Flex>
			{/snippet}
		</Modal>
	{/if}

	<Flex alignItems="center" marginTop="giant" direction="column">
		<Flex width="90%" marginTop="giant" direction="column" gap="small">
			<Flex justifyContent="spaceBetween" alignItems="center" height="fit-content">
				<h2>Feedback</h2>
				<Button
					iconbefore="arrow_back"
					onclick={() => {
						navigateBack("/help");
					}}>
					Back
				</Button>
			</Flex>

			<p style="color: {token.theme.color.text.secondary}; margin-bottom: 16px;">
				Feedback submitted by users across the platform, newest first.
			</p>

			<Flex gap="medium" height="fit-content" marginBottom="giant" flexWrap="wrap">
				{#if loading}
					<Skeleton height="4rem" width="18rem" />
					<Skeleton height="4rem" width="18rem" />
					<Skeleton height="4rem" width="18rem" />
				{:else if feedbackList.length === 0}
					<Flex
						direction="column"
						alignItems="center"
						justifyContent="center"
						width="100%"
						gap="medium"
						marginTop="medium">
						<Icon icon="verified" size="giant" color="success" />
						<p style="color: {token.theme.color.text.secondary}">No feedback submitted yet.</p>
					</Flex>
				{:else}
					{#each feedbackList as entry (entry.feedbackId)}
						<div class="card-item">
							<HorizontalCard
								icon="feedback"
								onclick={() => openEntry(entry)}
								title={`@${entry.username ?? "deleted-user"}`}
								description={`${previewOf(entry.data.message)} • ${formatIsoToPreferred(entry.data.timestamp, false)}`} />
						</div>
					{/each}
				{/if}
			</Flex>
		</Flex>
	</Flex>
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

	.json-box {
		max-height: 300px;
		overflow-y: auto;
		border-radius: 8px;
	}
</style>
