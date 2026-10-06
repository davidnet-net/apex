<script lang="ts">
	import { Flex, Icon } from "@davidnet-net/svelte-ui";
</script>

<Flex justifyContent="center" alignItems="center" direction="column" gap="large">
	<Icon icon="wifi_off" size="giant" color="danger" />
	<h1>Your network is blocked</h1>
	<p style="max-width: 32rem; text-align: center;">
		The IP address you're connecting from has been blocked from accessing Davidnet. This applies to
		every request from this address, not just your account - if you believe this is a mistake,
		reach out via <a href="https://davidnet.net/legal/contact">the contact page</a>
		from a different network.
	</p>
</Flex>
