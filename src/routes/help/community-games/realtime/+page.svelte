<script lang="ts">
	import { Button, CodeSnippet, Flex, navigateBack } from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" height="fit-content">
			<h2>Realtime multiplayer</h2>
			<Button iconbefore="arrow_back" onclick={() => navigateBack()}>Back</Button>
		</Flex>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			<a href="/help/community-games">← All Community Games topics</a>
		</p>

		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			<code>DavidnetSDK.realtime</code> is a generic, content-agnostic realtime layer under its own
			namespace: named rooms (pub/sub channels with presence and a shared state channel), a
			matchmaking queue, and a lobby-wide announcement channel. The platform never looks at what you
			send, so the exact same API works for a 2-player turn-based game, a 50+ player action game, or
			a one-way live feed (e.g. a price ticker) with no "players" at all. There is no maximum room
			size, queue size, or group size. Every method auto-connects on first use — you don't need to
			call <code>connect()</code> yourself unless you want to open the connection early.
		</p>

		<h3 style="margin-top: 1rem;">Rooms</h3>
		<ul style="margin: 0; padding-left: 20px; color: {token.theme.color.text.secondary}">
			<li>
				<code>DavidnetSDK.realtime.joinRoom(room)</code>
				 — joins a named room (created on first join, destroyed when empty; join as many as you
				like). Resolves: <code>{'{'} room, members, state {'}'}</code>
				 — <code>members</code> is everyone already in the room, each
				<code>{'{'} userId, username, displayName, avatarUrl {'}'}</code>
				,
				<code>state</code>
				 is a snapshot of every key/value set in this room so far via <code>setState</code>.
			</li>
			<li>
				<code>DavidnetSDK.realtime.leaveRoom(room)</code>
				 — Resolves: <code>{'{'} room {'}'}</code>
			</li>
			<li>
				<code>DavidnetSDK.realtime.getRoomInfo(room)</code>
				 — checks how many members are currently in a room WITHOUT joining it, e.g. to show "3/8
				players" on a lobby list before committing. Resolves:
				<code>{'{'} room, memberCount, members {'}'}</code>
			</li>
			<li>
				<code>DavidnetSDK.realtime.send(room, data, options?)</code>
				 — broadcasts any JSON-serializable <code>data</code> to everyone else currently in
				<code>room</code>
				 (max ~64kb). Pass <code>{'{'} echo: true {'}'}</code>
				 to also receive your own message back via <code>onMessage</code>. Fire-and-forget — it
				resolves once sent, it does not wait for delivery, so call it as often as your game needs
				(every input tick is fine — just not every render frame on top of that, see below).
			</li>
			<li>
				<code>DavidnetSDK.realtime.setState(room, key, value)</code>
				 — sets a named key's value for everyone in the room: the server remembers the LATEST value
				per key and hands the full set back as <code>state</code> to anyone who joins afterwards,
				plus pushes a live <code>state</code> event to everyone else already in the room. Useful for
				anything a late joiner needs to catch up on — player positions, ready/not-ready status, a
				shared scoreboard. You must be joined to the room first. Resolves:
				<code>{'{'} room, key {'}'}</code>
			</li>
		</ul>
		<CodeSnippet
			language="javascript"
			filename="realtime-room-state.js"
			code={`// Shared room state: late joiners get the current snapshot for free via joinRoom's
// "state", and everyone already in the room gets a live update via onState.
async function joinArena(room) {
  const { members, state } = await window.DavidnetSDK.realtime.joinRoom(room);

  renderPlayerList(members);
  Object.entries(state).forEach(([key, value]) => applyPlayerState(key, value));

  window.DavidnetSDK.realtime.onState(({ key, value }) => applyPlayerState(key, value));
  window.DavidnetSDK.realtime.onPresence(({ event, member }) => {
    if (event === "join") addPlayerToList(member);
    else removePlayerFromList(member.userId);
  });
}

function onMyPositionChanged(room, myUserId, position) {
  window.DavidnetSDK.realtime.setState(room, myUserId, position);
}

async function leaveArena(room) {
  await window.DavidnetSDK.realtime.leaveRoom(room);
}`} />

		<h3 style="margin-top: 1.5rem;">Sending messages</h3>
		<CodeSnippet
			language="javascript"
			filename="realtime-messages.js"
			code={`// Fires for every message sent to any room you're in.
window.DavidnetSDK.realtime.onMessage(({ room, data, from }) => {
  if (room !== currentRoom) return;
  applyOpponentMove(data, from); // from = { userId, username, displayName, avatarUrl }
});

function sendMove(room, move) {
  // Fire-and-forget - don't await every single call in a hot loop.
  window.DavidnetSDK.realtime.send(room, { type: "move", move });
}

function sendMoveAndSeeMyOwn(room, move) {
  // { echo: true } also delivers it back to yourself via onMessage - useful if
  // your rendering code treats "my move" and "opponent move" the same way.
  window.DavidnetSDK.realtime.send(room, { type: "move", move }, { echo: true });
}`} />

		<h3 style="margin-top: 1.5rem;">Matchmaking queues</h3>
		<ul style="margin: 0; padding-left: 20px; color: {token.theme.color.text.secondary}">
			<li>
				<code>DavidnetSDK.realtime.joinQueue(queue, groupSize, metadata?)</code>
				 — a matchmaking primitive. Everyone who calls <code>joinQueue</code> with the same
				<code>queue</code>
				 name should pass the same <code>groupSize</code>. As soon as <code>groupSize</code> callers
				are waiting, the server pops them off in join order and auto-creates a room for them —
				listen for it with <code>onMatched</code>. Use <code>metadata</code> (e.g. skill rating) if
				you want to build your own smarter matching on top of this — the server itself does plain
				FIFO grouping. Resolves: <code>{'{'} queue, position {'}'}</code>
			</li>
			<li>
				<code>DavidnetSDK.realtime.leaveQueue(queue)</code>
				 — Resolves: <code>{'{'} queue {'}'}</code>
			</li>
			<li>
				<code>DavidnetSDK.realtime.getQueueInfo(queue)</code>
				 — checks how many players are currently waiting in a queue WITHOUT joining it, e.g. to show
				"waiting for 2 more players" up front. Resolves: <code>{'{'} queue, waiting {'}'}</code>
			</li>
			<li>
				<code>DavidnetSDK.realtime.onMatched(callback)</code>
				 — fires once your queue found a full group: <code>{'{'} queue, room, members {'}'}</code>
				. You're already joined to <code>room</code> at this point — start calling
				<code>send(room, ...)</code>
				 / listening with <code>onMessage</code> right away.
			</li>
		</ul>
		<CodeSnippet
			language="javascript"
			filename="realtime-matchmaking.js"
			code={`// A 1v1 ranked queue. The exact same calls work for a 50-player shooter lobby by
// passing a bigger groupSize - the server doesn't care how many players end up
// in a room, it just pops "groupSize" waiting callers off in join order.
let currentRoom = null;

async function findOpponent() {
  showMessage("Searching for an opponent...");
  await window.DavidnetSDK.realtime.joinQueue("ranked-1v1", 2);
}

window.DavidnetSDK.realtime.onMatched(({ room, members }) => {
  currentRoom = room;
  showMessage("Opponent found: " + members.find((m) => m.userId !== myUserId).displayName);
});

async function cancelSearch() {
  await window.DavidnetSDK.realtime.leaveQueue("ranked-1v1");
}

// Show "waiting for N more players" on a lobby screen before joining.
async function showQueueStatus() {
  const { waiting } = await window.DavidnetSDK.realtime.getQueueInfo("ranked-1v1");
  showMessage(waiting + " player(s) currently waiting");
}`} />

		<h3 style="margin-top: 1.5rem;">Lobby-wide announcements</h3>
		<ul style="margin: 0; padding-left: 20px; color: {token.theme.color.text.secondary}">
			<li>
				<code>DavidnetSDK.realtime.announce(data, options?)</code>
				 — broadcasts to EVERY player currently connected to this game's lobby, not just a specific
				room — for server-wide-feeling announcements independent of whatever room each player is
				in. Pass <code>{'{'} echo: true {'}'}</code>
				 to also receive your own announcement back. Fire-and-forget. Resolves:
				<code>{'{'}{'}'}</code>
			</li>
			<li>
				<code>DavidnetSDK.realtime.onAnnouncement(callback)</code>
				 — fires for every lobby-wide announcement from any connected player of this game:
				<code>{'{'} data, from, ts {'}'}</code>
				.
			</li>
		</ul>
		<CodeSnippet
			language="javascript"
			filename="realtime-announce.js"
			code={`// "Player X just beat the boss!" style feed, visible to everyone in the lobby
// regardless of which room (if any) they're currently in.
window.DavidnetSDK.realtime.onAnnouncement(({ data, from }) => {
  if (data.type === "boss-defeated") {
    showToast(from.displayName + " just beat the boss!");
  }
});

async function onBossDefeated() {
  await window.DavidnetSDK.realtime.announce({ type: "boss-defeated" });
}`} />

		<h3 style="margin-top: 1.5rem;">Connection lifecycle</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			<code>DavidnetSDK.realtime.onDisconnect(callback)</code>
			 /
			<code>onReconnect(callback)</code>
			 /
			<code>onError(callback)</code>
			 — the connection reconnects automatically in the background and silently rejoins your rooms.
			<code>onDisconnect</code>
			 fires when the connection drops, <code>onReconnect</code> fires after it's restored (with the
			rooms that were rejoined, so you can resync game state), and <code>onError</code> fires for
			server-side errors not tied to a specific call (e.g. rate-limited, or sent to a room you're not
			in): <code>{'{'} code, message {'}'}</code>
		</p>
		<CodeSnippet
			language="javascript"
			filename="realtime-lifecycle.js"
			code={`window.DavidnetSDK.realtime.onDisconnect(() => {
  showConnectionBanner("Reconnecting...");
});

window.DavidnetSDK.realtime.onReconnect(({ rooms }) => {
  hideConnectionBanner();
  // "rooms" were silently rejoined - you may still want to re-sync game state,
  // e.g. by re-requesting the authoritative host's latest state.
  requestStateResync(rooms);
});

window.DavidnetSDK.realtime.onError(({ code, message }) => {
  console.warn("Realtime error:", code, message);
});`} />

		<h3 style="margin-top: 1.5rem;">Realtime's own rate limit</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Realtime has its own separate rate limit — 200 messages per second per connection, enforced
			over the WebSocket itself. This is unrelated to the per-player-per-game budget described in
			<a href="/help/community-games/rate-limits">Rate limits</a>
			, which only covers highscores/saves/achievements/levels —
			<code>DavidnetSDK.getRateLimitStatus()</code>
			 does NOT reflect this realtime limit. 200/s is far more than any browser game needs for input
			sync — most games are fine sending whenever game state actually changes (e.g. 10-30 times a
			second), not on every animation frame.
		</p>

		<h3 style="margin-top: 1.5rem;">Anti-cheat: the server is a dumb relay</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			For realtime games, treat the server as a dumb relay: it does not validate move legality, game
			rules, or physics. If your game needs to be cheat-resistant, have one client act as an
			authoritative host (e.g. whoever created the room) and treat other players' messages as input
			suggestions, not trusted state — same tradeoff as the anti-cheat model used for highscores.
		</p>
	</Flex>
</Flex>
