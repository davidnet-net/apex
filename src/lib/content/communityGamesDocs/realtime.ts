export const realtime = `## Realtime multiplayer: DavidnetSDK.realtime

A generic, content-agnostic real-time layer: named rooms (pub/sub channels with presence and a
per-room state channel), a matchmaking queue, and a lobby-wide announcement channel. The platform
never looks at what you send, so the exact same API works for a 2-player turn-based game, a 50+
player action game, or a one-way live feed with no "players" at all. There is no maximum room size,
queue size, or group size. All methods auto-connect on first use.

### DavidnetSDK.realtime.joinRoom(room: string)
Returns a Promise resolving to: \`{ room, members, state }\` — \`members\` is everyone already in the
room (each \`{ userId, username, displayName, avatarUrl }\`), \`state\` is a snapshot of every
key/value set in this room so far via \`setState\`. Rooms are created on first join and destroyed
when empty — just pick a name. Join as many rooms as you like.

### DavidnetSDK.realtime.leaveRoom(room: string)
Returns a Promise resolving to: \`{ room }\`

### DavidnetSDK.realtime.getRoomInfo(room: string)
Returns a Promise resolving to: \`{ room, memberCount, members }\`
Checks how many members are currently in a room WITHOUT joining it.

### DavidnetSDK.realtime.send(room: string, data, options?: { echo?: boolean })
Broadcasts any JSON-serializable \`data\` to everyone else currently in \`room\` (max ~64kb). Pass
\`{ echo: true }\` to also receive your own message back via \`onMessage\`. Fire-and-forget — it
resolves once sent, it does not wait for delivery, so call it as often as your game needs (every
input tick is fine).

### DavidnetSDK.realtime.setState(room: string, key: string, value)
Returns a Promise resolving to: \`{ room, key }\`
Sets a named key's value for everyone in the room: the server remembers the LATEST value per key and
hands the full set back as \`state\` to anyone who joins afterwards, plus pushes a live \`state\`
event to everyone else already in the room. You must be joined to the room first.

### DavidnetSDK.realtime.joinQueue(queue: string, groupSize: number, metadata?)
A matchmaking primitive. Returns a Promise resolving to: \`{ queue, position }\`. Everyone who calls
\`joinQueue\` with the same \`queue\` name should pass the same \`groupSize\`. As soon as \`groupSize\`
callers are waiting, the server pops them off in join order and auto-creates a room for them —
listen for it with \`onMatched\`.

### DavidnetSDK.realtime.leaveQueue(queue: string)
Returns a Promise resolving to: \`{ queue }\`

### DavidnetSDK.realtime.getQueueInfo(queue: string)
Returns a Promise resolving to: \`{ queue, waiting }\`

### DavidnetSDK.realtime.onMatched(callback)
Fires once your queue found a full group: \`{ queue, room, members }\`. You're already joined to
\`room\` at this point.

### DavidnetSDK.realtime.announce(data, options?: { echo?: boolean })
Returns a Promise resolving to: \`{}\`
Broadcasts to EVERY player currently connected to this game's lobby, not just a specific room.

### DavidnetSDK.realtime.onMessage(callback) / onPresence(callback) / onState(callback) / onAnnouncement(callback)
Fire for: messages in any room you're in (\`{ room, data, from, ts }\`), join/leave events
(\`{ room, event: "join"|"leave", member }\`), \`setState\` calls (\`{ room, key, value, from }\`), and
lobby-wide announcements (\`{ data, from, ts }\`), respectively. All return an unsubscribe function.

### DavidnetSDK.realtime.onDisconnect(callback) / onReconnect(callback) / onError(callback)
The connection reconnects automatically in the background and silently rejoins your rooms.
\`onDisconnect\` fires when the connection drops, \`onReconnect\` fires after it's restored (with the
rooms that were rejoined, so you can resync game state), and \`onError\` fires for server-side
errors not tied to a specific call (e.g. rate-limited): \`{ code, message }\`.

\`\`\`javascript
// Matchmaking + move exchange (works the same for groupSize 2 or 50).
let currentRoom = null;
async function findOpponent() {
  await window.DavidnetSDK.realtime.joinQueue("ranked-1v1", 2);
}
window.DavidnetSDK.realtime.onMatched(({ room }) => {
  currentRoom = room;
  showMessage("Opponent found!");
});
window.DavidnetSDK.realtime.onMessage(({ room, data, from }) => {
  if (room !== currentRoom) return;
  applyOpponentMove(data, from);
});
function sendMove(move) {
  window.DavidnetSDK.realtime.send(currentRoom, { type: "move", move });
}

// Shared room state: late joiners get the current snapshot via joinRoom's "state",
// everyone already in the room gets a live update via onState.
async function joinArena(room) {
  const { state } = await window.DavidnetSDK.realtime.joinRoom(room);
  Object.entries(state).forEach(([key, value]) => applyPlayerState(key, value));
  window.DavidnetSDK.realtime.onState(({ key, value }) => applyPlayerState(key, value));
}
function onMyPositionChanged(room, myUserId, position) {
  window.DavidnetSDK.realtime.setState(room, myUserId, position);
}
\`\`\`

**Realtime has its own separate rate limit** — 200 messages per second per connection, enforced over
the WebSocket itself. This is unrelated to the per-player-per-game HTTP budget described under Rate
limits (which only covers highscores/saves/achievements/levels) — \`getRateLimitStatus()\` does NOT
reflect this. 200/s is far more than any browser game needs for input sync — most games are fine
sending whenever game state actually changes (e.g. 10-30 times a second), not on every frame.

**The server does not validate anything you send** — it is a dumb relay, not an authority on move
legality, game rules, or physics. If your game needs to be cheat-resistant, have one client (e.g.
whoever created the room) act as an authoritative host and treat other players' messages as input
suggestions, not trusted state — same tradeoff as the anti-cheat model used for highscores.
`;
