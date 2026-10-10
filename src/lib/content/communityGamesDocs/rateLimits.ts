export const rateLimits = `## Rate limits

Every method below (except \`realtime.*\`, which has its own separate limit — see Realtime
multiplayer) shares ONE budget per player per game: **60 calls per 10 seconds**. That is generous
for normal use — occasional score/save/achievement submissions, polling a leaderboard every few
seconds — but will start rejecting calls once something loops every animation frame:
\`applyHighscore\`, \`getHighscores\`, \`saveJsonBlob\`, \`getJsonBlob\`, \`unlockAchievement\`,
\`getAchievements\`, \`ugc.publishLevel\`, \`ugc.listLevels\`, \`ugc.getLevel\`, \`ugc.deleteLevel\`.

Two ways to stay under it:

1. **Trigger calls from game events, not the render loop.** Level-complete, boss-defeated,
   checkpoint, game-over — never "every frame, check if X is still true".
2. **Check your remaining budget** before something call-heavy, like a live leaderboard widget on a
   timer.

Every successful call resolves with an extra \`rateLimit: { limit, remaining, resetAt }\` field
tacked onto its normal result. \`resetAt\` is an epoch-ms timestamp for when the budget refills.

\`\`\`javascript
const result = await window.DavidnetSDK.applyHighscore(finalScore);
console.log(result.rateLimit); // { limit: 60, remaining: 57, resetAt: 1739999999000 }
\`\`\`

\`DavidnetSDK.getRateLimitStatus()\` returns that same shape synchronously, with no network call at
all. \`null\` until your first SDK call has resolved at least once — use this to decide WHETHER to
make a call, rather than reacting to the result of one you just made.

\`\`\`javascript
function canPollLeaderboard() {
  const status = window.DavidnetSDK.getRateLimitStatus();
  return !status || status.remaining > 5;
}
setInterval(async () => {
  if (!canPollLeaderboard()) return;
  const { leaderboard } = await window.DavidnetSDK.getHighscores();
  renderLeaderboardRows(leaderboard);
}, 5000);
\`\`\`

If you do get rate-limited, the call's promise rejects exactly like any other error — one more
reason every SDK call must be wrapped in try/catch. The rejection message is \`"RATELIMIT"\`.

## Signed calls have their own, stricter cooldown

\`applyHighscore\`, \`saveJsonBlob\` and \`unlockAchievement\` are "signed" calls — each one is
cryptographically signed against your current play session as an anti-cheat measure. Separately
from the 60/10s budget above, the server accepts **at most one signed submission per session every
~2 seconds**, and that cooldown is shared across all three call types together, not tracked
per-endpoint. A rejected one comes back with the same \`"RATELIMIT"\` rejection as the main budget.

This matters because "game over" is a very natural point to want to submit a score, save progress,
AND unlock an achievement all at once — but firing all three in the same instant means only the
first one survives; the rest get rejected. Space them out instead:

\`\`\`javascript
async function onGameOver(finalScore) {
  await window.DavidnetSDK.applyHighscore(finalScore).catch((e) => console.warn(e));

  await new Promise((r) => setTimeout(r, 2200));
  await window.DavidnetSDK.saveJsonBlob({ lastScore: finalScore }).catch((e) => console.warn(e));

  await new Promise((r) => setTimeout(r, 2200));
  await window.DavidnetSDK.unlockAchievement({ id: "game_over", name: "Finisher" }).catch((e) => console.warn(e));
}
\`\`\`

\`getHighscores\`, \`getJsonBlob\`, \`getAchievements\` and everything under \`ugc.*\` are NOT signed
and are unaffected by this — only the three calls that mutate anti-cheat-relevant state are.
`;
