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
		Icon,
		Link,
		Modal,
		navigateBack,
		Skeleton,
		whenAuthReady,
		type iconType
	} from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";
	import HorizontalCard from "$lib/components/HorizontalCard/HorizontalCard.svelte";
	import type { UserViolation } from "$lib/moderationTypes";

	let myViolations = $state<UserViolation[]>([]);
	let loading = $state(true);
	let openViolation = $state<UserViolation | undefined>(undefined);

	$effect(() => {
		(async () => {
			await whenAuthReady();
			if (!authState.isLoggedIn && !authState.loading) {
				return;
			}

			loadData();
		})();
	});

	async function loadData() {
		if (!authState.isLoggedIn && !authState.loading) {
			return;
		}

		const res = await getFetch(
			PUBLIC_BACKEND_URL + "/support/moderation/violations/me",
			undefined,
			undefined,
			true
		);

		if (res && res.violations) {
			myViolations = res.violations;
		} else if (Array.isArray(res)) {
			myViolations = res;
		}

		loading = false;
	}

	onMount(() => {
		const handleVisibilityChange = async () => {
			if (document.visibilityState === "visible") {
				await loadData();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
	});
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" height="fit-content">
			<h2>Account Violations</h2>
			<Button
				iconbefore="arrow_back"
				onclick={() => {
					navigateBack("/moderation");
				}}>
				Back
			</Button>
		</Flex>
		<Flex gap="medium" height="fit-content" marginBottom="giant" flexWrap="wrap">
			{#if loading}
				<Skeleton height="4rem" width="18rem" />
				<Skeleton height="4rem" width="18rem" />
				<Skeleton height="4rem" width="18rem" />
				<Skeleton height="4rem" width="18rem" />
			{:else if myViolations.length === 0}
				<Flex
					direction="column"
					alignItems="center"
					justifyContent="center"
					width="100%"
					marginTop="medium">
					<Icon icon="verified" size="giant" color="success" />
					<p style="color: {token.theme.color.text.secondary}">
						Your account has a clean record. No violations found.
					</p>
				</Flex>
			{:else}
				{#each myViolations as violation (violation.id)}
					<HorizontalCard
						icon={"gavel" as iconType}
						onclick={() => {
							openViolation = violation;
						}}
						title={`Violation: ${violation.reportedType}`}
						description={`Issued ${formatIsoToPreferred(violation.createdAt, true)}`} />
				{/each}
			{/if}
		</Flex>
	</Flex>
</Flex>

{#if openViolation}
	<Modal
		title="Violation Details"
		onclose={() => {
			openViolation = undefined;
		}}>
		<Flex direction="column" gap="medium" width="100%">
			<!-- Status Badge Header -->
			<Flex alignItems="center" gap="small" height="fit-content">
				<Icon icon={"gavel" as iconType} color="danger" />
				<span style="color: {token.theme.color.text.danger}">Action Taken</span>
			</Flex>

			<!-- Violation Details List -->
			<Flex height="fit-content" gap="small" direction="column">
				<p>
					<strong>Violation ID:</strong>
					<span>{openViolation.id}</span>
				</p>
				<p>
					<strong>Type:</strong>
					{openViolation.reportedType}
				</p>
				<p>
					<strong>Target Content ID:</strong>
					<span>{openViolation.reportedId}</span>
				</p>
				<p>
					{#if openViolation.reportedType === "short"}
						<span>
							<strong>Affected Content:</strong>
							<Link opennewtab href="https://social.davidnet.net/shorts/{openViolation.reportedId}">
								View content
							</Link>
						</span>
					{:else if openViolation.reportedType === "profile"}
						<span>
							<strong>Affected Content:</strong>
							<Link
								opennewtab
								href="https://account.davidnet.net/profile/{openViolation.reportedId}">
								View profile
							</Link>
						</span>
					{/if}
				</p>
				<p>
					<strong>Date Issued:</strong>
					{formatIsoToPreferred(openViolation.createdAt, true)}
				</p>

				<Divider color="tertiary" />

				<p><strong>Reason:</strong></p>
				<div>
					{openViolation.reason}
				</div>

				{#if openViolation.moderatorReason}
					<Divider color="tertiary" />
					<p><strong>Moderator Note:</strong></p>
					<div>
						{openViolation.moderatorReason}
					</div>
				{/if}
			</Flex>
		</Flex>

		{#snippet actions()}
			<Button
				appearance="primary"
				onclick={() => {
					openViolation = undefined;
				}}>
				Close
			</Button>
		{/snippet}
	</Modal>
{/if}
