<script lang="ts">
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import {
		getFetch,
		Flex,
		Skeleton,
		navigateBack,
		Button,
		LinkButton
	} from "@davidnet-net/svelte-ui";
	import HorizontalCard from "$lib/components/HorizontalCard/HorizontalCard.svelte";

	interface HistoryRecord {
		commitHash: string;
		acceptedAt: string;
		ip: string;
		userAgent: string;
	}

	let history = $state<HistoryRecord[]>([]);
	let loading = $state(true);

	$effect(() => {
		fetchHistory();
	});

	async function fetchHistory() {
		try {
			const data = await getFetch(
				PUBLIC_BACKEND_URL + "/legal/history",
				undefined,
				undefined,
				true // True want authenticatie is vereist voor je eigen geschiedenis
			);
			if (data.success) {
				history = data.history;
			}
		} catch (err) {
			console.error("Fout bij ophalen geschiedenis:", err);
		} finally {
			loading = false;
		}
	}
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" height="fit-content">
			<h2>Legal - Acceptance history</h2>
			<Flex width="fit-content" height="fit-content" gap="small">
				<Button
					iconbefore="arrow_back"
					onclick={() => {
						navigateBack();
					}}>
					Back
				</Button>
				<LinkButton href="/legal">All legal files</LinkButton>
			</Flex>
		</Flex>
		<Flex gap="medium" height="fit-content" marginBottom="giant" flexWrap="wrap">
			{#if loading}
				<Skeleton height="4rem" width="18rem" />
				<Skeleton height="4rem" width="18rem" />
			{:else if history.length === 0}
				<p>No acceptance records found.</p>
			{:else}
				{#each history as record}
					<HorizontalCard
						title={`Version: ${record.commitHash.substring(0, 7)}`}
						description={`Accepted on ${new Date(record.acceptedAt).toLocaleDateString()}`}
						icon="history"
						href={`https://github.com/davidnet-net/legal/tree/${record.commitHash}`} />
				{/each}
			{/if}
		</Flex>
	</Flex>
</Flex>
