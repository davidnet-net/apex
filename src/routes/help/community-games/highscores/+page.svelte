<script lang="ts">
	import { Button, CodeSnippet, Flex, navigateBack } from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";

	import { highscores as highscoresDocs } from "$lib/content/communityGamesDocs";
	import { copyDocsForAi } from "$lib/utils/copyDocsForAi";
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" height="fit-content">
			<h2>Highscores & leaderboards</h2>
			<Button iconbefore="arrow_back" onclick={() => navigateBack()}>Back</Button>
		</Flex>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			<a href="/help/community-games">← All Community Games topics</a>
		</p>
		<Flex height="fit-content">
			<Button
				appearance="subtle"
				iconbefore="content_copy"
				onclick={() => copyDocsForAi(highscoresDocs, "The Highscores & leaderboards page")}>
				Copy this page for AI
			</Button>
		</Flex>

		<h3 style="margin-top: 1rem;"><code>DavidnetSDK.applyHighscore(score, options?)</code></h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Submits a score. The server only ever keeps the HIGHEST score per player and globally, so it
			is safe to call this every time the player's score might be a new best — on every game over,
			without checking first whether it's actually better. <code>score</code> must be a non-negative
			integer.
		</p>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Resolves to:
			<code>
				{'{'} score, playerHighscore, globalHighscore, isNewPersonalBest, isNewGlobalBest {'}'}
			</code>
		</p>
		<CodeSnippet
			language="javascript"
			filename="highscore-basic.js"
			code={`async function onGameOver(finalScore) {
  try {
    const result = await window.DavidnetSDK.applyHighscore(finalScore);

    if (result.isNewGlobalBest) {
      showMessage("New world record!");
    } else if (result.isNewPersonalBest) {
      showMessage("New personal best: " + result.playerHighscore);
    } else {
      showMessage("Score: " + result.score + " (best: " + result.playerHighscore + ")");
    }
  } catch (e) {
    console.warn("Could not submit score", e);
  }
}`} />

		<h3 style="margin-top: 1.5rem;">Multiple leaderboards (categories)</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			A game can have MULTIPLE leaderboards: pass <code>{'{'} category: "time-attack" {'}'}</code>
			 (letters, numbers, <code>-</code>/<code>_</code>, up to 50 chars) to submit to a leaderboard
			other than the default one. Omit it entirely and you get the classic
			one-leaderboard-per-game behavior — this is fully backwards compatible, every game uploaded
			before categories existed keeps working unchanged.
		</p>
		<CodeSnippet
			language="javascript"
			filename="highscore-categories.js"
			code={`// A racing game with one leaderboard per track.
async function onRaceFinished(trackId, timeMs) {
  try {
    const result = await window.DavidnetSDK.applyHighscore(timeMs, { category: trackId });
    if (result.isNewGlobalBest) showMessage("New track record on " + trackId + "!");
  } catch (e) {
    console.warn("Could not submit lap time", e);
  }
}

// A game with a "normal" and a "hardcore" mode, each with its own leaderboard.
async function onGameOver(finalScore, isHardcore) {
  const category = isHardcore ? "hardcore" : "default";
  try {
    await window.DavidnetSDK.applyHighscore(finalScore, { category });
  } catch (e) {
    console.warn("Could not submit score", e);
  }
}`} />

		<h3 style="margin-top: 1.5rem;"><code>DavidnetSDK.getHighscores(options?)</code></h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Pass <code>{'{'} category: "time-attack" {'}'}</code>
			 to read a non-default leaderboard — same rule as <code>applyHighscore</code>. Resolves to:
			<code>{'{'} playerHighscore, globalHighscore, leaderboard {'}'}</code>
			 —
			<code>leaderboard</code>
			 is the top 10:
			<code>[{'{'} rank, userId, username, displayName, avatarUrl, score {'}'}, ...]</code>
			.
			<code>globalHighscore</code>
			 is that same shape for the #1 entry, or <code>null</code> if nobody has scored yet.
		</p>
		<CodeSnippet
			language="javascript"
			filename="highscore-read.js"
			code={`async function showLeaderboardScreen() {
  const { leaderboard, playerHighscore, globalHighscore } = await window.DavidnetSDK.getHighscores();

  renderLeaderboardRows(leaderboard);
  renderYourBest(playerHighscore); // null if you haven't scored yet

  if (globalHighscore) {
    renderTopPlayer(globalHighscore.displayName, globalHighscore.score);
  }
}

// Reading a non-default leaderboard, e.g. for a "time attack" tab.
async function showTimeAttackLeaderboard() {
  const { leaderboard } = await window.DavidnetSDK.getHighscores({ category: "time-attack" });
  renderLeaderboardRows(leaderboard);
}`} />

		<h3 style="margin-top: 1.5rem;">A live leaderboard widget (polling)</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			If you show a leaderboard on-screen during gameplay and want it to update periodically, poll
			on an interval of a few seconds — NOT every frame. Check
			<a href="/help/community-games/rate-limits">your rate limit budget</a>
			 before firing the next poll, so a busy moment elsewhere in your game doesn't tip you over.
		</p>
		<CodeSnippet
			language="javascript"
			filename="highscore-live-widget.js"
			code={`let pollTimer = null;

function startLiveLeaderboard() {
  pollTimer = setInterval(async () => {
    const status = window.DavidnetSDK.getRateLimitStatus();
    if (status && status.remaining < 5) return; // skip this tick, budget is low

    try {
      const { leaderboard } = await window.DavidnetSDK.getHighscores();
      renderLeaderboardRows(leaderboard);
    } catch (e) {
      console.warn("Leaderboard refresh failed", e);
    }
  }, 5000); // every 5 seconds is plenty for a leaderboard
}

function stopLiveLeaderboard() {
  clearInterval(pollTimer);
}`} />

		<h3 style="margin-top: 1.5rem;">Flagged scores</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			A score far above the current leaderboard top is automatically flagged for review rather than
			immediately shown on the public leaderboard — this is anti-cheat, not something your game
			needs to handle specially. The call still succeeds and <code>playerHighscore</code> still
			reflects it for that player; it's simply excluded from everyone else's view of the
			leaderboard until a moderator reviews it.
		</p>
	</Flex>
</Flex>
