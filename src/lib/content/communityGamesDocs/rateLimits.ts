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

## Signed calls have their own, stricter cooldown — but only per resource

\`applyHighscore\`, \`saveJsonBlob\` and \`unlockAchievement\` are "signed" calls — each one is
cryptographically signed against your current play session as an anti-cheat measure. Separately
from the 60/10s budget above, the server accepts **at most one signed submission every ~2 seconds
per resource** - "resource" meaning one specific leaderboard category, one specific save slot, or
one specific achievement id. A rejected one comes back with the same \`"RATELIMIT"\` rejection as
the main budget.

This is deliberately scoped narrowly so a normal "game over" - submit a score, save progress, AND
unlock an achievement all at once - just works, since those are three different resources:

\`\`\`javascript
async function onGameOver(finalScore) {
  // All three can fire together - different resources, no cooldown collision.
  await window.DavidnetSDK.applyHighscore(finalScore).catch((e) => console.warn(e));
  await window.DavidnetSDK.saveJsonBlob({ lastScore: finalScore }).catch((e) => console.warn(e));
  await window.DavidnetSDK.unlockAchievement({ id: "game_over", name: "Finisher" }).catch((e) => console.warn(e));
}
\`\`\`

What's still throttled is repeatedly hitting the SAME resource: submitting to the \`"classic"\`
category twice within 2 seconds, saving to the \`"profile"\` slot twice within 2 seconds, or
unlocking the same achievement id twice within 2 seconds. Submitting to \`"classic"\` and
\`"speed-run"\` back to back, or saving to two different slots, is unaffected - those are different
resources.

\`getHighscores\`, \`getJsonBlob\`, \`getAchievements\` and everything under \`ugc.*\` are NOT signed
and are unaffected by this entirely - only the three calls that mutate anti-cheat-relevant state are.
\`;
