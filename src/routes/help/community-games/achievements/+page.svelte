<script lang="ts">
	import { Button, CodeSnippet, Flex, navigateBack } from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";

	import { achievements as achievementsDocs } from "$lib/content/communityGamesDocs";
	import { copyDocsForAi } from "$lib/utils/copyDocsForAi";
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" height="fit-content">
			<h2>Achievements</h2>
			<Button iconbefore="arrow_back" onclick={() => navigateBack()}>Back</Button>
		</Flex>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			<a href="/help/community-games">← All Community Games topics</a>
		</p>
		<Flex height="fit-content">
			<Button
				appearance="subtle"
				iconbefore="content_copy"
				onclick={() => copyDocsForAi(achievementsDocs, "The Achievements page")}>
				Copy this page for AI
			</Button>
		</Flex>

		<h3 style="margin-top: 1rem;">
			<code>DavidnetSDK.unlockAchievement({'{'} id, name, description?, icon?, progress?, target? {'}'})</code>
		</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Unlocks (or advances) an achievement for the current player. <code>id</code> is a stable
			string YOU choose (letters, numbers, <code>-</code>/<code>_</code>, up to 100 chars) — unique
			within your game, not globally, so keep it short and stable (e.g. <code>"first_win"</code>,
			not something you'll rename later). <code>name</code> is what's shown to the player;
			<code>description</code>
			 and <code>icon</code> (an emoji works well) are optional. Resolves to:
			<code>
				{'{'} isNew, achievement: {'{'} id, name, description, icon, progress, target, unlockedAt {'}'}
				{'}'}
			</code>
		</p>

		<h3 style="margin-top: 1.5rem;">Classic instant unlock</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Without <code>progress</code>/<code>target</code>: first call wins — if the player already has
			this <code>id</code>, the stored name/description/icon don't change. Repeat calls are cheap
			no-ops server-side, but still call this ONCE when the condition first becomes true, not in a
			loop that re-checks the condition every frame — each call is still a network round trip that
			counts against your <a href="/help/community-games/rate-limits">rate limit</a>.
		</p>
		<CodeSnippet
			language="javascript"
			filename="achievement-instant.js"
			code={`// Call this from the "boss defeated" event handler, not from your update loop.
async function onBossDefeated() {
  try {
    const { isNew } = await window.DavidnetSDK.unlockAchievement({
      id: "first_boss_kill",
      name: "Giant Slayer",
      description: "Defeat the first boss",
      icon: "⚔️"
    });
    if (isNew) showMessage("Achievement unlocked: Giant Slayer!");
  } catch (e) {
    console.warn("Could not unlock achievement", e);
  }
}

// A "collect all the things" style achievement - fine to call every time an
// item is picked up, since the unlock condition is only true once.
async function onItemCollected(totalCollected, totalItems) {
  if (totalCollected !== totalItems) return; // not done yet, don't call at all
  await window.DavidnetSDK.unlockAchievement({
    id: "collector",
    name: "Completionist",
    description: "Collect every item in the game",
    icon: "🏆"
  });
}`} />

		<h3 style="margin-top: 1.5rem;">Progress-bar achievements</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			With <code>progress</code> + <code>target</code> (both positive integers): tracks a progress
			bar instead of unlocking instantly — call this every time progress changes (e.g.
			<code>{'{'} progress: 12, target: 50 {'}'}</code>
			 for "12 of 50 enemies defeated"). The server remembers the HIGHEST progress seen;
			<code>isNew</code>
			 only flips <code>true</code> the moment progress reaches target (the achievement completes),
			after which it's immutable, same as a classic achievement.
		</p>
		<CodeSnippet
			language="javascript"
			filename="achievement-progress.js"
			code={`// Call with the current/target progress whenever it changes - "isNew" only
// flips true the moment it actually completes, so this is safe to call often
// (e.g. once per enemy kill, not once per frame).
async function onEnemyDefeated(totalDefeated) {
  try {
    const { isNew, achievement } = await window.DavidnetSDK.unlockAchievement({
      id: "monster_hunter",
      name: "Monster Hunter",
      description: "Defeat 50 enemies",
      icon: "🗡️",
      progress: totalDefeated,
      target: 50
    });

    updateProgressBar(achievement.progress, achievement.target); // e.g. 23 / 50

    if (isNew) showMessage("Achievement unlocked: Monster Hunter!");
  } catch (e) {
    console.warn("Could not update achievement progress", e);
  }
}`} />

		<h3 style="margin-top: 1.5rem;"><code>DavidnetSDK.getAchievements()</code></h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Every achievement the current player has unlocked OR made progress on in THIS game.
			<code>unlockedAt</code>
			 is <code>null</code> for an in-progress (not yet completed) achievement — use this to rebuild
			a progress bar on load without tracking it yourself.
			<code>unlockedPercentage</code>
			 (0-100) is the share of players who have fully unlocked that achievement id — handy for a
			rarity badge like "3% of players have this". Resolves to:
			<code>
				{'{'} achievements: [{'{'} id, name, description, icon, progress, target, unlockedAt,
				unlockedPercentage {'}'}, ...] {'}'}
			</code>
		</p>
		<CodeSnippet
			language="javascript"
			filename="achievement-list.js"
			code={`async function showAchievementsScreen() {
  const { achievements } = await window.DavidnetSDK.getAchievements();

  for (const a of achievements) {
    const isDone = a.unlockedAt !== null;
    renderAchievementRow({
      icon: a.icon,
      name: a.name,
      description: a.description,
      done: isDone,
      progressText: a.target ? \`\${a.progress} / \${a.target}\` : null,
      rarity: a.unlockedPercentage + "% of players have this"
    });
  }
}`} />
	</Flex>
</Flex>
