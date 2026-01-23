import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// De centrale 'waarheid' van de server
let globalState = {
    sharedLives: 3,
    sharedScore: 0,
    sharedStars: 0,
    // Dit zaadje zorgt dat iedereen DEZELFDE map ziet
    levelSeed: Math.floor(Math.random() * 999999),
    isLevelComplete: false
};

const players = new Map();

export const POST: RequestHandler = async ({ request }) => {
    const { action, id, payload } = await request.json();
    const now = Date.now();

    // 1. Schoon inactieve spelers op (langer dan 5s stil)
    for (const [pid, pdata] of players.entries()) {
        if (now - pdata.lastSeen > 5000) players.delete(pid);
    }

    // 2. Verwerk de actie
    if (action === 'update') {
        players.set(id, { ...payload, id, lastSeen: now });
    } 
    else if (action === 'death') {
        // Iedereen verliest een leven
        globalState.sharedLives = Math.max(0, globalState.sharedLives - 1);
    } 
    else if (action === 'score') {
        globalState.sharedScore += payload.amount || 0;
        if (payload.isStar) globalState.sharedStars += 1;
    } 
    else if (action === 'finish') {
        if (!globalState.isLevelComplete) {
            globalState.isLevelComplete = true;
            globalState.levelSeed = Math.floor(Math.random() * 999999);
            // Na 3 seconden resetten we de finish-status, map is dan al veranderd
            setTimeout(() => { globalState.isLevelComplete = false; }, 3000);
        }
    } 
    else if (action === 'restart') {
        // Harde reset voor iedereen
        globalState.sharedLives = 3;
        globalState.sharedScore = 0;
        globalState.sharedStars = 0;
        globalState.levelSeed = Math.floor(Math.random() * 999999);
        globalState.isLevelComplete = false;
    }

    // 3. Stuur data terug (behalve de speler zelf)
    const otherPlayers = Array.from(players.values()).filter(p => p.id !== id);

    return json({
        gameState: globalState,
        players: otherPlayers
    });
};