<script lang="ts">
	import { Button, CodeSnippet, Flex, navigateBack } from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";

	import { saves as savesDocs } from "$lib/content/communityGamesDocs";
	import { copyDocsForAi } from "$lib/utils/copyDocsForAi";
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" height="fit-content">
			<h2>Save data</h2>
			<Button iconbefore="arrow_back" onclick={() => navigateBack()}>Back</Button>
		</Flex>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			<a href="/help/community-games">← All Community Games topics</a>
		</p>
		<Flex height="fit-content">
			<Button
				appearance="subtle"
				iconbefore="content_copy"
				onclick={() => copyDocsForAi(savesDocs, "The Save data page")}>
				Copy this page for AI
			</Button>
		</Flex>

		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			This is how your game persists ANYTHING across sessions — inventory, level progress,
			settings, whatever you need. <code>window.localStorage</code>/<code>sessionStorage</code> do
			exist in the sandbox, but they're polyfilled to in-memory-only storage that is wiped on every
			reload, so never rely on them for anything you want to keep.
		</p>

		<h3 style="margin-top: 1rem;"><code>DavidnetSDK.saveJsonBlob(data, options?)</code></h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Persists any JSON-serializable value (object, array, string, number...) as the player's save
			file. Max size is about 1MB. Overwrites any previous save in that slot for this player on this
			game. Resolves to: <code>{'{'} savedAt {'}'}</code>
		</p>
		<CodeSnippet
			language="javascript"
			filename="save-basic.js"
			code={`async function onCheckpoint() {
  try {
    await window.DavidnetSDK.saveJsonBlob({
      level: currentLevel,
      inventory: playerInventory,
      settings: { musicVolume, sfxVolume }
    });
  } catch (e) {
    console.warn("Could not save progress", e);
  }
}`} />

		<h3 style="margin-top: 1.5rem;"><code>DavidnetSDK.getJsonBlob(options?)</code></h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Returns the player's previously saved value, or <code>data: null</code> if nothing was saved
			yet — that's the expected result for a brand new player, not an error. Resolves to:
			<code>{'{'} data, updatedAt {'}'}</code>
		</p>
		<CodeSnippet
			language="javascript"
			filename="save-load.js"
			code={`async function restoreProgress() {
  try {
    const { data, updatedAt } = await window.DavidnetSDK.getJsonBlob();

    if (data === null) {
      startNewGame();
      return;
    }

    currentLevel = data.level;
    playerInventory = data.inventory;
    applySettings(data.settings);
    console.log("Loaded save from", new Date(updatedAt));
  } catch (e) {
    console.warn("Could not load save, starting fresh", e);
    startNewGame();
  }
}`} />

		<h3 style="margin-top: 1.5rem;">Named save slots</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			A game can keep MULTIPLE saves: pass <code>{'{'} slot: "hardcore" {'}'}</code>
			 (letters, numbers, <code>-</code>/<code>_</code>, up to 50 chars) to use a slot other than the
			default one. Omit it entirely and you get the classic one-save-per-player behavior — fully
			backwards compatible, every game uploaded before slots existed keeps working unchanged.
		</p>
		<CodeSnippet
			language="javascript"
			filename="save-slots.js"
			code={`// Two independent saves: a normal-mode save and a separate hardcore-mode save.
async function saveNormalMode(state) {
  await window.DavidnetSDK.saveJsonBlob(state, { slot: "normal" });
}

async function saveHardcoreMode(state) {
  await window.DavidnetSDK.saveJsonBlob(state, { slot: "hardcore" });
}

async function loadHardcoreMode() {
  const { data } = await window.DavidnetSDK.getJsonBlob({ slot: "hardcore" });
  return data; // null if this player has never played hardcore mode
}

// Multiple numbered save slots, like a classic "3 save files" menu.
async function saveToSlot(slotNumber, state) {
  await window.DavidnetSDK.saveJsonBlob(state, { slot: "slot-" + slotNumber });
}

async function loadSlot(slotNumber) {
  const { data, updatedAt } = await window.DavidnetSDK.getJsonBlob({ slot: "slot-" + slotNumber });
  return { data, updatedAt }; // show updatedAt on the save-file picker, data null if empty
}`} />

		<h3 style="margin-top: 1.5rem;">When to save</h3>
		<ul style="margin: 0; padding-left: 20px; color: {token.theme.color.text.secondary}">
			<li>On checkpoint, level-complete, or any other clear "progress" moment.</li>
			<li>On explicit player action (a "Save" button, settings changed).</li>
			<li>
				<strong>Not</strong>
				 on every frame, and not on a tight timer — see
				<a href="/help/community-games/rate-limits">Rate limits</a>
				. A good rule of thumb: if the player wouldn't lose anything meaningful by closing the tab
				right now, you don't need to save yet.
			</li>
		</ul>
	</Flex>
</Flex>
