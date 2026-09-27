<script lang="ts">
	import { page } from "$app/state";
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import {
		Button,
		Flex,
		LinkButton,
		postFetch,
		getFetch,
		sleep,
		toast
	} from "@davidnet-net/svelte-ui";

	let accepting = $state(false);
	let checking = $state(true);

	$effect(() => {
		checkStatus();
	});

	async function checkStatus() {
		try {
			const res = await getFetch(PUBLIC_BACKEND_URL + "/legal/status", undefined, undefined, true);
			if (res && res.success && !res.needsAcceptance) {
				const continueUrl = page.url.searchParams.get("continue") || "/";
				window.location.href = continueUrl;
			}
		} catch (err) {
			console.error("Failed to check legal status:", err);
		} finally {
			checking = false;
		}
	}

	async function handleAccept() {
		accepting = true;

		try {
			const res = await postFetch(PUBLIC_BACKEND_URL + "/legal/accept", {}, undefined, true);

			if (res && res.success) {
				await sleep(2000);
				const continueUrl = page.url.searchParams.get("continue") || "/";
				window.location.href = continueUrl;
			} else {
				toast(
					"Action Failed",
					"Something went wrong while accepting the terms.",
					"error",
					4000,
					"danger"
				);
			}
		} catch (err) {
			console.error("Acceptance error:", err);
			toast("Error", "Could not process your acceptance.", "error", 4000, "danger");
		} finally {
			accepting = false;
		}
	}
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex
		width="90%"
		marginTop="giant"
		direction="column"
		gap="small"
		alignItems="center"
		justifyContent="center">
		{#if checking}
			<p>Checking status...</p>
		{:else}
			<h2>Accept new legal policies</h2>
			<LinkButton href="/legal" opennewtab>View policies</LinkButton>

			<p
				style="margin-top: 1rem; margin-bottom: 1.5rem; color: var(--text-color-secondary, #666); text-align: center;">
				Our legal policies have been updated. Please review the revised policies via the button
				above and agree to continue using Davidnet. You can also instead download and/or delete your
				data and stop using Davidnet using the button "Manage your data".
			</p>

			<Flex width="fit-content" marginTop="medium" height="fit-content" gap="small">
				<Button onclick={handleAccept} appearance="primary" loading={accepting}>
					I understand and agree the policies
				</Button>
				<LinkButton href="https://account.davidnet.net/manage/data">Manage your data</LinkButton>
			</Flex>
		{/if}
	</Flex>
</Flex>
