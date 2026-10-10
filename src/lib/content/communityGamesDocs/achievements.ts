export const achievements = `## Achievements

### DavidnetSDK.unlockAchievement({ id, name, description?, icon?, progress?, target? })
Returns a Promise resolving to:
\`{ isNew, achievement: { id, name, description, icon, progress, target, unlockedAt } }\`
Unlocks (or advances) an achievement for the current player. \`id\` is a stable string YOU choose
(letters, numbers, \`-\`/\`_\`, up to 100 chars) — unique within your game, not globally, so keep it
short and stable (e.g. \`"first_win"\`, not something you'll rename later). \`name\` is what's shown
to the player; \`description\` and \`icon\` (an emoji works well) are optional.

**Without \`progress\`/\`target\`:** classic instant unlock. First call wins: if the player already has
this \`id\`, the stored name/description/icon don't change. Repeat calls are cheap no-ops server-side,
but still call this ONCE when the condition first becomes true, not in a loop that re-checks the
condition every frame — each call is still a network round trip that counts against the rate limit.

**With \`progress\` + \`target\`** (both positive integers): tracks a progress bar instead of unlocking
instantly — call this every time progress changes (e.g. \`{ progress: 12, target: 50 }\` for "12 of 50
enemies defeated"). The server remembers the HIGHEST progress seen; \`isNew\` only flips \`true\` the
moment progress reaches target (the achievement completes), after which it's immutable, same as a
classic achievement.

\`\`\`javascript
// Classic instant unlock - call from the event handler, not the update loop.
async function onBossDefeated() {
  const { isNew } = await window.DavidnetSDK.unlockAchievement({
    id: "first_boss_kill",
    name: "Giant Slayer",
    description: "Defeat the first boss",
    icon: "⚔️"
  });
  if (isNew) showMessage("Achievement unlocked: Giant Slayer!");
}

// Progress achievement - safe to call often since "isNew" only flips true once.
async function onEnemyDefeated(totalDefeated) {
  const { isNew, achievement } = await window.DavidnetSDK.unlockAchievement({
    id: "monster_hunter",
    name: "Monster Hunter",
    icon: "🗡️",
    progress: totalDefeated,
    target: 50
  });
  updateProgressBar(achievement.progress, achievement.target); // e.g. 23 / 50
  if (isNew) showMessage("Achievement unlocked: Monster Hunter!");
}
\`\`\`

### DavidnetSDK.getAchievements()
Returns a Promise resolving to:
\`{ achievements: [{ id, name, description, icon, progress, target, unlockedAt, unlockedPercentage }] }\`
Every achievement the current player has unlocked OR made progress on in THIS game. \`unlockedAt\` is
\`null\` for an in-progress (not yet completed) achievement — use this to rebuild a progress bar on
load without tracking it yourself. \`unlockedPercentage\` (0-100) is the share of players who have
fully unlocked that achievement id — handy for a rarity badge like "3% of players have this".

\`\`\`javascript
async function showAchievementsScreen() {
  const { achievements } = await window.DavidnetSDK.getAchievements();
  for (const a of achievements) {
    renderAchievementRow({
      name: a.name,
      done: a.unlockedAt !== null,
      progressText: a.target ? a.progress + " / " + a.target : null,
      rarity: a.unlockedPercentage + "% of players have this"
    });
  }
}
\`\`\`
`;
