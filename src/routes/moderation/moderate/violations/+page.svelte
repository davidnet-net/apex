<script lang="ts">
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import {
		authState,
		Button,
		Flex,
		formatIsoToPreferred,
		getFetch,
		Icon,
		navigateBack,
		Skeleton,
		whenAuthReady
	} from "@davidnet-net/svelte-ui";

	import { token } from "@davidnet-net/svelte-ui/tokens";

	let violationsList = $state<any[]>([]);
	let loading = $state(true);

	$effect(() => {
		(async () => {
			await whenAuthReady();
			if (!authState.isLoggedIn && !authState.loading) return;
			loadAllViolations();
		})();
	});

	async function loadAllViolations() {
		loading = true;
		const res = await getFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/violations/all`,
			undefined,
			undefined,
			true
		);

		if (res && res.success && res.violations) {
			violationsList = res.violations;
		} else {
			violationsList = [];
		}
		loading = false;
	}
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" alignItems="center" height="fit-content">
			<h2>Platform Violation History</h2>
			<Button
				iconbefore="arrow_back"
				onclick={() => {
					navigateBack("/moderation");
				}}>
				Back
			</Button>
		</Flex>

		<p style="color: {token.theme.color.text.secondary}; margin-bottom: 16px;">
			Overview of all violation strikes issued across all user accounts.
		</p>

		<Flex gap="medium" height="fit-content" marginBottom="giant" flexWrap="wrap" direction="column">
			{#if loading}
				<Skeleton height="5rem" width="100%" />
				<Skeleton height="5rem" width="100%" />
				<Skeleton height="5rem" width="100%" />
			{:else if violationsList.length === 0}
				<Flex
					direction="column"
					alignItems="center"
					justifyContent="center"
					width="100%"
					gap="medium"
					marginTop="medium">
					<Icon icon="verified" size="giant" color="success" />
					<p style="color: {token.theme.color.text.secondary}">No violations.</p>
				</Flex>
			{:else}
				{#each violationsList as violation (violation.id)}
					<div class="violation-row-card">
						<Flex justifyContent="spaceBetween" alignItems="center" marginBottom="small">
							<strong>User ID: {violation.userId}</strong>
							<span style="font-size: 0.85rem; opacity: 0.7;">
								{formatIsoToPreferred(violation.createdAt, true)}
							</span>
						</Flex>
						<p style="margin: 4px 0; font-size: 0.9rem;">
							<strong>Type:</strong>
							{violation.reportedType.toUpperCase()} |
							<strong>Target ID:</strong>
							{violation.reportedId}
						</p>
						<p style="margin: 4px 0; font-size: 0.9rem;">
							<strong>Reason:</strong>
							{violation.reason}
						</p>
						{#if violation.moderatorReason}
							<p style="margin: 4px 0 0 0; font-size: 0.9rem; color: #ffb74d;">
								<strong>Mod Note:</strong>
								{violation.moderatorReason}
							</p>
						{/if}
					</div>
				{/each}
			{/if}
		</Flex>
	</Flex>
</Flex>

<style>
	.violation-row-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		padding: 16px;
		width: 100%;
		box-sizing: border-box;
	}
</style>
