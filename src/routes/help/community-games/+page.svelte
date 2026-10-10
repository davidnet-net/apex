<script lang="ts">
	import { Button, Flex, navigateBack } from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";
	import HorizontalCard from "$lib/components/HorizontalCard/HorizontalCard.svelte";
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" height="fit-content">
			<h2>Community Games developer docs</h2>
			<Button
				iconbefore="arrow_back"
				onclick={() => {
					navigateBack();
				}}>
				Back
			</Button>
		</Flex>

		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Everything you need to build a Davidnet community game, in plain language, with a runnable
			example for every feature. You do not need an AI assistant to use this — every function is
			documented here with its exact signature and what it returns.
		</p>

		<h3 style="margin-top: 1rem;">How this works</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			A community game is an HTML5 game (a .zip with an <code>index.html</code> at its root) that
			runs inside a sandboxed <code>&lt;iframe&gt;</code> on the game's player page. That sandbox is
			deliberately restrictive — no real cookies, no real <code>localStorage</code>
			/
			<code>sessionStorage</code>
			, and your game's own code cannot make outbound <code>fetch()</code>/<code>WebSocket</code>
			 calls to anything, including Davidnet's own API directly. None of that matters in practice,
			because the moment your game loads, a <code>window.DavidnetSDK</code> object is automatically
			injected into it — highscores, save data, achievements, community levels and realtime
			multiplayer all go through that object instead, talking to the parent player page over
			<code>postMessage</code>
			 (which isn't a network request, so the sandbox doesn't block it). You never write any
			networking or <code>postMessage</code> code yourself.
		</p>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			This works no matter what built your game. <code>window.DavidnetSDK</code> is injected into the
			<code>index.html</code>
			 file itself, at the HTML level — a plain hand-written JS game, a Godot HTML5/WebAssembly
			export, a Unity WebGL build, all get the exact same object. See
			<a href="/help/community-games/godot">Using the SDK from Godot / other engines</a>
			 if you're not writing plain JavaScript.
		</p>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			One rule that applies everywhere below: every <code>DavidnetSDK</code> function returns a
			Promise and <strong>rejects</strong> on error, timeout, or a rate limit — always wrap calls in
			try/catch so a network hiccup never crashes your game. See
			<a href="/help/community-games/troubleshooting">Troubleshooting</a>
			 for the mistakes that come up most.
		</p>

		<h3 style="margin-top: 1.5rem;">Topics</h3>
		<Flex gap="medium" height="fit-content" marginBottom="giant" flexWrap="wrap">
			<HorizontalCard
				title="Quickstart"
				icon="rocket_launch"
				href="/help/community-games/quickstart"
				description="From zero to a working integration: restore progress, save, submit a score, unlock an achievement." />
			<HorizontalCard
				title="Highscores & leaderboards"
				icon="trophy"
				href="/help/community-games/highscores"
				description="Submit scores, read the top 10, and run more than one leaderboard per game." />
			<HorizontalCard
				title="Save data"
				icon="save"
				href="/help/community-games/saves"
				description="Persist player progress as JSON, with named slots for multiple saves." />
			<HorizontalCard
				title="Achievements"
				icon="military_tech"
				href="/help/community-games/achievements"
				description="Instant unlocks and progress-bar achievements, plus rarity percentages." />
			<HorizontalCard
				title="Community levels (UGC)"
				icon="map"
				href="/help/community-games/levels"
				description="Let players publish and browse each other's levels/maps as opaque JSON." />
			<HorizontalCard
				title="Realtime multiplayer"
				icon="groups"
				href="/help/community-games/realtime"
				description="Rooms, shared state, matchmaking queues and lobby-wide announcements." />
			<HorizontalCard
				title="Rate limits"
				icon="speed"
				href="/help/community-games/rate-limits"
				description="How much you can call, how to check your remaining budget, and how to self-throttle." />
			<HorizontalCard
				title="Godot / other engines"
				icon="sports_esports"
				href="/help/community-games/godot"
				description="Bridging window.DavidnetSDK's JS Promises into GDScript (or another non-JS engine)." />
			<HorizontalCard
				title="Troubleshooting"
				icon="build"
				href="/help/community-games/troubleshooting"
				description="Common mistakes, upload/zip issues, and what the sandbox actually blocks." />
		</Flex>
	</Flex>
</Flex>
