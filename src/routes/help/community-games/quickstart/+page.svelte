<script lang="ts">
	import { Button, CodeSnippet, Flex, navigateBack } from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";

	import { quickstart as quickstartDocs } from "$lib/content/communityGamesDocs";
	import { copyDocsForAi } from "$lib/utils/copyDocsForAi";

	const starter = `// Every one of these functions already exists on window.DavidnetSDK the moment your
// game loads - there is nothing to install or import, just call them directly.

// 1. Restore the player's progress once when the game boots.
async function restoreProgress() {
  try {
    const { data } = await window.DavidnetSDK.getJsonBlob();
    if (data) applySaveData(data); // data is null if this player never saved before
  } catch (e) {
    console.warn("Could not load save", e);
  }
}

// 2. Save progress whenever it changes meaningfully - on checkpoint/level-complete,
//    NOT every frame (see Rate limits).
async function onCheckpoint(state) {
  try {
    await window.DavidnetSDK.saveJsonBlob(state);
  } catch (e) {
    console.warn("Could not save progress", e);
  }
}

// 3. Submit a score on game over. The server only ever keeps your best, so this is
//    always safe to call.
async function onGameOver(finalScore) {
  try {
    const { isNewPersonalBest, isNewGlobalBest } = await window.DavidnetSDK.applyHighscore(finalScore);
    if (isNewGlobalBest) showMessage("New world record!");
    else if (isNewPersonalBest) showMessage("New personal best!");
  } catch (e) {
    console.warn("Could not submit score", e);
  }
}

// 4. Unlock an achievement ONCE when something happens - not every frame.
async function onBossDefeated() {
  try {
    const { isNew } = await window.DavidnetSDK.unlockAchievement({
      id: "first_boss_kill",       // you choose this - keep it short and stable
      name: "Giant Slayer",        // shown to the player
      description: "Defeat the first boss",
      icon: "⚔️"
    });
    if (isNew) showMessage("Achievement unlocked: Giant Slayer!");
  } catch (e) {
    console.warn("Could not unlock achievement", e);
  }
}

// 5. Show the top 10 players, e.g. on a "leaderboard" button.
async function showLeaderboard() {
  const { leaderboard } = await window.DavidnetSDK.getHighscores();
  renderLeaderboard(leaderboard); // [{ rank, username, displayName, avatarUrl, score }, ...]
}`;
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" height="fit-content">
			<h2>Quickstart</h2>
			<Button
				iconbefore="arrow_back"
				onclick={() => {
					navigateBack();
				}}>
				Back
			</Button>
		</Flex>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			<a href="/help/community-games">← All Community Games topics</a>
		</p>
		<Flex height="fit-content">
			<Button
				appearance="subtle"
				iconbefore="content_copy"
				onclick={() => copyDocsForAi(quickstartDocs, "The Quickstart page")}>
				Copy this page for AI
			</Button>
		</Flex>

		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			The fastest way to see this working: upload any zip with an <code>index.html</code> at its
			root (see <a href="/games/community/upload">Upload a game</a>), then paste the snippet below
			into your game's JavaScript and adapt the <code>applySaveData</code>/<code>showMessage</code>/
			<code>renderLeaderboard</code>
			 calls to whatever your game actually does. Nothing to install — <code>window.DavidnetSDK</code>
			 already exists the moment your game loads.
		</p>

		<h3 style="margin-top: 1rem;">1. Restore progress on load</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Call <code>getJsonBlob()</code> once when your game boots. <code>data</code> is
			<code>null</code>
			 if this player has never saved before — that's the normal case for a brand new player, not
			an error.
		</p>
		<CodeSnippet
			language="javascript"
			filename="quickstart-1-restore.js"
			code={`const { data } = await window.DavidnetSDK.getJsonBlob();
if (data) {
  applySaveData(data);
} else {
  startNewGame();
}`} />

		<h3 style="margin-top: 1.5rem;">2. Save progress on meaningful changes</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Trigger this from game events — level-complete, checkpoint, inventory change — not from your
			render loop. See <a href="/help/community-games/saves">Save data</a> for slots and size limits.
		</p>
		<CodeSnippet
			language="javascript"
			filename="quickstart-2-save.js"
			code={`function onLevelComplete(levelIndex, inventory) {
  window.DavidnetSDK.saveJsonBlob({ levelIndex, inventory }).catch((e) => {
    console.warn("Could not save progress", e);
  });
}`} />

		<h3 style="margin-top: 1.5rem;">3. Submit a score on game over</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			The server only ever keeps the player's HIGHEST score, so it's always safe to call this on
			every game over. See <a href="/help/community-games/highscores">Highscores & leaderboards</a>
			 for multiple leaderboards per game.
		</p>
		<CodeSnippet
			language="javascript"
			filename="quickstart-3-highscore.js"
			code={`async function onGameOver(finalScore) {
  try {
    const result = await window.DavidnetSDK.applyHighscore(finalScore);
    if (result.isNewGlobalBest) showMessage("New world record!");
    else if (result.isNewPersonalBest) showMessage("New personal best!");
  } catch (e) {
    console.warn("Could not submit score", e);
  }
}`} />

		<h3 style="margin-top: 1.5rem;">4. Unlock an achievement</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Call this once when the condition becomes true. See
			<a href="/help/community-games/achievements">Achievements</a>
			 for progress-bar achievements.
		</p>
		<CodeSnippet
			language="javascript"
			filename="quickstart-4-achievement.js"
			code={`async function onBossDefeated() {
  const { isNew } = await window.DavidnetSDK.unlockAchievement({
    id: "first_boss_kill",
    name: "Giant Slayer",
    description: "Defeat the first boss",
    icon: "⚔️"
  });
  if (isNew) showMessage("Achievement unlocked: Giant Slayer!");
}`} />

		<h3 style="margin-top: 1.5rem;">Putting it all together</h3>
		<CodeSnippet code={starter} language="javascript" filename="davidnet-sdk-quickstart.js" />

		<h3 style="margin-top: 1.5rem;">Next steps</h3>
		<ul style="margin: 0; padding-left: 20px; color: {token.theme.color.text.secondary}">
			<li>Building a multiplayer game? Read <a href="/help/community-games/realtime">Realtime multiplayer</a>.</li>
			<li>
				Not writing plain JavaScript? Read
				<a href="/help/community-games/godot">Godot / other engines</a>
				.
			</li>
			<li>
				Calling something often (a live leaderboard, frequent saves)? Read
				<a href="/help/community-games/rate-limits">Rate limits</a>
				 first.
			</li>
		</ul>
	</Flex>
</Flex>
