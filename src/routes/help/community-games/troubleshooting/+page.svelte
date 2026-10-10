<script lang="ts">
	import { Button, CodeSnippet, Flex, navigateBack } from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";

	import { troubleshooting as troubleshootingDocs } from "$lib/content/communityGamesDocs";
	import { copyDocsForAi } from "$lib/utils/copyDocsForAi";
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" height="fit-content">
			<h2>Troubleshooting</h2>
			<Button iconbefore="arrow_back" onclick={() => navigateBack()}>Back</Button>
		</Flex>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			<a href="/help/community-games">← All Community Games topics</a>
		</p>
		<Flex height="fit-content">
			<Button
				appearance="subtle"
				iconbefore="content_copy"
				onclick={() => copyDocsForAi(troubleshootingDocs, "The Troubleshooting page")}>
				Copy this page for AI
			</Button>
		</Flex>

		<h3 style="margin-top: 1rem;">"My game won't upload"</h3>
		<ul style="margin: 0; padding-left: 20px; color: {token.theme.color.text.secondary}">
			<li>
				<strong><code>index.html</code> not at the root of the .zip.</strong>
				 A zip containing a single top-level folder (e.g. from "Compress" on macOS, or a build tool
				that wraps output in <code>dist/</code>) will fail — re-zip so <code>index.html</code> is
				directly at the top level, not nested one level in. Check by opening the zip: you should
				see
				<code>index.html</code>
				 immediately, not a folder you have to open first.
			</li>
			<li>
				<strong>File too large.</strong>
				 Large binary assets (uncompressed audio, big textures) are the usual cause — compress
				audio to a lossy format and textures to a reasonable resolution before zipping.
			</li>
		</ul>

		<h3 style="margin-top: 1.5rem;">"My game loads but nothing I do seems to save/submit"</h3>
		<ul style="margin: 0; padding-left: 20px; color: {token.theme.color.text.secondary}">
			<li>
				<strong>Check the browser console inside the game's iframe.</strong>
				 An unhandled rejection from a forgotten try/catch will usually just silently stop your
				game's logic at that exact point, with no visible error to the player — but it WILL show
				up in devtools.
			</li>
			<li>
				<strong>Trying to <code>fetch()</code> your own API, or a third-party API.</strong>
				 This is blocked on purpose (see "What the sandbox blocks", below) — go through
				<code>window.DavidnetSDK</code>
				 instead for anything that needs to reach Davidnet, and note that direct calls to any OTHER
				API are blocked too, not just Davidnet's.
			</li>
			<li>
				<strong>Reading/writing <code>localStorage</code> expecting it to persist.</strong>
				 It's polyfilled to in-memory-only storage and is wiped on every reload — use
				<code>saveJsonBlob</code>
				/
				<code>getJsonBlob</code>
				 (see <a href="/help/community-games/saves">Save data</a>) for anything that needs to
				survive a reload.
			</li>
			<li>
				<strong>Getting rejected with <code>"RATELIMIT"</code>.</strong>
				 See <a href="/help/community-games/rate-limits">Rate limits</a> — likely something is
				calling an SDK function in a loop (e.g. every frame) instead of on a game event.
			</li>
		</ul>

		<h3 style="margin-top: 1.5rem;">"Calling an SDK function every frame"</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			This is the single most common mistake. Repeat calls to <code>unlockAchievement</code> or
			<code>applyHighscore</code>
			 are cheap no-ops server-side, which makes it tempting to call them from your update loop
			"just in case" — but each call is still a real network round trip and counts against your
			<a href="/help/community-games/rate-limits">rate limit</a>
			. Always trigger from the actual event instead:
		</p>
		<CodeSnippet
			language="javascript"
			filename="troubleshooting-every-frame.js"
			code={`// Don't do this:
function update() {
  if (boss.isDead) {
    window.DavidnetSDK.unlockAchievement({ id: "boss_kill", name: "Boss Kill" });
  }
}

// Do this instead - track whether you've already handled it, or better,
// call it from the exact place the boss actually dies:
let bossKillHandled = false;
function update() {
  if (boss.isDead && !bossKillHandled) {
    bossKillHandled = true;
    window.DavidnetSDK.unlockAchievement({ id: "boss_kill", name: "Boss Kill" });
  }
}

function onBossDeath() { // called once, from the boss's own death logic
  window.DavidnetSDK.unlockAchievement({ id: "boss_kill", name: "Boss Kill" });
}`} />

		<h3 style="margin-top: 1.5rem;">What the sandbox actually blocks</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Your game runs inside a locked-down <code>&lt;iframe&gt;</code>, but that does
			<strong>not</strong>
			 mean "no internet access" — it's more specific than that:
		</p>
		<ul style="margin: 0; padding-left: 20px; color: {token.theme.color.text.secondary}">
			<li>
				<strong>Loading things is fine.</strong>
				 Pulling in a game engine, library, font, image, or sound/video from an external CDN
				(cdnjs, jsdelivr, unpkg, Google Fonts, ...) works exactly like it would on any normal
				webpage.
			</li>
			<li>
				<strong>Your game's own code calling out is blocked.</strong>
				 It cannot make its own requests to other websites or APIs (no <code>fetch</code>, no raw
				<code>WebSocket</code>
				 to a random server) — that's blocked on purpose, mainly so a game can't quietly send
				players' data somewhere else.
			</li>
			<li>
				<strong>No real cookies or browser storage.</strong>
				 Anything that needs to survive a reload must go through
				<a href="/help/community-games/saves">the SDK's save data functions</a>
				, not <code>localStorage</code>.
			</li>
			<li>
				<strong>Talking to Davidnet itself</strong>
				 (scores, saves, multiplayer) always goes through <code>window.DavidnetSDK</code>, never a
				direct network call — that's how it gets through even though direct outbound requests are
				blocked.
			</li>
			<li>
				<strong>Nesting another iframe inside your game is blocked outright.</strong>
				 No legitimate HTML5 game needs to embed a third-party iframe.
			</li>
		</ul>

		<h3 style="margin-top: 1.5rem;">General rules</h3>
		<ul style="margin: 0; padding-left: 20px; color: {token.theme.color.text.secondary}">
			<li>
				All <code>DavidnetSDK</code> functions return a Promise and REJECT on error or timeout
				(10s) — always wrap calls in try/catch so a network hiccup never crashes the game.
			</li>
			<li>
				Call <code>getJsonBlob()</code> once on load to restore progress, and
				<code>saveJsonBlob()</code>
				 whenever the player's state changes meaningfully — not every frame.
			</li>
			<li>
				Do not implement your own leaderboard UI assumptions beyond what
				<code>getHighscores()</code>
				 returns; the platform already renders a full leaderboard and highscore display around
				your game.
			</li>
			<li>
				Still stuck? See <a href="/help/community-games">the full topic list</a> or
				<a href="/help/tickets">contact support</a>.
			</li>
		</ul>
	</Flex>
</Flex>
