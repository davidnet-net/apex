export const highscores = `## Highscores & leaderboards

### DavidnetSDK.applyHighscore(score: number, options?: { category?: string })
Returns a Promise resolving to:
\`{ score, playerHighscore, globalHighscore, isNewPersonalBest, isNewGlobalBest }\`
Submits a score. The server only ever keeps the HIGHEST score per player and globally, so it is
safe to call this every time the player's score might be a new best (e.g. on game over). Score must
be a non-negative integer.

A game can have MULTIPLE leaderboards: pass \`{ category: "time-attack" }\` (letters, numbers,
\`-\`/\`_\`, up to 50 chars) to submit to a leaderboard other than the default one. Omit it entirely
and you get the classic one-leaderboard-per-game behavior — fully backwards compatible, every game
uploaded before categories existed keeps working unchanged.

\`\`\`javascript
async function onGameOver(finalScore) {
  try {
    const result = await window.DavidnetSDK.applyHighscore(finalScore);
    if (result.isNewGlobalBest) showMessage("New world record!");
    else if (result.isNewPersonalBest) showMessage("New personal best: " + result.playerHighscore);
  } catch (e) {
    console.warn("Could not submit score", e);
  }
}

// A racing game with one leaderboard per track.
async function onRaceFinished(trackId, timeMs) {
  const result = await window.DavidnetSDK.applyHighscore(timeMs, { category: trackId });
  if (result.isNewGlobalBest) showMessage("New track record on " + trackId + "!");
}
\`\`\`

### DavidnetSDK.getHighscores(options?: { category?: string })
Returns a Promise resolving to:
\`{ playerHighscore, globalHighscore, leaderboard }\`
\`leaderboard\` is the top 10: \`[{ rank, userId, username, displayName, avatarUrl, score }]\`.
\`globalHighscore\` is that same shape for the #1 entry (or null if nobody has scored yet). Pass
\`{ category: "time-attack" }\` to read a non-default leaderboard — same rule as \`applyHighscore\`.

\`\`\`javascript
async function showLeaderboardScreen() {
  const { leaderboard, playerHighscore, globalHighscore } = await window.DavidnetSDK.getHighscores();
  renderLeaderboardRows(leaderboard);
  renderYourBest(playerHighscore); // null if you haven't scored yet
}

// Self-throttled live leaderboard widget - poll every few seconds, not every frame,
// and check the rate limit before firing the next call.
let pollTimer = setInterval(async () => {
  const status = window.DavidnetSDK.getRateLimitStatus();
  if (status && status.remaining < 5) return;
  const { leaderboard } = await window.DavidnetSDK.getHighscores();
  renderLeaderboardRows(leaderboard);
}, 5000);
\`\`\`

A score far above the current leaderboard top is automatically flagged for review rather than
immediately shown on the public leaderboard — this is anti-cheat, not something your game needs to
handle specially. The call still succeeds and \`playerHighscore\` still reflects it for that player.
`;
