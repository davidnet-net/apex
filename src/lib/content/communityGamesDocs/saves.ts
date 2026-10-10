export const saves = `## Save data

\`window.localStorage\`/\`sessionStorage\` exist in the sandbox but are polyfilled to in-memory-only
storage that is wiped on every reload — never rely on them. Use these functions for anything that
needs to survive a reload.

### DavidnetSDK.saveJsonBlob(data, options?: { slot?: string })
Returns a Promise resolving to: \`{ savedAt }\`
Persists any JSON-serializable value (object, array, etc.) as the player's save file. Max size is
about 1MB. Overwrites any previous save in that slot for this player on this game.

A game can keep MULTIPLE saves: pass \`{ slot: "hardcore" }\` (letters, numbers, \`-\`/\`_\`, up to 50
chars) to use a slot other than the default one. Omit it entirely and you get the classic
one-save-per-player behavior — fully backwards compatible.

### DavidnetSDK.getJsonBlob(options?: { slot?: string })
Returns a Promise resolving to: \`{ data, updatedAt }\`
Returns the player's previously saved value for that slot, or \`data: null\` if nothing was saved
there yet (the expected case for a brand new player, not an error). Pass \`{ slot: "hardcore" }\` to
read a non-default slot.

\`\`\`javascript
async function restoreProgress() {
  try {
    const { data, updatedAt } = await window.DavidnetSDK.getJsonBlob();
    if (data === null) {
      startNewGame();
      return;
    }
    currentLevel = data.level;
    playerInventory = data.inventory;
  } catch (e) {
    console.warn("Could not load save, starting fresh", e);
    startNewGame();
  }
}

async function onCheckpoint() {
  try {
    await window.DavidnetSDK.saveJsonBlob({ level: currentLevel, inventory: playerInventory });
  } catch (e) {
    console.warn("Could not save progress", e);
  }
}

// Two independent saves: a normal-mode save and a separate hardcore-mode save.
async function saveHardcoreMode(state) {
  await window.DavidnetSDK.saveJsonBlob(state, { slot: "hardcore" });
}
async function loadHardcoreMode() {
  const { data } = await window.DavidnetSDK.getJsonBlob({ slot: "hardcore" });
  return data; // null if this player has never played hardcore mode
}

// Multiple numbered save slots, like a classic "3 save files" menu.
async function saveToSlot(slotNumber, state) {
  await window.DavidnetSDK.saveJsonBlob(state, { slot: "slot-" + slotNumber });
}
\`\`\`

When to save: on checkpoint, level-complete, or any other clear "progress" moment, or on explicit
player action (a "Save" button, settings changed). NOT on every frame and not on a tight timer — see
Rate limits. A good rule of thumb: if the player wouldn't lose anything meaningful by closing the tab
right now, you don't need to save yet.
`;
