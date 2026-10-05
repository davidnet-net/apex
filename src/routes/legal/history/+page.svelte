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
	import * as m from "$lib/paraglide/messages.js";

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
			<h2>{m.page_legal_history_heading()}</h2>
			<Flex width="fit-content" height="fit-content" gap="small">
				<Button
					iconbefore="arrow_back"
					onclick={() => {
						navigateBack();
					}}>
					{m.common_back()}
				</Button>
				<LinkButton href="/legal">{m.page_legal_all_files_link()}</LinkButton>
			</Flex>
		</Flex>
		<Flex gap="medium" height="fit-content" marginBottom="giant" flexWrap="wrap">
			{#if loading}
				<Skeleton height="4rem" width="18rem" />
				<Skeleton height="4rem" width="18rem" />
			{:else if history.length === 0}
				<p>{m.page_legal_history_empty()}</p>
			{:else}
				{#each history as record}
					<HorizontalCard
						title={m.page_legal_history_version_title({ hash: record.commitHash.substring(0, 7) })}
						description={m.page_legal_history_accepted_on({ date: new Date(record.acceptedAt).toLocaleDateString() })}
						icon="history"
						href={`https://github.com/davidnet-net/legal/tree/${record.commitHash}`} />
				{/each}
			{/if}
		</Flex>
	</Flex>
</Flex>
