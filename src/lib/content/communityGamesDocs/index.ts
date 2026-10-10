import { achievements } from "./achievements";
import { godot } from "./godot";
import { highscores } from "./highscores";
import { intro } from "./intro";
import { levels } from "./levels";
import { quickstart } from "./quickstart";
import { rateLimits } from "./rateLimits";
import { realtime } from "./realtime";
import { saves } from "./saves";
import { troubleshooting } from "./troubleshooting";

export {
	achievements,
	godot,
	highscores,
	intro,
	levels,
	quickstart,
	rateLimits,
	realtime,
	saves,
	troubleshooting
};

// Full reference doc for handing directly to an AI assistant: every topic concatenated in the
// order a human would naturally read them, under one intro covering the shared architecture.
export const fullDoc = [
	intro,
	quickstart,
	highscores,
	saves,
	achievements,
	levels,
	realtime,
	rateLimits,
	godot,
	troubleshooting
].join("\n---\n\n");
