import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

let globalState = {
    sharedLives: 3,
    sharedScore: 0,
    levelSeed: Math.floor(Math.random() * 999999),
    isLevelComplete: false
};

const players = new Map();

export const POST: RequestHandler = async ({ request }) => {
    const { action, id, payload } = await request.json();
    const now = Date.now();

    // Opschonen inactieve spelers
    for (const [pid, pdata] of players.entries()) {
        if (now - pdata.lastSeen > 5000) players.delete(pid);
    }

    if (action === 'update') {
        players.set(id, { ...payload, id, lastSeen: now });
    } else if (action === 'death') {
        globalState.sharedLives = Math.max(0, globalState.sharedLives - 1);
    } else if (action === 'score') {
        globalState.sharedScore += payload.amount || 0;
    } else if (action === 'finish') {
        if (!globalState.isLevelComplete) {
            globalState.isLevelComplete = true;
            globalState.levelSeed = Math.floor(Math.random() * 999999);
            // Reset vlag na 3 seconden zodat iedereen kan laden
            setTimeout(() => { globalState.isLevelComplete = false; }, 3000);
        }
    } else if (action === 'restart') {
        globalState.sharedLives = 3;
        globalState.sharedScore = 0;
        globalState.levelSeed = Math.floor(Math.random() * 999999);
    }

    return json({
        gameState: globalState,
        players: Array.from(players.values()).filter(p => p.id !== id)
    });
};