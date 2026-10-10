// Shared preamble for the master AI reference doc (index page) - architecture context that
// applies to every topic below it, not specific to any one page.
export const intro = `# Davidnet Community Games — Platform SDK

A community game is an HTML5 game (a .zip with an \`index.html\` at its root) that runs inside a
sandboxed \`<iframe>\` on the game's player page, with its own opaque origin: no cookies, and no real
\`localStorage\`/\`sessionStorage\` (both exist but are polyfilled to no-ops, so anything written to
them vanishes on reload). Network access is NOT fully blocked — it's asymmetric, enforced by the
iframe's Content-Security-Policy:

- Loading external resources — \`<script src>\`, \`<link rel="stylesheet">\`, \`<img>\`,
  \`<audio>\`/\`<video>\`, \`@font-face\`, etc. — from ANY host is allowed. Pulling a game engine,
  library, font or asset from a CDN (cdnjs, jsdelivr, unpkg, Google Fonts, …) is fine and common.
- Your code CANNOT make its own outbound \`fetch()\`/\`XMLHttpRequest\`/\`WebSocket\`/\`EventSource\`
  calls to third-party domains — \`connect-src\` is locked to the same origin that served your game
  files. This is a deliberate anti-exfiltration boundary, not a bug: don't design the game around
  calling some other API (or even Davidnet's own API directly) — it will be blocked.
- Nesting another \`<iframe>\` inside your game is blocked outright (\`frame-src 'none'\`).
- All communication with Davidnet itself — highscores, save data, achievements, community levels,
  realtime multiplayer — happens exclusively through \`window.DavidnetSDK\`, which is automatically
  injected into every uploaded \`index.html\`. Under the hood it talks to the parent page via
  \`postMessage\`, which is NOT subject to \`connect-src\` (it isn't a network request from the
  browser's point of view). You do NOT need to write any postMessage or networking code yourself;
  just call these functions from your game code.

This works no matter what built your game — \`window.DavidnetSDK\` is injected at the HTML level, not
tied to any particular engine or language. A Godot HTML5/WebAssembly export, a Unity WebGL build, or
a plain hand-written JS game all get the exact same object (see the Godot/other-engines section).

One rule that applies everywhere below: every \`DavidnetSDK\` function returns a Promise and
**REJECTS** on error, timeout (10s), or a rate limit — always wrap calls in try/catch so a network
hiccup never crashes the game.
`;
