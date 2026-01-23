import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface GameState {
    sharedLives: number;
    sharedScore: number;
    sharedStars: number;
    levelSeed: number;
    isLevelComplete: boolean;
}

interface PlayerData {
    id: string;
    name: string;
    x: number;
    y: number;
    z: number;
    rot: number;
    isBig: boolean;
    hasFirePower: boolean;
    lastSeen: number;
}

// In-memory state voor multiplayer
let globalState: GameState = {
    sharedLives: 3,
    sharedScore: 0,
    sharedStars: 0,
    levelSeed: Math.floor(Math.random() * 999999),
    isLevelComplete: false
};

const players = new Map<string, PlayerData>();

export const POST: RequestHandler = async ({ request }) => {
    const { action, id, payload } = await request.json();
    const now = Date.now();

    // Opschonen van inactieve spelers (> 5 seconden)
    for (const [pid, pdata] of players.entries()) {
        if (now - pdata.lastSeen > 5000) players.delete(pid);
    }

    if (action === 'update') {
        players.set(id, { ...payload, id, lastSeen: now });
    } else if (action === 'death') {
        globalState.sharedLives = Math.max(0, globalState.sharedLives - 1);
    } else if (action === 'score') {
        globalState.sharedScore += (payload.amount || 0);
        if (payload.isStar) globalState.sharedStars += 1;
    } else if (action === 'finish') {
        if (!globalState.isLevelComplete) {
            globalState.isLevelComplete = true;
            // Genereer een nieuw zaadje voor het volgende gedeelde level
            globalState.levelSeed = Math.floor(Math.random() * 999999);
            // Reset status na een paar seconden zodat clients kunnen herladen
            setTimeout(() => { globalState.isLevelComplete = false; }, 3000);
        }
    }

    return json({
        gameState: globalState,
        players: Array.from(players.values()).filter(p => p.id !== id)
    });
};