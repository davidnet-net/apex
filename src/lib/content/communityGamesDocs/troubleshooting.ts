export const troubleshooting = `## Troubleshooting

### "My game won't upload"
- **\`index.html\` not at the root of the .zip.** A zip containing a single top-level folder (e.g.
  from "Compress" on macOS, or a build tool that wraps output in \`dist/\`) will fail — re-zip so
  \`index.html\` is directly at the top level, not nested one level in.
- **File too large.** Large binary assets (uncompressed audio, big textures) are the usual cause —
  compress before zipping.

### "My game loads but nothing I do seems to save/submit"
- **Check the browser console inside the game's iframe.** An unhandled rejection from a forgotten
  try/catch will usually just silently stop your game's logic at that exact point.
- **Trying to \`fetch()\` your own API, or a third-party API.** This is blocked on purpose — go
  through \`window.DavidnetSDK\` instead.
- **Reading/writing \`localStorage\` expecting it to persist.** It's polyfilled to in-memory-only
  storage and is wiped on every reload — use \`saveJsonBlob\`/\`getJsonBlob\`.
- **Getting rejected with \`"RATELIMIT"\`.** See Rate limits — likely something is calling an SDK
  function in a loop instead of on a game event.

### "Calling an SDK function every frame"
This is the single most common mistake. Repeat calls to \`unlockAchievement\` or \`applyHighscore\`
are cheap no-ops server-side, which makes it tempting to call them from your update loop "just in
case" — but each call is still a real network round trip and counts against the rate limit.

\`\`\`javascript
// Don't do this:
function update() {
  if (boss.isDead) {
    window.DavidnetSDK.unlockAchievement({ id: "boss_kill", name: "Boss Kill" });
  }
}

// Do this instead - call it from the exact place the boss actually dies:
function onBossDeath() { // called once, from the boss's own death logic
  window.DavidnetSDK.unlockAchievement({ id: "boss_kill", name: "Boss Kill" });
}
\`\`\`

### What the sandbox actually blocks
Your game runs inside a locked-down \`<iframe>\`, but that does NOT mean "no internet access" — it's
more specific than that:
- **Loading things is fine.** Pulling in a game engine, library, font, image, or sound/video from an
  external CDN works exactly like it would on any normal webpage.
- **Your game's own code calling out is blocked.** No \`fetch\`, no raw \`WebSocket\` to a random
  server — blocked on purpose, mainly so a game can't quietly send players' data somewhere else.
- **No real cookies or browser storage.** Anything that needs to survive a reload must go through
  the SDK's save data functions, not \`localStorage\`.
- **Talking to Davidnet itself** (scores, saves, multiplayer) always goes through
  \`window.DavidnetSDK\`, never a direct network call.
- **Nesting another iframe inside your game is blocked outright.**

### General rules
- All \`DavidnetSDK\` functions return a Promise and REJECT on error or timeout (10s) — always wrap
  calls in try/catch.
- Call \`getJsonBlob()\` once on load to restore progress, and \`saveJsonBlob()\` whenever the
  player's state changes meaningfully — not every frame.
- Do not implement your own leaderboard UI assumptions beyond what \`getHighscores()\` returns; the
  platform already renders a full leaderboard and highscore display around your game.
`;
