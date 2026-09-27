<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import { Button, Flex, getFetch, LinkButton, navigateBack } from "@davidnet-net/svelte-ui";
	import { marked } from "marked";

	interface Document {
		slug: string;
		content: string;
	}

	let doc = $state<Document | null>(null);
	let loading = $state(true);

	let htmlContent = $derived(doc ? marked.parse(doc.content) : "");

	$effect(() => {
		const currentSlug = page.params.slug;
		if (currentSlug) {
			fetchDocument(currentSlug);
		}
	});

	async function fetchDocument(slug: string) {
		try {
			const data = await getFetch(
				PUBLIC_BACKEND_URL + "/legal/documents",
				undefined,
				undefined,
				false
			);

			if (!data.success) {
				goto("/legal");
				return;
			}

			const foundDoc = data.documents.find((d: Document) => d.slug === slug);

			if (!foundDoc) {
				goto("/legal");
				return;
			}

			doc = foundDoc;
		} catch (err) {
			console.error("Fout bij ophalen document:", err);
			goto("/legal");
		} finally {
			loading = false;
		}
	}
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" height="fit-content">
			<h2>Legal</h2>
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
		<Flex justifyContent="center" alignItems="center" height="fit-content" width="fit-content">
			<article
				style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; width: 100%; max-width: 800px;">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html htmlContent}
			</article>
		</Flex>
	</Flex>
</Flex>

<style>
	article :global(h1) {
		font-size: 2.25rem;
		font-weight: 700;
		margin-top: 1.5rem;
		margin-bottom: 1rem;
		border-bottom: 2px solid rgba(255, 255, 255, 0.1);
		padding-bottom: 0.5rem;
	}

	article :global(h2) {
		font-size: 1.5rem;
		font-weight: 600;
		margin-top: 2rem;
		margin-bottom: 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	article :global(h3) {
		font-size: 1.25rem;
		font-weight: 600;
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
	}

	article :global(p) {
		margin-bottom: 1rem;
	}

	article :global(ul) {
		margin-bottom: 1rem;
		padding-left: 1.5rem;
		list-style-type: disc;
	}

	article :global(li) {
		margin-bottom: 0.35rem;
	}
</style>
