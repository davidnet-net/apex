<script lang="ts">
	import { Flex, Icon } from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";
</script>

<!--
	Davidnet is a hobby project, not a registered company, but the EU Digital Services Act (Reg.
	2022/2065) still applies because it hosts EU users' content. Micro/small-enterprise status
	(Art. 19) exempts us from internal complaint-handling (Art. 20), out-of-court dispute
	settlement (Art. 21), and annual transparency reporting (Art. 24) - but NOT from the three
	duties below, which apply to every hosting service regardless of size.
-->
<details class="dsa-panel">
	<summary>
		<Icon icon="gavel" size="small" />
		<span>EU Digital Services Act — what this means for moderation</span>
	</summary>
	<Flex direction="column" gap="small" marginTop="small">
		<p style="margin: 0; color: {token.theme.color.text.secondary}">
			Davidnet is a hobby project, but the DSA still applies to it because it hosts content for EU
			users. As a micro/small provider we're exempt from internal complaint-handling, out-of-court
			dispute settlement, and annual transparency reports — but these three duties still apply:
		</p>
		<p style="margin: 0;">
			<strong>Art. 16 — Notice-and-action:</strong> anyone must be able to report content they believe
			is illegal under any applicable law, not just copyright (the DMCA flow only covers that one
			case).
		</p>
		<p style="margin: 0;">
			<strong>Art. 17 — Statement of reasons:</strong> whenever we restrict, hide, or remove an
			account or its content, the affected user is owed a clear explanation of why. This is why
			issuing a violation or banning a user now always requires a reason — either an existing
			violation or a freshly typed one — instead of a silent action.
		</p>
		<p style="margin: 0;">
			<strong>Art. 14 — Clear moderation policy:</strong> our terms must describe, in plain language,
			how content moderation works here, including where it's a manual decision vs. an automated
			toggle.
		</p>
	</Flex>
</details>

<style>
	.dsa-panel {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		padding: 12px 16px;
		width: 100%;
		box-sizing: border-box;
	}

	.dsa-panel summary {
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
	}
</style>
