<script lang="ts">
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import {
		Anchor,
		authState,
		Avatar,
		Button,
		deleteFetch,
		Divider,
		Field,
		Flex,
		formatIsoToPreferred,
		getFetch,
		Icon,
		Lozenge,
		Modal,
		navigateBack,
		patchFetch,
		Skeleton,
		TextArea,
		toast,
		whenAuthReady
	} from "@davidnet-net/svelte-ui";

	import { token } from "@davidnet-net/svelte-ui/tokens";
	import * as m from "$lib/paraglide/messages.js";

	let violationsList = $state<any[]>([]);
	let loading = $state(true);

	let openViolation = $state<any | undefined>(undefined);
	let editReason = $state("");
	let editModeratorReason = $state("");
	let savingEdit = $state(false);
	let deletingId = $state<string | undefined>(undefined);

	function openDetails(violation: any) {
		openViolation = violation;
		editReason = violation.reason;
		editModeratorReason = violation.moderatorReason ?? "";
	}

	async function saveEdit() {
		if (!openViolation) return;
		if (!editReason.trim()) {
			toast("Reason can't be empty.", undefined, undefined, 3000, "warning");
			return;
		}

		savingEdit = true;
		const res = await patchFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/violations/${openViolation.id}`,
			{ reason: editReason.trim(), moderatorReason: editModeratorReason.trim() || null },
			undefined,
			true
		);

		if (res && res.success) {
			toast("Violation updated.", undefined, undefined, 2000, "success");
			openViolation = {
				...openViolation,
				reason: editReason.trim(),
				moderatorReason: editModeratorReason.trim() || null
			};
			await loadAllViolations();
		} else {
			toast("Failed to update violation.", undefined, undefined, 2000, "danger");
		}
		savingEdit = false;
	}

	async function deleteViolation(id: string) {
		if (!confirm("Delete this violation? This removes it from the user's record permanently.")) return;

		deletingId = id;
		const res = await deleteFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/violations/${id}`,
			undefined,
			undefined,
			true
		);

		if (res && res.success) {
			toast("Violation deleted.", undefined, undefined, 2000, "success");
			violationsList = violationsList.filter((v) => v.id !== id);
			openViolation = undefined;
		} else {
			toast("Failed to delete violation.", undefined, undefined, 2000, "danger");
		}
		deletingId = undefined;
	}

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
		loadAllViolations();
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
			<h2>{m.page_platform_violations_heading()}</h2>
			<Button
				iconbefore="arrow_back"
				onclick={() => {
					navigateBack("/moderation");
				}}>
				{m.common_back()}
			</Button>
		</Flex>

		<p style="color: {token.theme.color.text.secondary}; margin-bottom: 16px;">
			{m.page_platform_violations_description()}
		</p>

		<Flex gap="medium" height="fit-content" direction="column">
			{#if loading}
				<Skeleton height="4.5rem" width="100%" />
				<Skeleton height="4.5rem" width="100%" />
				<Skeleton height="4.5rem" width="100%" />
			{:else if violationsList.length === 0}
				<Flex
					direction="column"
					alignItems="center"
					justifyContent="center"
					width="100%"
					gap="medium"
					marginTop="medium">
					<Icon icon="verified" size="giant" color="success" />
					<p style="color: {token.theme.color.text.secondary}">{m.page_platform_violations_empty()}</p>
				</Flex>
			{:else}
				{#each violationsList as violation (violation.id)}
					<button class="row-card" onclick={() => openDetails(violation)}>
						<Flex justifyContent="spaceBetween" alignItems="start" gap="medium">
							<Flex alignItems="center" gap="small" style="min-width: 0;">
								<Avatar size="small" src={violation.avatarUrl ?? ""} alt={violation.username} />
								<Flex direction="column" gap="xsmall" style="min-width: 0;">
									<strong style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
										@{violation.username} ({violation.displayName})
									</strong>
									<span
										style="font-size: 0.85rem; color: {token.theme.color.text
											.tertiary}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
										{violation.reason}
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
								<Lozenge appearance="default">{violation.reportedType.toUpperCase()}</Lozenge>
								<span style="font-size: 0.8rem; color: {token.theme.color.text.tertiary}">
									{formatIsoToPreferred(violation.createdAt, false)}
								</span>
							</Flex>
						</Flex>
					</button>
				{/each}
			{/if}
		</Flex>
	</Flex>
</Flex>

{#if openViolation}
	<Modal
		title={`[${openViolation.reportedType.toUpperCase()}] @${openViolation.username}`}
		onclose={() => {
			openViolation = undefined;
		}}>
		<Flex direction="column" gap="medium" width="100%">
			<Flex alignItems="center" gap="small">
				<Avatar size="medium" src={openViolation.avatarUrl ?? ""} alt={openViolation.username} />
				<Flex direction="column" gap="xsmall">
					<Anchor href="https://account.davidnet.net/profile/{openViolation.username}" target="_blank">
						@{openViolation.username}
					</Anchor>
					<span style="color: {token.theme.color.text.tertiary}">{openViolation.displayName}</span>
				</Flex>
			</Flex>

			<Divider color="tertiary" />

			<Flex direction="column" gap="xsmall">
				<p style="margin: 0;"><strong>Violation ID:</strong> {openViolation.id}</p>
				<p style="margin: 0;"><strong>User ID:</strong> {openViolation.userId}</p>
				<p style="margin: 0;"><strong>Target ID:</strong> {openViolation.reportedId}</p>
				<p style="margin: 0;">
					<strong>Issued:</strong>
					{formatIsoToPreferred(openViolation.createdAt, true)}
				</p>
			</Flex>

			<Divider color="tertiary" />

			<Field label="Reason" name="editReason" required>
				<TextArea bind:value={editReason} rows={3} />
			</Field>
			<Field label="Moderator note (optional)" name="editModeratorReason">
				<TextArea bind:value={editModeratorReason} rows={3} />
			</Field>
		</Flex>

		{#snippet actions()}
			<Flex gap="small" justifyContent="spaceBetween" width="100%">
				<Button
					onclick={() => {
						openViolation = undefined;
					}}>
					Close
				</Button>
				<Flex gap="small" width="fit-content">
					<Button
						appearance="danger"
						loading={deletingId === openViolation.id}
						onclick={() => deleteViolation(openViolation.id)}>
						Delete
					</Button>
					<Button appearance="primary" loading={savingEdit} onclick={saveEdit}>Save</Button>
				</Flex>
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
