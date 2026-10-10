export const quickstart = `## Quickstart

The fastest path to a working integration: paste this into your game's JavaScript and adapt the
\`applySaveData\`/\`showMessage\`/\`renderLeaderboard\` calls to whatever your game actually does.
Nothing to install — \`window.DavidnetSDK\` already exists the moment your game loads.

\`\`\`javascript
// 1. Restore the player's progress once when the game boots.
async function restoreProgress() {
  try {
    const { data } = await window.DavidnetSDK.getJsonBlob();
    if (data) applySaveData(data); // data is null if this player never saved before
  } catch (e) {
    console.warn("Could not load save", e);
  }
}

// 2. Save progress whenever it changes meaningfully - on checkpoint/level-complete,
//    NOT every frame (see Rate limits).
async function onCheckpoint(state) {
  try {
    await window.DavidnetSDK.saveJsonBlob(state);
  } catch (e) {
    console.warn("Could not save progress", e);
  }
}

// 3. Submit a score on game over. The server only ever keeps your best, so this is
//    always safe to call.
async function onGameOver(finalScore) {
  try {
    const { isNewPersonalBest, isNewGlobalBest } = await window.DavidnetSDK.applyHighscore(finalScore);
    if (isNewGlobalBest) showMessage("New world record!");
    else if (isNewPersonalBest) showMessage("New personal best!");
  } catch (e) {
    console.warn("Could not submit score", e);
  }
}

// 4. Unlock an achievement ONCE when something happens - not every frame.
async function onBossDefeated() {
  try {
    const { isNew } = await window.DavidnetSDK.unlockAchievement({
      id: "first_boss_kill",       // you choose this - keep it short and stable
      name: "Giant Slayer",        // shown to the player
      description: "Defeat the first boss",
      icon: "⚔️"
    });
    if (isNew) showMessage("Achievement unlocked: Giant Slayer!");
  } catch (e) {
    console.warn("Could not unlock achievement", e);
  }
}

// 5. Show the top 10 players, e.g. on a "leaderboard" button.
async function showLeaderboard() {
  const { leaderboard } = await window.DavidnetSDK.getHighscores();
  renderLeaderboard(leaderboard); // [{ rank, username, displayName, avatarUrl, score }, ...]
}
\`\`\`

Next steps: building a multiplayer game, read Realtime multiplayer. Not writing plain JavaScript,
read Godot / other engines. Calling something often (a live leaderboard, frequent saves), read Rate
limits first.
`;
