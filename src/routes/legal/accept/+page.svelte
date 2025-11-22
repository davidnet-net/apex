<script lang="ts">
	import { onMount } from "svelte";
	import {
		FlexWrapper,
		Space,
		Button,
		Loader,
		getSessionInfo,
		isAuthenticated,
		refreshAccessToken,
		toast,
		authFetch,
		LinkButton,
		Icon
	} from "@davidnet/svelte-ui";
	import type { SessionInfo } from "$lib/types";
	import { authapiurl } from "$lib/config";

	let sessionInfo: SessionInfo | null = null;
	let loadingSession = true;
	let accepting = false;
	let accepted = false;
	let showAcceptedScreen = false;
	let correlationID = crypto.randomUUID();

	// Fetch session and policy status
	onMount(async () => {
		try {
			await refreshAccessToken(correlationID, false, true);

			const si = await getSessionInfo(correlationID);
			if (!si || !(await isAuthenticated(correlationID))) {
				toast({
					title: "Login Required",
					desc: "You must be logged in to accept policies.",
					icon: "crisis_alert",
					appearance: "danger",
					position: "bottom-left",
					autoDismiss: 5000
				});
				setTimeout(() => {
					window.location.href = `https://account.davidnet.net/login?redirect=${encodeURIComponent(
						"https://davidnet.net/legal/accept"
					)}`;
				}, 500);
				return;
			}

			sessionInfo = si;

			const res = await authFetch(authapiurl + "policy/check", correlationID);
			if (!res.ok) throw new Error("Failed to check policy status");
			const data = await res.json();
			accepted = data.accepted ?? false;
			showAcceptedScreen = accepted;
		} catch (err) {
			console.error(err);
			toast({
				title: "Error",
				desc: "Failed to load session info.",
				icon: "crisis_alert",
				appearance: "danger",
				position: "bottom-left",
				autoDismiss: 5000
			});
			setTimeout(() => {
				window.location.href = `https://account.davidnet.net/login?redirect=${encodeURIComponent(
					"https://davidnet.net/legal/accept"
				)}`;
			}, 500);
		} finally {
			loadingSession = false;
		}
	});

	// Accept policy
	async function acceptPolicy() {
		if (!sessionInfo) return;
		accepting = true;

		try {
			const res = await authFetch(authapiurl + "policy/accept", correlationID, {
				method: "POST",
				headers: { "Content-Type": "application/json" }
			});
			const data = await res.json();

			if (data.success) {
				accepted = true;
				showAcceptedScreen = true;
				toast({
					title: "Policies Accepted",
					desc: "You have successfully accepted the latest policies.",
					icon: "check_circle",
					appearance: "success",
					position: "bottom-left",
					autoDismiss: 5000
				});
			} else {
				toast({
					title: "Error",
					desc: "Failed to accept policies.",
					icon: "crisis_alert",
					appearance: "danger",
					position: "bottom-left",
					autoDismiss: 5000
				});
			}
		} catch (err) {
			console.error(err);
			toast({
				title: "Error",
				desc: "Failed to accept policies.",
				icon: "crisis_alert",
				appearance: "danger",
				position: "bottom-left",
				autoDismiss: 5000
			});
		} finally {
			accepting = false;
		}
	}
</script>

<FlexWrapper width="100%" height="100%">
	<div id="background">
		{#if loadingSession}
			<FlexWrapper justifycontent="center" alignitems="center" height="100%">
				<Loader />
			</FlexWrapper>
		{:else if showAcceptedScreen}
			<FlexWrapper direction="column" alignitems="center" justifycontent="center" padding="2rem" gap="1.5rem" height="100%">
				<Icon icon="verified" size="10rem" color="var(--token-color-text-success)" />
				<h1>Policies Accepted</h1>
				<p>Thank you, {sessionInfo?.display_name}! You have successfully accepted the latest policies.</p>
				<p>You can now continue using your account.</p>
				<Space height="var(--token-space-2)" />
				<FlexWrapper direction="row" gap="1rem">
					<LinkButton href="https://home.davidnet.net">Home</LinkButton>
					<LinkButton href="https://davidnet.net">Davidnet</LinkButton>
					<LinkButton href="https://account.davidnet.net">My Account</LinkButton>
				</FlexWrapper>
			</FlexWrapper>
		{:else if accepted}
			<FlexWrapper direction="column" alignitems="center" justifycontent="center" padding="2rem" gap="1.5rem" height="100%">
				<Icon icon="verified" size="10rem" color="var(--token-color-text-success)" />
				<h1>Policies already accepted</h1>
				<Space height="var(--token-space-2)" />
				<FlexWrapper direction="row" gap="1rem">
					<LinkButton href="https://home.davidnet.net">Home</LinkButton>
					<LinkButton href="https://davidnet.net">Davidnet</LinkButton>
					<LinkButton href="https://account.davidnet.net">My Account</LinkButton>
				</FlexWrapper>
			</FlexWrapper>
		{:else if sessionInfo}
			<FlexWrapper direction="column" alignitems="center" padding="2rem" gap="1.5rem">
				<Icon icon="contract_edit" size="10rem" />
				<h1>Updated Policies</h1>
				<p>Hello {sessionInfo.display_name}, our policies have changed.</p>
				<p>Please review and accept them to continue using your account.</p>

				<LinkButton href="https://davidnet.net/legal/" opennewtab>View policies</LinkButton>
				<Button appearance="primary" onClick={acceptPolicy} disabled={accepting}>
					{accepting ? "Accepting..." : "Accept Policies"}
				</Button>
				<Space height="var(--token-space-2)" />
				{#if accepting}
                    <LinkButton appearance="danger" href="https://account.davidnet.net/account/settings/data/account">Do not agree</LinkButton>
                {/if}
			</FlexWrapper>
		{:else}
			<p>Error loading session. Please <a href="https://account.davidnet.net/login">login</a>.</p>
		{/if}
	</div>
</FlexWrapper>

<style>
	h1 {
		text-align: center;
		font-size: 2rem;
	}

	p {
		text-align: center;
		max-width: 480px;
	}

	a {
		color: var(--token-color-text-link);
		text-decoration: underline;
	}

	#background {
		background-color: var(--token-color-surface-sunken-normal);
		padding: 4rem 5rem;
		padding-top: 0rem;
		border-radius: 1rem;
		width: 300px;
		height: 680px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
	}
</style>
