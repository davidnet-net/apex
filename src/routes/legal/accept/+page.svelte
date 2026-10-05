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
		toast,
		Icon
	} from "@davidnet-net/svelte-ui";
	import * as m from "$lib/paraglide/messages.js";

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
					m.page_legal_accept_toast_fail_title(),
					m.page_legal_accept_toast_fail_content(),
					"error",
					4000,
					"danger"
				);
			}
		} catch (err) {
			console.error("Acceptance error:", err);
			toast(
				m.common_error_title(),
				m.page_legal_accept_toast_error_content(),
				"error",
				4000,
				"danger"
			);
		} finally {
			accepting = false;
		}
	}
</script>

<!-- Use full viewport height centering so it sits dead-center -->
<Flex alignItems="center" justifyContent="center" style="min-height: calc(100vh - 100px);">
	<Flex
		width="100%"
		style="max-width: 600px;"
		height="fit-content"
		direction="column"
		gap="medium"
		justifyContent="center"
		alignItems="center"
		text="center">
		{#if checking}
			<p>{m.page_legal_accept_checking()}</p>
		{:else}
			<Icon icon="policy_alert" size="giant" />
			<h2>{m.page_legal_accept_heading()}</h2>

			<p
				style="margin-top: 0.5rem; margin-bottom: 1rem; color: var(--text-color-secondary, #999); text-align: center; line-height: 1.5;">
				{m.page_legal_accept_body()}
				<br />
				<br />
				{m.page_legal_accept_body2()}
			</p>

			<Flex width="fit-content" height="fit-content" gap="small" wrap>
				<LinkButton href="https://account.davidnet.net/manage/data">{m.page_legal_accept_manage_data_button()}</LinkButton>
				<LinkButton href="/legal" opennewtab>{m.page_legal_accept_view_policies_button()}</LinkButton>
				<Button onclick={handleAccept} appearance="primary" loading={accepting}>
					{m.page_legal_accept_agree_button()}
				</Button>
			</Flex>
		{/if}
	</Flex>
</Flex>
