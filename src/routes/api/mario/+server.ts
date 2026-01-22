import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Interface voor de gedeelde spelstatus op de server.
 */
interface GameState {
    sharedLives: number;
    totalStarsCollected: number;
    levelSeed: number;
    isLevelComplete: boolean;
}

/**
 * Interface voor individuele spelerdata.
 */
interface PlayerData {
    id: string;
    x: number;
    y: number;
    z: number;
    rot: number;
    isBig: boolean;
    hasFirePower: boolean;
    lastSeen: number;
}

// In-memory staat (reset bij server restart)
let globalGameState: GameState = {
    sharedLives: 3,
    totalStarsCollected: 0,
    levelSeed: Math.floor(Math.random() * 1000000),
    isLevelComplete: false
};

const players = new Map<string, PlayerData>();

/**
 * Verwijdert spelers die langer dan 5 seconden geen update hebben gestuurd.
 */
function purgeInactivePlayers() {
    const now = Date.now();
    for (const [id, data] of players.entries()) {
        if (now - data.lastSeen > 5000) {
            players.delete(id);
        }
    }
}

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json();
    const { action, id, payload } = body;

    purgeInactivePlayers();

    if (action === 'update') {
        // Update speler positie
        players.set(id, {
            ...payload,
            id,
            lastSeen: Date.now()
        });
    } 
    else if (action === 'death') {
        // Iedereen verliest een leven
        globalGameState.sharedLives = Math.max(0, globalGameState.sharedLives - 1);
    } 
    else if (action === 'finish') {
        // Level gehaald: genereer nieuw seed en reset vlag
        if (!globalGameState.isLevelComplete) {
            globalGameState.isLevelComplete = true;
            globalGameState.levelSeed = Math.floor(Math.random() * 1000000);
            // Korte delay zodat clients de overgang kunnen zien
            setTimeout(() => { globalGameState.isLevelComplete = false; }, 2000);
        }
    }
    else if (action === 'collectStar') {
        globalGameState.totalStarsCollected++;
    }

    const otherPlayers = Array.from(players.values()).filter(p => p.id !== id);

    return json({
        gameState: globalGameState,
        players: otherPlayers
    });
};