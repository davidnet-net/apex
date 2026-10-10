export const levels = `## Community/UGC levels: DavidnetSDK.ugc

A generic level-upload system. Level data is an opaque JSON blob — the platform never looks inside
it, so it works for any level/map/track format your game defines. Levels are public once published:
any player can list and download them, same trust model as the rest of this sandboxed game.

### DavidnetSDK.ugc.publishLevel({ id?, title, data })
Returns a Promise resolving to: \`{ id, title, createdAt, updatedAt }\`
Publishes a new level, or — if you pass the \`id\` of a level you own — overwrites it in place.
\`title\` is required (up to 100 chars); \`data\` is your opaque level payload.

### DavidnetSDK.ugc.listLevels(options?: { mine?: boolean, limit?: number, offset?: number })
Returns a Promise resolving to:
\`{ levels: [{ id, title, creator, creatorDisplayName, createdAt, updatedAt }], hasMore }\`
Lists published levels for this game, newest first. Pass \`{ mine: true }\` to list only your own,
\`{ limit, offset }\` to page through them (\`limit\` defaults to 20, max 50). Does NOT include the
level data itself — call \`getLevel\` once the player picks one.

### DavidnetSDK.ugc.getLevel(id: string)
Returns a Promise resolving to:
\`{ id, title, data, creator, creatorDisplayName, createdAt, updatedAt }\`

### DavidnetSDK.ugc.deleteLevel(id: string)
Returns a Promise resolving to: \`{ id }\`
Deletes a level you published (or any level, if you're the game's creator).

\`\`\`javascript
async function publishMyLevel(levelData) {
  const { id } = await window.DavidnetSDK.ugc.publishLevel({ title: "Lava Castle", data: levelData });
  return id; // save this if you want to let the player edit it later
}

let offset = 0;
async function loadNextPage() {
  const { levels, hasMore } = await window.DavidnetSDK.ugc.listLevels({ limit: 20, offset });
  renderLevelBrowser(levels); // each entry has { id, title, creator, ... } - no "data" yet
  offset += levels.length;
  showLoadMoreButton(hasMore);
}

async function playLevel(levelId) {
  const { data } = await window.DavidnetSDK.ugc.getLevel(levelId);
  loadLevel(data); // your game's own format, whatever you passed to publishLevel
}
\`\`\`
`;
