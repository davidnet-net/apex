<script lang="ts">
	import {
		Button,
		Flex,
		formatIsoToPreferred,
		Icon,
		LinkButton,
		navigateBack
	} from "@davidnet-net/svelte-ui";
	import { onMount } from "svelte";

	let formattedUntil: undefined | string = $state(undefined);
	onMount(() => {
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const untilValue = urlParams.get("until");
		if (untilValue) {
			formattedUntil = formatIsoToPreferred(untilValue, true);
		}
	});
</script>

<Flex justifyContent="center" alignItems="center" direction="column" gap="large">
	<Icon icon="gavel" size="giant" color="danger" />
	<h1>Banned</h1>
	{#if formattedUntil}
		Until {formattedUntil}.
	{/if}
	<Flex height="fit-content" gap="small" justifyContent="center">
		<LinkButton href="https://davidnet.net/moderation/violations">View your violations</LinkButton>
		<LinkButton href="https://davidnet.net/legal">View the policies</LinkButton>
		<Button
			iconbefore="arrow_back"
			onclick={() => {
				navigateBack("/");
			}}>
			Back
		</Button>
	</Flex>
</Flex>
