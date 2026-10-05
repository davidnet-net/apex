<script lang="ts">
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import { getFetch, Spinner, Flex, Skeleton, navigateBack, Button } from "@davidnet-net/svelte-ui";
	import HorizontalCard from "$lib/components/HorizontalCard/HorizontalCard.svelte";
	import * as m from "$lib/paraglide/messages.js";
	interface Document {
		slug: string;
		content: string;
	}

	let documents = $state<Document[]>([]);
	let loading = $state(true);

	$effect(() => {
		fetchDocuments();
	});

	async function fetchDocuments() {
		try {
			const data = await getFetch(
				PUBLIC_BACKEND_URL + "/legal/documents",
				undefined,
				undefined,
				false
			);
			if (data.success) {
				documents = data.documents;
			}
		} catch (err) {
			console.error("Fout bij ophalen documenten:", err);
		} finally {
			loading = false;
		}
	}
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" height="fit-content">
			<h2>{m.page_legal_heading()}</h2>
			<Flex width="fit-content" height="fit-content" gap="small">
				<Button
					iconbefore="arrow_back"
					onclick={() => {
						navigateBack();
					}}>
					{m.common_back()}
				</Button>
			</Flex>
		</Flex>
		<Flex gap="medium" height="fit-content" marginBottom="giant" flexWrap="wrap">
			{#if loading}
				<Skeleton height="4rem" width="18rem" />
				<Skeleton height="4rem" width="18rem" />
				<Skeleton height="4rem" width="18rem" />
				<Skeleton height="4rem" width="18rem" />
			{:else}
				{#each documents as doc}
					<HorizontalCard
						title={doc.slug.replace(/_/g, " ")}
						description=""
						icon="quick_reference"
						href="/legal/{doc.slug}" />
				{/each}
				<HorizontalCard title={m.page_legal_acceptance_history_title()} icon="history" href={`/legal/history`} />
				<HorizontalCard
					title={m.page_legal_policies_history_title()}
					icon="history"
					href={`https://github.com/davidnet-net/legal/commits/main/`} />
			{/if}
		</Flex>
	</Flex>
</Flex>
