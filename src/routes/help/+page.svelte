<script lang="ts">
	import { Flex, LinkButton } from "@davidnet-net/svelte-ui";
	import HorizontalCard from "$lib/components/HorizontalCard/HorizontalCard.svelte";
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" height="fit-content">
			<h2>Davidnet helpcenter</h2>
		</Flex>
		<Flex gap="medium" height="fit-content" marginBottom="giant" flexWrap="wrap">
			<HorizontalCard title="Privacy & policies" description="" icon="policy" href="/legal" />
			<HorizontalCard
				title="Tickets"
				icon="contact_support"
				href="/help/tickets"
				description="Contact us." />
			<HorizontalCard icon="person_alert" title="Moderation & reports" href="/moderation" />
		</Flex>
	</Flex>
</Flex>
