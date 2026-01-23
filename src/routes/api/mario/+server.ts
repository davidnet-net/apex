import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Gedeelde staat van de game op de server.
 */
interface GameState {
	sharedLives: number;
	sharedScore: number;
	sharedStars: number;
	levelSeed: number;
	isLevelComplete: boolean;
}

/**
 * Data per individuele speler.
 */
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

	// Ruim inactieve spelers op
	for (const [pid, pdata] of players.entries()) {
		if (now - pdata.lastSeen > 5000) players.delete(pid);
	}

	if (action === 'update') {
		players.set(id, { ...payload, id, lastSeen: now });
	} else if (action === 'death') {
		globalState.sharedLives = Math.max(0, globalState.sharedLives - 1);
	} else if (action === 'score') {
		globalState.sharedScore += payload.amount || 0;
		if (payload.isStar) globalState.sharedStars += 1;
	} else if (action === 'finish') {
		if (!globalState.isLevelComplete) {
			globalState.isLevelComplete = true;
			globalState.levelSeed = Math.floor(Math.random() * 999999);
			setTimeout(() => {
				globalState.isLevelComplete = false;
			}, 3000);
		}
	} else if (action === 'restart') {
		globalState.sharedLives = 3;
		globalState.sharedScore = 0;
		globalState.sharedStars = 0;
		globalState.levelSeed = Math.floor(Math.random() * 999999);
	}

	return json({
		gameState: globalState,
		players: Array.from(players.values()).filter((p) => p.id !== id)
	});
};