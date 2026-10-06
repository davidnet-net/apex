<script lang="ts">
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import {
		Anchor,
		authState,
		Avatar,
		Button,
		deleteFetch,
		Field,
		Flex,
		formatIsoToPreferred,
		getFetch,
		Icon,
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

	let editingViolation = $state<any | undefined>(undefined);
	let editReason = $state("");
	let editModeratorReason = $state("");
	let savingEdit = $state(false);
	let deletingId = $state<string | undefined>(undefined);

	function openEdit(violation: any) {
		editingViolation = violation;
		editReason = violation.reason;
		editModeratorReason = violation.moderatorReason ?? "";
	}

	async function saveEdit() {
		if (!editingViolation) return;
		if (!editReason.trim()) {
			toast("Reason can't be empty.", undefined, undefined, 3000, "warning");
			return;
		}

		savingEdit = true;
		const res = await patchFetch(
			`${PUBLIC_BACKEND_URL}/support/moderation/violations/${editingViolation.id}`,
			{ reason: editReason.trim(), moderatorReason: editModeratorReason.trim() || null },
			undefined,
			true
		);

		if (res && res.success) {
			toast("Violation updated.", undefined, undefined, 2000, "success");
			editingViolation = undefined;
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
					<p style="color: {token.theme.color.text.secondary}">{m.page_platform_violations_empty()}</p>
				</Flex>
			{:else}
				{#each violationsList as violation (violation.id)}
					<div class="violation-row-card">
						<Flex justifyContent="spaceBetween" alignItems="center" marginBottom="small">
							<Flex alignItems="center" gap="small">
								<Avatar size="small" src={violation.avatarUrl ?? ""} alt={violation.username} />
								<Anchor
									href="https://account.davidnet.net/profile/{violation.username}"
									target="_blank">
									@{violation.username} ({violation.displayName})
								</Anchor>
							</Flex>
							<span style="font-size: 0.85rem; opacity: 0.7;">
								{formatIsoToPreferred(violation.createdAt, true)}
							</span>
						</Flex>
						<p style="margin: 4px 0; font-size: 0.85rem; opacity: 0.6;">
							<strong>{m.page_platform_violations_violation_id_label()}</strong>
							{violation.id} |
							<strong>{m.common_user_id_label({ id: violation.userId })}</strong>
						</p>
						<p style="margin: 4px 0; font-size: 0.9rem;">
							<strong>{m.common_label_type()}</strong>
							{violation.reportedType.toUpperCase()} |
							<strong>{m.page_platform_violations_target_id_label()}</strong>
							{violation.reportedId}
						</p>
						<p style="margin: 4px 0; font-size: 0.9rem;">
							<strong>{m.common_label_reason()}</strong>
							{violation.reason}
						</p>
						{#if violation.moderatorReason}
							<p style="margin: 4px 0 0 0; font-size: 0.9rem; color: #ffb74d;">
								<strong>{m.page_platform_violations_mod_note_label()}</strong>
								{violation.moderatorReason}
							</p>
						{/if}
						<Flex gap="small" marginTop="small" justifyContent="end">
							<Button onclick={() => openEdit(violation)}>Edit</Button>
							<Button
								appearance="danger"
								loading={deletingId === violation.id}
								onclick={() => deleteViolation(violation.id)}>
								Delete
							</Button>
						</Flex>
					</div>
				{/each}
			{/if}
		</Flex>
	</Flex>
</Flex>

{#if editingViolation}
	<Modal
		title="Edit violation"
		onclose={() => {
			editingViolation = undefined;
		}}>
		<Flex direction="column" gap="medium" width="100%">
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
						editingViolation = undefined;
					}}>
					Cancel
				</Button>
				<Button appearance="danger" loading={savingEdit} onclick={saveEdit}>Save</Button>
			</Flex>
		{/snippet}
	</Modal>
{/if}

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
