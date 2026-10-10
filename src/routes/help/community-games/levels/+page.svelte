<script lang="ts">
	import { Button, CodeSnippet, Flex, navigateBack } from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";

	import { levels as levelsDocs } from "$lib/content/communityGamesDocs";
	import { copyDocsForAi } from "$lib/utils/copyDocsForAi";
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" height="fit-content">
			<h2>Community levels (UGC)</h2>
			<Button iconbefore="arrow_back" onclick={() => navigateBack()}>Back</Button>
		</Flex>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			<a href="/help/community-games">← All Community Games topics</a>
		</p>
		<Flex height="fit-content">
			<Button
				appearance="subtle"
				iconbefore="content_copy"
				onclick={() => copyDocsForAi(levelsDocs, "The Community levels page")}>
				Copy this page for AI
			</Button>
		</Flex>

		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			A generic level-upload system under <code>DavidnetSDK.ugc</code>. Level data is an opaque JSON
			blob — the platform never looks inside it, so it works for any level/map/track format your
			game defines. Levels are public once published: any player can list and download them, same
			trust model as the rest of your sandboxed game (your game decides what to publish and how to
			interpret what it downloads).
		</p>

		<h3 style="margin-top: 1rem;"><code>DavidnetSDK.ugc.publishLevel({'{'} id?, title, data {'}'})</code></h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Publishes a new level, or — if you pass the <code>id</code> of a level you own — overwrites it
			in place (e.g. after the player edits it further). <code>title</code> is required (up to 100
			chars); <code>data</code> is your opaque level payload. Resolves to:
			<code>{'{'} id, title, createdAt, updatedAt {'}'}</code>
		</p>
		<CodeSnippet
			language="javascript"
			filename="levels-publish.js"
			code={`// Publish a brand new level.
async function publishMyLevel(levelData) {
  try {
    const { id } = await window.DavidnetSDK.ugc.publishLevel({
      title: "Lava Castle",
      data: levelData // any JSON-serializable shape your game defines
    });
    showMessage("Level published!");
    return id; // save this if you want to let the player edit it later
  } catch (e) {
    console.warn("Could not publish level", e);
  }
}

// Overwrite a level the player already published, e.g. after they edit it.
async function updateMyLevel(levelId, newLevelData) {
  await window.DavidnetSDK.ugc.publishLevel({
    id: levelId,
    title: "Lava Castle (remastered)",
    data: newLevelData
  });
}`} />

		<h3 style="margin-top: 1.5rem;"><code>DavidnetSDK.ugc.listLevels(options?)</code></h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Lists published levels for this game, newest first. Pass <code>{'{'} mine: true {'}'}</code>
			 to list only your own, <code>{'{'} limit, offset {'}'}</code>
			 to page through them (<code>limit</code> defaults to 20, max 50). Does NOT include the level
			data itself — call <code>getLevel</code> once the player picks one. Resolves to:
			<code>
				{'{'} levels: [{'{'} id, title, creator, creatorDisplayName, createdAt, updatedAt {'}'}, ...],
				hasMore {'}'}
			</code>
		</p>
		<CodeSnippet
			language="javascript"
			filename="levels-list.js"
			code={`// A "browse community levels" screen with pagination.
let offset = 0;
const PAGE_SIZE = 20;

async function loadNextPage() {
  const { levels, hasMore } = await window.DavidnetSDK.ugc.listLevels({
    limit: PAGE_SIZE,
    offset
  });
  renderLevelBrowser(levels); // each entry has { id, title, creator, ... } - no "data" yet
  offset += levels.length;
  showLoadMoreButton(hasMore);
}

// "My levels" screen.
async function showMyLevels() {
  const { levels } = await window.DavidnetSDK.ugc.listLevels({ mine: true });
  renderMyLevelsList(levels);
}`} />

		<h3 style="margin-top: 1.5rem;"><code>DavidnetSDK.ugc.getLevel(id)</code></h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Fetches one level's full data, including its creator info. Resolves to:
			<code>{'{'} id, title, data, creator, creatorDisplayName, createdAt, updatedAt {'}'}</code>
		</p>
		<CodeSnippet
			language="javascript"
			filename="levels-get.js"
			code={`async function playLevel(levelId) {
  const { title, data, creatorDisplayName } = await window.DavidnetSDK.ugc.getLevel(levelId);
  showLoadingScreen("Loading \\"" + title + "\\" by " + creatorDisplayName);
  loadLevel(data); // your game's own format, whatever you passed to publishLevel
}`} />

		<h3 style="margin-top: 1.5rem;"><code>DavidnetSDK.ugc.deleteLevel(id)</code></h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Deletes a level you published (or any level, if you're the game's creator). Resolves to:
			<code>{'{'} id {'}'}</code>
		</p>
		<CodeSnippet
			language="javascript"
			filename="levels-delete.js"
			code={`async function deleteMyLevel(levelId) {
  try {
    await window.DavidnetSDK.ugc.deleteLevel(levelId);
    removeLevelFromMyList(levelId);
  } catch (e) {
    console.warn("Could not delete level", e);
  }
}`} />
	</Flex>
</Flex>
