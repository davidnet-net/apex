<script lang="ts">
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import {
		authState,
		Button,
		Flex,
		getFetch,
		navigateBack,
		whenAuthReady
	} from "@davidnet-net/svelte-ui";

	// This screen only makes sense for support staff (the /help hub only links here from its
	// supportAccess-gated "Internal" section) - bounce anyone else out to the account domain's
	// access-denied page rather than showing them an empty/broken screen.
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
</script>

{#if hasModerationAccess}
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
		</Flex>
	</Flex>
{/if}
