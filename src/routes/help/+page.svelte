<script lang="ts">
	import { BlockNote, Button, FlexWrapper, Icon, Space } from "@davidnet/svelte-ui";
</script>

<FlexWrapper height="100%" width="100%">
	<FlexWrapper height="50%" width="100%" justifycontent="flex-start" gap="var(--token-space-4);">
		<Icon icon="help" size="4rem" color="var(--token-color-text-default-normal)" />
		<h1 style="font-size: 2rem">Davidnet Help</h1>
		<BlockNote
			appearance="info"
			title="Notice"
		>
		Mistakes happen if something isn't right please contact us.
		</BlockNote>
		<Space height="var(--token-space-4)" />
		<div class="option">
			<FlexWrapper height="100%" width="100%" justifycontent="center" alignitems="center">
				<a href="/help/delete_account" class="option-text">Account Deletion</a>
			</FlexWrapper>
		</div>
		<div class="option">
			<FlexWrapper height="100%" width="100%" justifycontent="center" alignitems="center">
				<a href="/help/" class="option-text">Contact us</a>
			</FlexWrapper>
		</div>
        <Button iconbefore="arrow_back" onClick={()=>{history.back()}}>Back</Button>
	</FlexWrapper>
</FlexWrapper>

<style>
	.option {
		text-decoration: none;
		color: var(--token-color-text-default-normal);
		text-align: center;
		border-radius: 2rem;
		background-color: var(--token-color-surface-overlay-normal);
		padding: 0.25rem;
		transition:
			transform 0.4s ease,
			box-shadow 0.4s ease;
		height: 2rem;
		width: 16rem;
	}

	.option:hover {
		background-color: var(--token-color-surface-overlay-hover);
		transform: scale(1.01);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.option:active,
	.option:focus {
		background-color: var(--token-color-surface-overlay-pressed);
	}

	.option:focus {
		outline: 2px solid var(--token-color-focusring);
	}

	.option-text {
		line-height: 1.2;
		margin: 0px;
		font-size: larger;
		vertical-align: middle;
		color: var(--token-color-text-default-normal);
		text-decoration: none;
	}

	.option-text:hover {
		color: var(--token-color-text-default-secondary);
	}
</style>
