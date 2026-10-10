<script lang="ts">
	import { Button, CodeSnippet, Flex, navigateBack } from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";

	import { rateLimits as rateLimitsDocs } from "$lib/content/communityGamesDocs";
	import { copyDocsForAi } from "$lib/utils/copyDocsForAi";
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" height="fit-content">
			<h2>Rate limits</h2>
			<Button iconbefore="arrow_back" onclick={() => navigateBack()}>Back</Button>
		</Flex>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			<a href="/help/community-games">← All Community Games topics</a>
		</p>
		<Flex height="fit-content">
			<Button
				appearance="subtle"
				iconbefore="content_copy"
				onclick={() => copyDocsForAi(rateLimitsDocs, "The Rate limits page")}>
				Copy this page for AI
			</Button>
		</Flex>

		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Every function below shares ONE budget per player per game:
			<strong>60 calls per 10 seconds</strong>
			 (realtime has its own, separate limit — see
			<a href="/help/community-games/realtime">Realtime multiplayer</a>
			). That is generous for normal use — occasional score/save/achievement submissions, polling a
			leaderboard every few seconds — but will start rejecting calls once something loops every
			animation frame:
		</p>
		<ul style="margin: 0; padding-left: 20px; color: {token.theme.color.text.secondary}">
			<li><code>applyHighscore</code></li>
			<li><code>getHighscores</code></li>
			<li><code>saveJsonBlob</code></li>
			<li><code>getJsonBlob</code></li>
			<li><code>unlockAchievement</code></li>
			<li><code>getAchievements</code></li>
			<li><code>ugc.publishLevel</code> / <code>ugc.listLevels</code> / <code>ugc.getLevel</code> / <code>ugc.deleteLevel</code></li>
		</ul>

		<h3 style="margin-top: 1rem;">Two ways to stay under it</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			<strong>1. Trigger calls from game events, not the render loop.</strong>
			 Level-complete, boss-defeated, checkpoint, game-over — never "every frame, check if X is
			still true". See
			<a href="/help/community-games/troubleshooting">Troubleshooting</a>
			 for the most common version of this mistake.
		</p>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			<strong>2. Check your remaining budget before something call-heavy, like a live leaderboard
			widget on a timer.</strong>
			 Every successful call's result also carries a <code>rateLimit</code> field, and there's a
			dedicated method to check it without making a network call at all:
		</p>

		<h3 style="margin-top: 1.5rem;">The <code>rateLimit</code> field on every call</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Every function in the list above resolves with an extra
			<code>rateLimit: {'{'} limit, remaining, resetAt {'}'}</code>
			 field tacked onto its normal result. <code>resetAt</code> is an epoch-ms timestamp for when
			the budget refills.
		</p>
		<CodeSnippet
			language="javascript"
			filename="rate-limit-field.js"
			code={`const result = await window.DavidnetSDK.applyHighscore(finalScore);

console.log(result.rateLimit); // { limit: 60, remaining: 57, resetAt: 1739999999000 }

if (result.rateLimit.remaining < 10) {
  console.warn("Getting close to the rate limit - slow down non-essential calls");
}`} />

		<h3 style="margin-top: 1.5rem;"><code>DavidnetSDK.getRateLimitStatus()</code></h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Returns that same <code>{'{'} limit, remaining, resetAt {'}'}</code>
			 shape synchronously, with no network call at all.
			<code>null</code>
			 until your first SDK call has resolved at least once. This is the method to use when you
			need to decide WHETHER to make a call, rather than reacting to the result of one you just
			made.
		</p>
		<CodeSnippet
			language="javascript"
			filename="rate-limit-status.js"
			code={`// Self-throttle a leaderboard widget that polls getHighscores on a timer: check
// the rate limit BEFORE firing the next call instead of waiting to get rejected.
function canPollLeaderboard() {
  const status = window.DavidnetSDK.getRateLimitStatus();
  return !status || status.remaining > 5; // null (no calls yet) or plenty of budget left
}

setInterval(async () => {
  if (!canPollLeaderboard()) return;
  const { leaderboard } = await window.DavidnetSDK.getHighscores();
  renderLeaderboardRows(leaderboard);
}, 5000);`} />

		<h3 style="margin-top: 1.5rem;">If you do get rate-limited</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			The call's promise rejects, exactly like any other error — this is one more reason every SDK
			call must be wrapped in try/catch.
		</p>
		<CodeSnippet
			language="javascript"
			filename="rate-limit-rejection.js"
			code={`try {
  await window.DavidnetSDK.saveJsonBlob(state);
} catch (e) {
  // e.message is "RATELIMIT" if this specific call was the one that got rejected.
  console.warn("Save failed (possibly rate-limited):", e.message);
}`} />

		<h3 style="margin-top: 1.5rem;">Signed calls have their own, stricter cooldown</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			<code>applyHighscore</code>
			,
			<code>saveJsonBlob</code>
			 and <code>unlockAchievement</code> are "signed" calls — each one is cryptographically signed
			against your current play session as an anti-cheat measure. Separately from the 60/10s budget
			above, the server accepts <strong>at most one signed submission per session every ~2
			seconds</strong>, and that cooldown is shared across all three call types together, not tracked
			per-endpoint. A rejected one comes back with the same <code>"RATELIMIT"</code> rejection as the
			main budget.
		</p>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			This matters because "game over" is a very natural point to want to submit a score, save
			progress, AND unlock an achievement all at once — but firing all three in the same instant
			means only the first one survives; the rest get rejected. Space them out instead:
		</p>
		<CodeSnippet
			language="javascript"
			filename="signed-call-cooldown.js"
			code={`async function onGameOver(finalScore) {
  await window.DavidnetSDK.applyHighscore(finalScore).catch((e) => console.warn(e));

  await new Promise((r) => setTimeout(r, 2200));
  await window.DavidnetSDK.saveJsonBlob({ lastScore: finalScore }).catch((e) => console.warn(e));

  await new Promise((r) => setTimeout(r, 2200));
  await window.DavidnetSDK.unlockAchievement({ id: "game_over", name: "Finisher" }).catch((e) => console.warn(e));
}`} />
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			<code>getHighscores</code>
			,
			<code>getJsonBlob</code>
			,
			<code>getAchievements</code>
			 and everything under <code>ugc.*</code> are NOT signed and are unaffected by this — only the
			three calls that mutate anti-cheat-relevant state are.
		</p>
	</Flex>
</Flex>
