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
	import * as m from "$lib/paraglide/messages.js";

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
	<h1>{m.page_banned_heading()}</h1>
	{#if formattedUntil}
		{m.page_banned_until({ date: formattedUntil })}
	{/if}
	<Flex height="fit-content" gap="small" justifyContent="center">
		<LinkButton href="https://davidnet.net/moderation/violations"
			>{m.page_banned_view_violations_link()}</LinkButton>
		<LinkButton href="https://davidnet.net/legal">{m.page_banned_view_policies_link()}</LinkButton>
		<Button
			iconbefore="arrow_back"
			onclick={() => {
				navigateBack("/");
			}}>
			{m.common_back()}
		</Button>
	</Flex>
</Flex>
