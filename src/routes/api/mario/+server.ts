import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// De centrale staat van de wereld
let globalState = {
    sharedLives: 3,
    sharedScore: 0,
    sharedStars: 0,
    levelSeed: Math.floor(Math.random() * 999999), // Iedereen krijgt dit zaadje
    isLevelComplete: false
};

const players = new Map();

export const POST: RequestHandler = async ({ request }) => {
    const { action, id, payload } = await request.json();
    const now = Date.now();

    // Verwijder spelers die al 5 seconden niks hebben gestuurd
    for (const [pid, pdata] of players.entries()) {
        if (now - pdata.lastSeen > 5000) players.delete(pid);
    }

    if (action === 'update') {
        // Update positie en status van speler
        players.set(id, { ...payload, id, lastSeen: now });
    } 
    else if (action === 'death') {
        // Als iemand doodgaat, verliest IEDEREEN een leven
        globalState.sharedLives = Math.max(0, globalState.sharedLives - 1);
    } 
    else if (action === 'score') {
        // Score en sterren worden gedeeld
        globalState.sharedScore += payload.amount || 0;
        if (payload.isStar) globalState.sharedStars += 1;
    } 
    else if (action === 'finish') {
        // Level gehaald? Genereer nieuw zaadje voor iedereen
        if (!globalState.isLevelComplete) {
            globalState.isLevelComplete = true;
            globalState.levelSeed = Math.floor(Math.random() * 999999);
            // Reset de vlag na 3 seconden
            setTimeout(() => { globalState.isLevelComplete = false; }, 3000);
        }
    } 
    else if (action === 'restart') {
        // Harde reset (Game Over -> Nieuw Spel)
        globalState.sharedLives = 3;
        globalState.sharedScore = 0;
        globalState.sharedStars = 0;
        globalState.levelSeed = Math.floor(Math.random() * 999999);
        globalState.isLevelComplete = false;
    }

    // Stuur de staat en andere spelers terug (behalve jezelf)
    return json({
        gameState: globalState,
        players: Array.from(players.values()).filter(p => p.id !== id)
    });
};